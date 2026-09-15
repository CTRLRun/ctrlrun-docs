"""`docs/OWASP-SOLUTIONS-LANDSCAPE.md`. The page a landscape submission is filled in from.

The page says a submission to the OWASP Agentic Solutions Landscape is filled in from it and
from nothing else, and that it is regenerated when the guarantee catalogue changes, when a
version in a *Since* column is tagged, and when OWASP revises the form. Two of those three
happened without it: the catalogue moved from `v5` to `v7` and v0.10 through v0.12 were tagged
while the page still read "written against v1.0, guarantees G1-G24" and still ticked `ASI04`
on a guarantee the mapping it cites deliberately files elsewhere.

Nothing caught either, because the page had no test. `test_owasp_mapping.py` reads the Top 10
reading beside it, which is why that document kept up. This is the same idea pointed at the
page that leaves the project: a form is filled in from rows, so the rows are checked against
the registry, against the changelog and against the mapping they claim to summarise.
"""

from __future__ import annotations

import re
import tomllib
from pathlib import Path

import pytest
from ctrlrun.verify import guarantees as reg

from _core import CORE_ROOT

REPO_ROOT = Path(__file__).resolve().parents[1]
LANDSCAPE = REPO_ROOT / "docs" / "OWASP-SOLUTIONS-LANDSCAPE.md"
MAPPING = REPO_ROOT / "docs" / "OWASP-AGENTIC-TOP10.md"

#: The form writes its entry codes `ASI01:26`, the Top 10 document writes them `ASI01:2026`.
#: Each page uses the spelling of the document it is quoting, so the two differ on purpose and
#: a test that normalised them would hide a code drifting between the pages.
FORM_CODE = re.compile(r"ASI(\d{2}):26\b")
MAPPING_CODE = re.compile(r"ASI(\d{2}):2026\b")

#: `G7` and `G17` are different guarantees, so the digits are anchored on both sides.
GUARANTEE = re.compile(r"\bG(\d+)\b")

#: A `Since` column names a minor version, `v0.11`, never a patch.
SINCE = re.compile(r"\bv(\d+)\.(\d+)\b")

#: The three words the page defines for itself, and the only ones any status column may hold.
STATUS = {"Yes", "Partly", "No"}

#: The nine the form lists, in the form's own spelling. `Augm & Fine Tune Data` is abbreviated
#: on the form and written out on the page, which is the one deviation.
STAGES = (
    "Scope & Plan",
    "Develop & Experiment",
    "Augment & Fine Tune Data",
    "Test & Evaluate",
    "Release",
    "Deploy",
    "Monitor",
    "Operate",
    "Govern",
)


def _document() -> str:
    return LANDSCAPE.read_text(encoding="utf-8")


def _flat() -> str:
    return " ".join(_document().split())


def _rows(text: str, header: str) -> list[list[str]]:
    """The rows of the one table whose header line is `header`, as stripped cells.

    Keyed on the header rather than on a line number so that adding a row above a table does
    not silently move which table is read.
    """
    lines = text.splitlines()
    start = next(i for i, line in enumerate(lines) if line.strip() == header.strip())
    rows = []
    for line in lines[start + 2 :]:  # the header, then its `|---|` rule
        if not line.startswith("|"):
            break
        rows.append([cell.strip() for cell in line.strip().strip("|").split("|")])
    return rows


def _summary() -> dict[str, list[str]]:
    """The `Agentic Top 10 coverage` table, by entry code: `[status, guarantees, since]`."""
    header = "| Entry | Status | Guarantees | What stays out | Since |"
    summary = {}
    for cells in _rows(_document(), header):
        code = FORM_CODE.search(cells[0])
        assert code, f"a row of the summary names no entry: {cells[0]}"
        summary[code.group(1)] = [cells[1], cells[2], cells[4]]
    return summary


def _mapped() -> dict[str, set[str]]:
    """Entry number -> the guarantees the Top 10 reading maps to it, from its own table."""
    header = "| Guarantee | Invariant | Entries | How |"
    mapped: dict[str, set[str]] = {}
    for cells in _rows(MAPPING.read_text(encoding="utf-8"), header):
        guarantee = GUARANTEE.search(cells[0])
        assert guarantee, f"a guarantee row names no guarantee: {cells[0]}"
        for entry in MAPPING_CODE.findall(cells[2]):
            mapped.setdefault(entry, set()).add(f"G{guarantee.group(1)}")
    return mapped


#: The one minor version a `Since` column names that was never published, with the reason.
#: `0.3.0` went to TestPyPI as `0.3.0rc1` and no further; `src/ctrlrun/authority.py` is in the
#: `v0.4.0` tag, so everything it added reached PyPI one milestone later. A row may say
#: *since v0.3* because that is the milestone that added it, and the page says so in as many
#: words rather than leaving a reader to find an 0.3.0 on PyPI that is not there.
SUPERSEDED = {(0, 3): "0.3.0 was published to TestPyPI alone; 0.4.0 carried it to PyPI"}


def _changelog() -> str:
    return (CORE_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")


def _releases() -> list[tuple[int, int, int]]:
    """Every version the library's changelog records as released, newest first.

    Not `pyproject.toml`: that moves at the start of a milestone and the changelog heading for
    it reads `unreleased` until the end of one, so a page checked against `pyproject.toml`
    could name a version nobody can install. `test_docs_production.py` learned the same thing
    from a README that said a version was on PyPI while PyPI held the one before it.
    """
    found = []
    for line in _changelog().splitlines():
        heading = re.match(r"^## \[(\d+)\.(\d+)\.(\d+)\]", line)
        if heading and "unreleased" not in line.lower():
            found.append(tuple(int(part) for part in heading.groups()))
    assert found, "the changelog records no released version"
    return found


def _released() -> tuple[int, int, int]:
    """The newest of them, which is the version the page is written against."""
    return _releases()[0]


# --- the rows point at guarantees that exist, in the catalogue that ships ---------------------


def test_every_guarantee_the_page_cites_exists_in_the_registry():
    """A row citing `G33` would read as a promise and be a typo."""
    cited = {f"G{number}" for number in GUARANTEE.findall(_document())}

    assert cited, "the page cites no guarantee at all"
    assert cited <= set(reg.BY_ID), sorted(cited - set(reg.BY_ID))


def test_the_catalogue_the_page_names_is_the_one_verify_reports():
    """The page named `v5` for two releases after the catalogue reached `v7`."""
    assert reg.CATALOGUE in _document(), reg.CATALOGUE

    stale = {f"ctrlrun.guarantees/v{n}" for n in range(1, 20)} - {reg.CATALOGUE}
    assert not [name for name in stale if name in _document()]


def test_the_guarantee_range_in_the_header_spans_the_whole_registry():
    """`G1`-`G32` is a claim about the catalogue's size, so it is read as one."""
    first, last = reg.GUARANTEES[0].id, reg.GUARANTEES[-1].id

    assert f"guarantees `{first}`–`{last}`" in _flat(), f"{first}-{last}"


def test_the_version_the_page_is_written_against_is_released():
    major, minor, patch = _released()

    assert f"CTRLRun **{major}.{minor}.{patch}**" in _document()


def test_no_since_column_names_a_version_that_is_not_out():
    """The page's rule is that it ticks nothing on an unreleased version.

    It was broken the other way round for five releases: every row was hedged as `(design)`
    against a 1.0 that had not shipped, while the versions the rows actually named had. Either
    direction is the same defect, a page describing a version other than the one a reader can
    install, and this catches both because every number has to be one the changelog released.
    """
    released = {version[:2] for version in _releases()}

    for row in _document().splitlines():
        for found in SINCE.finditer(row):
            version = (int(found.group(1)), int(found.group(2)))
            if version in SUPERSEDED:
                continue
            assert version in released, f"{found.group(0)} in: {row[:80]}"


def test_the_page_says_which_version_a_since_column_names_that_was_never_published():
    """A reader who checks `v0.3` against PyPI finds nothing there, so the page says why.

    The exemption above is what makes this necessary: a test that skipped `v0.3` silently
    would be a test agreeing to a number a reader cannot verify.
    """
    flat = _flat()

    for (major, minor), reason in SUPERSEDED.items():
        assert f"{major}.{minor}.0 was published to TestPyPI alone" in flat, reason


def test_every_status_is_one_of_the_three_words_the_page_defines():
    """*Yes*, *Partly*, *No*. A fourth word is a hedge the page has no definition for."""
    for table in ("| Stage | Status | What CTRLRun has there | Since |",
                  "| Checkbox | Status | What it means here | Since |"):
        for cells in _rows(_document(), table):
            assert cells[1] in STATUS, cells


def test_every_entry_status_is_one_of_the_three_words():
    for entry, (status, _, _) in _summary().items():
        assert status in STATUS, (entry, status)


# --- the summary is the mapping, not a second opinion of it ----------------------------------


@pytest.mark.parametrize("entry", sorted(f"{n:02d}" for n in range(1, 11)))
def test_each_entry_names_exactly_the_guarantees_the_mapping_maps_to_it(entry):
    """The two pages disagreed on `ASI04` and the form would have carried the disagreement.

    The summary ticked it *Partly* on upstream identity pinning; the reading it cites says
    `ASI04` is out of scope, that no guarantee maps to it, and that the pinning is G27 which
    belongs under `ASI02` and `ASI07` — "not here", in as many words. A submission filled in
    from the summary would have ticked a box the page behind it refutes, which is the one
    failure the page exists to prevent.
    """
    summary = _summary()
    assert entry in summary, entry

    listed = {f"G{number}" for number in GUARANTEE.findall(summary[entry][1])}
    assert listed == _mapped().get(entry, set()), entry


def test_an_entry_no_guarantee_maps_to_is_not_ticked():
    """`none` in the column, `No` in the status. Not a blank, which reads as an oversight."""
    mapped = _mapped()

    for entry, (status, guarantees, since) in _summary().items():
        if entry in mapped:
            continue
        assert status == "No", (entry, status)
        assert guarantees == "none", (entry, guarantees)
        assert since == "none", (entry, since)


def test_every_entry_the_mapping_covers_is_ticked_in_the_summary():
    """The other direction: an entry with guarantees behind it cannot be left at `No`."""
    summary = _summary()

    for entry in _mapped():
        assert summary[entry][0] in {"Yes", "Partly"}, entry


# --- what the form asks for, and what the page refuses to claim ------------------------------


def test_all_ten_entries_and_all_nine_lifecycle_stages_appear():
    document = _document()

    found = {f"{int(number):02d}" for number in FORM_CODE.findall(document)}
    assert found == {f"{n:02d}" for n in range(1, 11)}, sorted(found)

    # The nine, and no tenth. Not their order: the page groups Operate beside Deploy and the
    # form lists it after Monitor, which is a reading order and not a claim.
    stages = {cells[0] for cells in _rows(document, "| Stage | Status | What CTRLRun has there | Since |")}
    assert stages == set(STAGES), sorted(stages.symmetric_difference(STAGES))


def test_the_page_claims_no_listing_and_no_endorsement():
    """OWASP endorses nothing, and a directory entry is a directory entry."""
    flat = _flat()

    assert "It is not a listing claim, a conformance claim, or an endorsement." in flat
    assert "does\nnot endorse or recommend" in _document()


def test_the_page_says_the_form_is_filled_in_from_it_and_names_where_it_came_from():
    flat = _flat()

    assert "filled in from this page and from nothing else" in flat
    assert "genai.owasp.org/solution-submission-agentic" in flat
    assert "2026-09-10" in flat
    # And the mapping it summarises, since half these tests read that document.
    assert "OWASP-AGENTIC-TOP10" in flat
