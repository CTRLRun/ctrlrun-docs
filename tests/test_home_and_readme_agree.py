"""The README's first screen says what the homepage says.

ctrlrun.dev's homepage is the marketing surface and the library's README is the GitHub and PyPI
one. Until 2026-09-14 they led with different sentences: the site said *stops AI agents from
taking wrong, restricted, or malicious actions in your workflows* and the README said
*Execution safety for AI agents*, so a stranger arriving from one to the other met a second
pitch. The README now opens with the homepage's H1 and lede, verbatim, closes on its footer
line, and walks the seven steps of its diagram in the same order. This file is what keeps the
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
DIAGRAM = REPO_ROOT / "snippets" / "how-diagram.jsx"
README = CORE_ROOT / "README.md"


def _prose(markup: str) -> str:
    """Tags removed and whitespace collapsed. A `<br>` is a space, so it reads as a line break
    does; every other tag is nothing, so `workflows<span>.</span>` keeps its full stop."""
    text = re.sub(r"<br\s*/?>", " ", markup)
    return " ".join(re.sub(r"<[^>]+>", "", text).split())


def _homepage(pattern: str) -> str:
    match = re.search(pattern, HOME.read_text(encoding="utf-8"), re.S)
    assert match, f"index.mdx no longer carries {pattern!r}"
    return _prose(match.group(1))


def _readme() -> str:
    return README.read_text(encoding="utf-8")


def test_the_readme_opens_with_the_homepage_h1_and_lede():
    head = _prose(_readme().split("\n## ", 1)[0])
    h1 = _homepage(r'<h1 id="cr-title">(.*?)</h1>')
    lede = _homepage(r'<p className="cr-lede">(.*?)</p>')

    assert h1.startswith("CTRLRun ") and h1.endswith("."), h1
    assert h1 in head, f"the README header does not carry the homepage H1: {h1!r}"
    assert lede in head, f"the README header does not carry the homepage lede: {lede!r}"


def test_the_readme_closes_on_the_homepage_footer_line():
    footer = _homepage(r'<div className="cr-footer" role="contentinfo"><span>(.*?)</span>')
    tail = _prose(_readme().rsplit("## License", 1)[1])

    assert footer, "the homepage footer is empty"
    assert footer in tail, f"the README does not close on the homepage's line: {footer!r}"


def test_the_readme_walks_the_homepage_seven_steps_in_order():
    """The diagram names seven steps, normalize to record. The README's *How it works* is the
    same walk in prose, and a step the diagram gained or lost is a step the README follows."""
    diagram = DIAGRAM.read_text(encoding="utf-8")
    steps = ["Normalize", "Decide", "Approve", "Reserve", "Execute", "Resolve", "Record"]
    for step in steps:
        assert f"<b>{step}</b>" in diagram or f">{step}<" in diagram, step

    section = _readme().split("## How it works", 1)[1].split("\n## ", 1)[0]
    positions = [section.find(f"**{step}:") for step in steps]
    assert all(p >= 0 for p in positions), dict(zip(steps, positions, strict=True))
    assert positions == sorted(positions), "the README walks the steps in the diagram's order"
