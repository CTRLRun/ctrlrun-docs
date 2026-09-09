"""The verify page, held to what `ctrlrun verify` actually prints and refuses.

SPEC-v0.4 §5; the page half of T118-T120. The badge links here, so what this page says the
badge means is part of the claim -- and a page that quoted a report the tool does not print,
or used one of §5.2's five forbidden words as a claim, would be the false green the badge
exists to avoid.

The composite action's own tests are in the library, in `tests/test_verify_action.py`. They
read `action.yml` and the workflow, which are not in this repository and are not in the sdist
either.
"""

from __future__ import annotations

import re

import pytest
from ctrlrun.verify import run

from _core import CORE_ROOT

REPO_ROOT = __import__("pathlib").Path(__file__).resolve().parents[1]

#: The page, and the configuration the quoted report was produced from. A missing page is a
#: failure: there is no sdist here to prune it, so absence means somebody deleted it.
VERIFY_DOC = REPO_ROOT / "docs" / "verify.md"
AUTHORITY_PAYMENTS = CORE_ROOT / "examples" / "authority" / "payments.yaml"

#: SPEC-v0.4 §5.2 — the five words no claim may use.
FORBIDDEN = ("secure", "safe", "compliant", "certified", "audited")


def _repository_file(path):
    assert path.exists(), f"{path} is required and is not here"
    return path.read_text(encoding="utf-8")


def test_T119_the_link_target_carries_the_exact_phrase():
    page = _repository_file(VERIFY_DOC)

    assert "declared guarantees pass" in page
    # And it is the anchor the badge links to, not a phrase buried somewhere else.
    heading = page.index("## What the badge means")
    assert "declared guarantees pass" in page[heading : heading + 600]


def _quoted_report() -> list[str]:
    block = _repository_file(VERIFY_DOC).split("```console")[1].split("```")[0]
    return [line for line in block.splitlines() if line.strip() and not line.startswith("$")]


@pytest.mark.authority
def test_the_verify_page_quotes_the_real_verify_output():
    """The demo transcript has had this guard since v0.1; the verify report gets the same one.

    Every line the page quotes has to be a line `ctrlrun verify` actually prints, so a change
    to the report that nobody carried across fails here rather than shipping a page that lies.
    The version line is normalised: it moves at every release, and a document is not the place
    that number is kept honest — `pyproject.toml` is.
    """

    report = run(AUTHORITY_PAYMENTS)
    printed = {
        re.sub(r"ctrlrun \S+,", "ctrlrun <version>,", line)
        for line in report.to_text().splitlines()
    }
    # The page quotes a path relative to the repository root; the report prints the path it
    # was given. Compare on the same footing rather than on how the test invoked it.
    printed = {
        line.replace(str(AUTHORITY_PAYMENTS), "examples/authority/payments.yaml")
        for line in printed
    }

    missing = [
        line
        for line in _quoted_report()
        if re.sub(r"ctrlrun \S+,", "ctrlrun <version>,", line) not in printed
    ]

    assert not missing, f"the page quotes lines verify does not print: {missing}"


def test_the_verify_page_says_what_not_applicable_means():
    """The N/A semantics, on the page the badge links to. Asserted with the line wrapping
    removed: a sentence that reads correctly and wraps across two lines is still the sentence,
    and a test that could not see it would push prose onto one long line."""
    page = " ".join(_repository_file(VERIFY_DOC).split())

    assert "Not applicable is not a pass" in page
    assert "never `11/11`" in page
    assert "no flag that folds an N/A into the count" in page
    assert "declared guarantees pass" in page


def test_the_verify_page_documents_the_permission_the_publish_costs():
    """§5.2 — the cost is shown once, where the reader can see it, and not buried."""
    page = " ".join(_repository_file(VERIFY_DOC).split())

    assert "contents: write" in page
    assert "least privilege" in page


def test_the_verify_page_is_honest_about_what_branch_protection_buys():
    """A badge is a claim, and a branch nobody guards is a claim anybody can write. The page
    says which half is protected rather than implying both: deletion and force pushes are
    blocked, and a fast-forward push by anyone with write access is not."""
    page = " ".join(_repository_file(VERIFY_DOC).split())

    assert "It does **not** restrict who may push" in page
    assert "silently dropped" in page
    assert "self-healing" in page


@pytest.mark.parametrize("word", FORBIDDEN)
def test_T119_the_page_uses_no_forbidden_word_as_a_claim(word):
    """The page half of T119. The badge's and the job summary's half is asserted in the
    library, by `test_T119_no_claim_uses_the_forbidden_vocabulary`; between them the five
    words are covered everywhere they could appear, which is what the whole test did.

    The unit is the paragraph rather than the line, because the refusal and the word it
    refuses are often on different lines of the same wrapped sentence.
    """
    page = _repository_file(VERIFY_DOC)
    offending = [
        paragraph
        for paragraph in page.split("\n\n")
        if word in paragraph.lower()
        and not any(marker in paragraph.lower() for marker in ("not ", "never", "no "))
    ]
    assert not offending, f"{word!r} used as a claim: {offending}"


def test_the_page_would_see_a_forbidden_word_used_as_a_claim():
    """The positive control. A paragraph splitter that never matched would pass the test above
    on any page at all, which is the shape of false green this repository keeps finding."""
    page = "CTRLRun is certified for production use.\n\nSomething else entirely."
    offending = [
        paragraph
        for paragraph in page.split("\n\n")
        if "certified" in paragraph.lower()
        and not any(marker in paragraph.lower() for marker in ("not ", "never", "no "))
    ]
    assert offending, "the scan cannot see a claim it is supposed to refuse"
