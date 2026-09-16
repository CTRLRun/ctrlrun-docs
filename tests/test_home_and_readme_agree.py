"""The README's first screen says what the homepage says.

ctrlrun.dev's homepage is the marketing surface and the library's README is the GitHub and PyPI
one. Until 2026-09-14 they led with different sentences: the site said *stops AI agents from
taking wrong, restricted, or malicious actions in your workflows* and the README said
*Execution safety for AI agents*, so a stranger arriving from one to the other met a second
pitch. The README now opens with the homepage's H1 and lede, verbatim, and walks the seven
steps of its diagram in the same order; nothing commercial crosses over. This file is what keeps the
two from drifting apart again: it reads the sentences out of `index.mdx` and the diagram, so a
rewrite of the homepage fails here until the README follows. The library pins the same strings
on its side, in `tests/test_readme_assets.py`, so a rewrite of the README fails there first.
"""

from __future__ import annotations

import re
from pathlib import Path

from _core import CORE_ROOT

REPO_ROOT = Path(__file__).resolve().parents[1]
HOME = REPO_ROOT / "index.mdx"
_FRONTMATTER = re.compile(r"\A---\n.*?\n---\n", re.S)
DIAGRAM = REPO_ROOT / "snippets" / "how-diagram.jsx"
README = CORE_ROOT / "README.md"


def _prose(markup: str) -> str:
    """Tags removed and whitespace collapsed. A `<br>` is a space, so it reads as a line break
    does; every other tag is nothing, so `workflows<span>.</span>` keeps its full stop."""
    text = re.sub(r"<br\s*/?>", " ", markup)
    return " ".join(re.sub(r"<[^>]+>", "", text).split())


def _opening() -> tuple[str, str]:
    """The two sentences the overview opens with: the claim, then how it is met.

    They were an `<h1>` and a `<p>` in a hand-built hero until 2026-09-16, when the page was
    merged with `/docs` and took the documentation's own layout. They are the page's first two
    paragraphs now, the claim in bold, and the README still has to open with them.
    """
    body = _FRONTMATTER.sub("", HOME.read_text(encoding="utf-8"), count=1)
    body = re.sub(r"^import .*$", "", body, flags=re.M).strip()
    paragraphs = [block.strip() for block in body.split("\n\n") if block.strip()]
    assert len(paragraphs) >= 2, "index.mdx no longer opens with two paragraphs"
    claim = re.fullmatch(r"\*\*(.+?)\*\*", paragraphs[0], re.S)
    assert claim, f"index.mdx no longer opens with the claim in bold: {paragraphs[0][:80]!r}"
    return _prose(claim.group(1)), _prose(paragraphs[1])


def _readme() -> str:
    return README.read_text(encoding="utf-8")


def test_the_readme_opens_with_the_homepage_h1_and_lede():
    """In sequence, not merely present: the README's prose opens with the H1 and the lede
    follows it directly. Prose before the H1, or the lede ahead of it, fails here."""
    head = _prose(_readme().split("\n## ", 1)[0])
    h1, lede = _opening()

    assert h1.startswith("ctrlrun ") and h1.endswith("."), h1
    assert head.startswith(h1), f"the README does not open with the homepage H1: {head[:120]!r}"
    after_h1 = head[len(h1) :].lstrip()
    assert after_h1.startswith(lede), (
        f"the homepage lede does not follow the H1 directly: {after_h1[:120]!r}"
    )


def _diagram_steps() -> list[str]:
    """The step names as the diagram draws them, in source order. The file carries the diagram
    twice, wide and narrow, so the two sequences have to agree and one of them is the answer."""
    names = re.findall(
        r'className="cr-dia-name"[^>]*>([^<]+)<', DIAGRAM.read_text(encoding="utf-8")
    )
    assert names and len(names) % 2 == 0, names
    wide, narrow = names[: len(names) // 2], names[len(names) // 2 :]
    assert wide == narrow, f"the wide and narrow diagrams name different steps: {wide} vs {narrow}"
    return wide


def test_the_readme_walks_the_homepage_seven_steps_in_order():
    """The diagram names seven steps, normalize to record. The README's *How it works* is the
    same walk in prose, and a step the diagram gained or lost is a step the README follows."""
    steps = _diagram_steps()
    assert len(steps) == 7, steps
    assert steps[0] == "Normalize" and steps[-1] == "Record", steps

    section = _readme().split("## How it works", 1)[1].split("\n## ", 1)[0]
    positions = [section.find(f"**{step}:") for step in steps]
    assert all(p >= 0 for p in positions), dict(zip(steps, positions, strict=True))
    assert positions == sorted(positions), "the README walks the steps in the diagram's order"
