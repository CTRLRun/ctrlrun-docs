"""Render the badge row, and write the one badge this repository produces itself.

A stranger reads the badges before the first sentence, so the row is a claim like any other and
is generated rather than typed. One list, one render — the README's centred HTML — because that
is the only place a badge row appears; a second format with no consumer would be a generated
artifact nobody reads, and an independent review is what noticed the first version shipping one.

    python tools/docs_audit/render_badges.py readme     # print one render
    python tools/docs_audit/render_badges.py --write    # refresh generated/
    python tools/docs_audit/render_badges.py --check    # CI

Most of the row is rendered by somebody else — PyPI, GitHub Actions, OpenSSF, Astral. Two are
this repository's own, published to the orphan `badges` branch by a job that runs only on a
push to `main`:

- `verify-badge.json`, written by the composite action from a real `ctrlrun verify` run;
- `tests-badge.json`, written by `--write-count` **after** `scripts/check.sh` has passed, so no
  number is published for a run whose suite was red.

One badge is static: `docs`, which is a link and claims nothing. The row carried `ruff` and
`mypy --strict` as well until 2026-09-11. Both were enforced rather than asserted, and both are
still enforced now that the badges are gone: `scripts/check.sh` runs `ruff format --check`,
`ruff check` and `mypy --strict src`, CI calls that file rather than naming the tools itself,
and `test_ci_runs_the_check_script` fails if it stops. They were removed because how a library
is written is not what a stranger decides in the first five seconds, and because a row that
wraps to three lines on a phone is a row nobody reads to the end. `pypi/pyversions` went with
them: it was metadata rather than a claim, and the PyPI page the badge beside it links to
carries it anyway.

Stars are deliberately absent: `STYLE.md` forbids social proof that does not exist, and a star
count is a popularity number with no reading behind it. The two adoption counts that are here
each name what they measure and link to the data rather than to a page that repeats them:

- `downloads` is pypistats' `last_month`, counted by PyPI. It was `img.shields.io/pypi/dm` for
  about an hour, which renders live and asks pypistats on behalf of every project shields
  serves: it came back `rate limited by upstream service` the same day. The workflow now asks
  pypistats once a day and publishes the answer, so the badge reads a document instead of a
  third party's cache. It counts installs by mirrors and by CI as well as by people, so it is
  an upper bound on adoption and says `/month` rather than users.
- `clones` is this repository's own, published to the `badges` branch by `.github/workflows/
  traffic.yml`. GitHub's traffic API keeps fourteen days and needs push access, so the workflow
  reads it daily with a token, merges each day into `clones-history.json` on that branch, and
  the badge links to that file: the number is a sum of days anybody can re-add. It counts every
  `git clone`, and `actions/checkout` is one, so this repository's own CI is in the figure
  alongside everybody else's; a reader who wants people rather than clones has the per-day
  file and the workflow run history to subtract with.

`--write-count` is what CI calls, and what it counts is what `pytest` **collects**. That is not
the same as what passed: the suite skips a handful of tests on a machine without a framework
installed, and a collected count includes them. So the badge is labelled `tests` and carries a
count, never "passing" — a count is what was measured, and the ordering is what makes it a count
of a suite that went green rather than of one that might not have.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from _files import REPO_ROOT, documents, relative
from render_readiness import collected

GENERATED = REPO_ROOT / "generated"
FILENAMES = {"readme": "badges.readme.md"}
FORMATS = tuple(FILENAMES)
BADGES_BRANCH = "https://raw.githubusercontent.com/CTRLRun/ctrlrun/badges"
_OPEN = re.compile(r"generated from tools/docs_audit/render_badges\.py \((?P<format>[a-z]+)\)")
_CLOSE = re.compile(r"end generated")


@dataclass(frozen=True)
class Badge:
    """One badge: what it shows, where the image comes from, and what it links to."""

    alt: str
    image: str
    href: str


#: The row, in reading order: how often it is cloned, what it is, how often it is installed,
#: where it is documented, that it builds, is analysed and is fuzzed, that its own suite is this
#: big, that its guarantees were checked, how its supply chain scores, which best practices it
#: self-certifies (each answer is a URL a reader can check), and the licence. Every entry is a
#: claim a reader can follow to the thing that measured it; an entry that is not stops being a
#: badge and becomes decoration, which is the test the three removed ones failed.
BADGES: tuple[Badge, ...] = (
    Badge(
        "Clones",
        f"https://img.shields.io/endpoint?url={BADGES_BRANCH}/clones-badge.json",
        "https://github.com/CTRLRun/ctrlrun/blob/badges/clones-history.json",
    ),
    Badge(
        "PyPI",
        "https://img.shields.io/pypi/v/ctrlrun?color=B8730A&label=pypi",
        "https://pypi.org/project/ctrlrun/",
    ),
    Badge(
        "Downloads",
        f"https://img.shields.io/endpoint?url={BADGES_BRANCH}/downloads-badge.json",
        "https://pypistats.org/packages/ctrlrun",
    ),
    Badge(
        "Docs",
        "https://img.shields.io/badge/docs-docs.ctrlrun.dev-B8730A",
        "https://docs.ctrlrun.dev/",
    ),
    Badge(
        "CI",
        "https://github.com/CTRLRun/ctrlrun/actions/workflows/ci.yml/badge.svg?branch=main",
        "https://github.com/CTRLRun/ctrlrun/actions/workflows/ci.yml",
    ),
    Badge(
        "CodeQL",
        "https://github.com/CTRLRun/ctrlrun/actions/workflows/codeql.yml/badge.svg?branch=main",
        "https://github.com/CTRLRun/ctrlrun/actions/workflows/codeql.yml",
    ),
    Badge(
        "Fuzz",
        "https://github.com/CTRLRun/ctrlrun/actions/workflows/fuzz.yml/badge.svg?branch=main",
        "https://github.com/CTRLRun/ctrlrun/actions/workflows/fuzz.yml",
    ),
    Badge(
        "Tests",
        f"https://img.shields.io/endpoint?url={BADGES_BRANCH}/tests-badge.json",
        "https://docs.ctrlrun.dev/how-this-is-built",
    ),
    Badge(
        "ctrlrun verified",
        f"https://img.shields.io/endpoint?url={BADGES_BRANCH}/verify-badge.json",
        "https://docs.ctrlrun.dev/security/verify-guarantees",
    ),
    Badge(
        "OpenSSF Scorecard",
        "https://api.scorecard.dev/projects/github.com/CTRLRun/ctrlrun/badge",
        "https://scorecard.dev/viewer/?uri=github.com/CTRLRun/ctrlrun",
    ),
    Badge(
        "OpenSSF Best Practices",
        "https://www.bestpractices.dev/projects/14615/badge",
        "https://www.bestpractices.dev/projects/14615",
    ),
    Badge(
        "License",
        "https://img.shields.io/pypi/l/ctrlrun?color=B8730A",
        "https://github.com/CTRLRun/ctrlrun/blob/main/LICENSE",
    ),
)


def tests_badge(count: int) -> dict[str, object]:
    """The shields.io endpoint document for the test-count badge."""
    return {
        "schemaVersion": 1,
        "label": "tests",
        "message": f"{count:,}",
        "color": "B8730A",
    }


def _readme() -> list[str]:
    lines = ['<p align="center">']
    for badge in BADGES:
        lines.append(f'  <a href="{badge.href}"><img src="{badge.image}" alt="{badge.alt}"></a>')
    lines.append("</p>")
    return lines


def render(fmt: str) -> str:
    comment = f"generated from tools/docs_audit/render_badges.py ({fmt}) — edit the list, not this"
    return "\n".join([f"<!-- {comment} -->", *_readme(), "<!-- end generated -->"]) + "\n"


def marker_blocks(text: str) -> list[tuple[int, str, str]]:
    lines = text.splitlines()
    blocks: list[tuple[int, str, str]] = []
    index = 0
    while index < len(lines):
        opened = _OPEN.search(lines[index])
        if opened is None:
            index += 1
            continue
        start, fmt = index, opened.group("format")
        index += 1
        while index < len(lines) and not _CLOSE.search(lines[index]):
            index += 1
        if index >= len(lines):
            blocks.append((start + 1, fmt, ""))
            break
        blocks.append((start + 1, fmt, "\n".join(lines[start : index + 1]) + "\n"))
        index += 1
    return blocks


def check(pages: list[Path] | None = None) -> list[str]:
    drift: list[str] = []
    for fmt in FORMATS:
        target = GENERATED / FILENAMES[fmt]
        if not target.exists() or target.read_text(encoding="utf-8") != render(fmt):
            drift.append(f"{relative(target)} differs from the generator; run --write")
    if pages is None:
        # **Root-level pages too.** `docs.mdx` is the docs home and carries two marker blocks,
        # and a glob of `docs/**` does not reach a file called `docs.mdx` beside that directory:
        # its capability grid and its readiness block went unchecked, and the readiness one sat
        # at version 0.8.0 with a stale guarantee count through a whole milestone. `*.md` and
        # `*.mdx` are already in `SITE_PATTERNS` for exactly this reason.
        pages = documents(patterns=("README.md", "*.md", "*.mdx", "docs/**/*.md", "docs/**/*.mdx"))
    for page in pages:
        if page.parent == GENERATED:
            continue
        for line, fmt, embedded in marker_blocks(page.read_text(encoding="utf-8")):
            if fmt not in FORMATS:
                drift.append(f"{relative(page)}:{line}: unknown badge format {fmt!r}")
            elif embedded != render(fmt):
                drift.append(f"{relative(page)}:{line}: badge row differs; paste it fresh")
    return drift


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("format", nargs="?", choices=FORMATS)
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument(
        "--write-count",
        metavar="PATH",
        help="write the shields.io endpoint document for the test-count badge",
    )
    arguments = parser.parse_args(argv)
    if arguments.write_count:
        count = collected()
        Path(arguments.write_count).write_text(
            json.dumps(tests_badge(count), indent=2) + "\n", encoding="utf-8"
        )
        print(f"tests badge: {count:,}")
        return 0
    if arguments.format:
        sys.stdout.write(render(arguments.format))
        return 0
    if arguments.write:
        GENERATED.mkdir(parents=True, exist_ok=True)
        for fmt in FORMATS:
            (GENERATED / FILENAMES[fmt]).write_text(render(fmt), encoding="utf-8")
        print(f"badges: {len(BADGES)} written")
    if arguments.check or not arguments.write:
        drift = check()
        for item in drift:
            print(f"DRIFT {item}")
        print(f"badges: {len(drift)} drifted")
        return 0 if not drift else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
