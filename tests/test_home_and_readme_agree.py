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
WWW = REPO_ROOT / "www" / "index.html"
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
    """In sequence, not merely present: the README's prose opens with the H1 and the lede
    follows it directly. Prose before the H1, or the lede ahead of it, fails here."""
    head = _prose(_readme().split("\n## ", 1)[0])
    h1 = _homepage(r'<h1 id="cr-title">(.*?)</h1>')
    lede = _homepage(r'<p className="cr-lede">(.*?)</p>')

    assert h1.startswith("CTRLRun ") and h1.endswith("."), h1
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


def test_the_static_site_opens_with_the_same_h1_and_lede():
    """ctrlrun.dev is served from `www/` (Vercel) and docs.ctrlrun.dev from Mintlify; both
    carry the homepage. The static page must open with the same H1 and lede the README does,
    or the README sync above is only half true."""
    h1 = _homepage(r'<h1 id="cr-title">(.*?)</h1>')
    lede = _homepage(r'<p className="cr-lede">(.*?)</p>')
    page = WWW.read_text(encoding="utf-8")
    assert h1 in _prose(page), "www/index.html does not carry the homepage H1"
    assert lede in _prose(page), "www/index.html does not carry the homepage lede"
    assert "ctrlaiagents" not in page and "ctrlpayments" not in page.lower(), (
        "the project site names a commercial site; it is not supposed to"
    )
