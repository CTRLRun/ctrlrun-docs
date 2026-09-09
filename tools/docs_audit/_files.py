"""What the audit reads, and how it reads a fenced block.

The set of documents is taken from **git**, not from the filesystem, for the reason the
packaging tests give: a file that exists on disk and is not tracked is not in a fresh clone,
and a check that passed against it has checked nothing a reader will see. Outside a checkout
the audit falls back to a glob, so the same scripts run from an sdist.

Since the repository split the set spans **two** checkouts. The site's own pages are in this
repository; the README, the adapter READMEs and the example notes are in `CTRLRun/ctrlrun`,
resolved by `_core.py`. A document is named by its path relative to the checkout it came
from, so every message the checks print is the path a reader would type in whichever
repository the file actually lives in.
"""

from __future__ import annotations

import re
import subprocess
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import Path

from _core import CORE_ROOT

REPO_ROOT = Path(__file__).resolve().parents[2]

#: This repository *is* the Mintlify site root: `docs.json` sits beside this tree and the
#: pages are under `docs/`, so a page's path relative to `REPO_ROOT` is the path `docs.json`
#: names and the URL a reader lands on. Before the split the site root was `docs/` inside the
#: library repository and every one of these constants carried an extra `docs/` segment.
SITE_ROOT = REPO_ROOT
PAGES = REPO_ROOT / "docs"

#: The documents a reader is sent to, in this repository. Specs, the roadmap and the
#: changelog are deliberately not here: they are the historical record, and the audit is
#: about the pages that describe the shipped version to a stranger. Each check may narrow
#: this further.
SITE_PATTERNS: tuple[str, ...] = (
    "*.md",
    "*.mdx",
    "docs/*.md",
    "docs/**/*.md",
    "docs/**/*.mdx",
)

#: And the documents that ship with the library rather than with the site. They are read out
#: of the core checkout, and a missing checkout raises rather than quietly shrinking this set
#: to nothing -- see `_core.py`.
CORE_PATTERNS: tuple[str, ...] = (
    "README.md",
    "adapters/*/README.md",
    "examples/**/*.md",
)

#: Kept under its old name because every caller means "everything the audit reads", and after
#: the split that is the union of the two sets above rather than one list.
DOCUMENT_PATTERNS: tuple[str, ...] = SITE_PATTERNS + CORE_PATTERNS


def tracked_files(root: Path = REPO_ROOT) -> list[Path] | None:
    """Every path git tracks under `root`, or `None` outside a checkout."""
    try:
        listed = subprocess.run(
            ["git", "ls-files", "-z"],
            cwd=root,
            capture_output=True,
            check=False,
        )
    except OSError:
        return None
    if listed.returncode != 0:
        return None
    return [root / name for name in listed.stdout.decode("utf-8").split("\0") if name]


def documents(
    root: Path | None = None,
    patterns: Iterable[str] = DOCUMENT_PATTERNS,
    exclude: Iterable[str] = (),
) -> list[Path]:
    """The documents matching `patterns`, tracked by git where possible.

    With no `root`, each pattern is resolved against the checkout it belongs to: the site
    patterns against this repository, the core patterns against `CORE_ROOT`. Passing a `root`
    explicitly resolves every pattern against that one tree, which is what a test building a
    fixture directory wants.
    """
    patterns = tuple(patterns)
    if root is None:
        site = tuple(p for p in patterns if p in SITE_PATTERNS)
        core = tuple(p for p in patterns if p not in SITE_PATTERNS)
        found: list[Path] = []
        if site:
            found += documents(REPO_ROOT, site, exclude)
        if core:
            found += documents(CORE_ROOT, core, exclude)
        return sorted(set(found))
    exclude = tuple(exclude)
    candidates = tracked_files(root)
    if candidates is None:
        candidates = sorted({path for pattern in patterns for path in root.glob(pattern)})
    chosen: list[Path] = []
    for path in candidates:
        relative = path.relative_to(root).as_posix()
        if not any(_match(relative, pattern) for pattern in patterns):
            continue
        if any(_match(relative, pattern) for pattern in exclude):
            continue
        if path.is_file():
            chosen.append(path)
    return sorted(set(chosen))


def _match(relative: str, pattern: str) -> bool:
    """`fnmatch` with `**` meaning any depth, which `fnmatch` alone does not give."""
    if "**" not in pattern:
        return fnmatch(relative, pattern)
    head, _, tail = pattern.partition("**/")
    if not relative.startswith(head):
        return False
    remainder = relative[len(head) :]
    return any(fnmatch(part, tail) for part in _suffixes(remainder))


def _suffixes(relative: str) -> Iterator[str]:
    parts = relative.split("/")
    for index in range(len(parts)):
        yield "/".join(parts[index:])


@dataclass(frozen=True)
class Fence:
    """One fenced code block: where it is, what its info string says, and its body."""

    path: Path
    line: int
    language: str
    tokens: tuple[str, ...]
    body: str

    @property
    def location(self) -> str:
        return f"{relative(self.path)}:{self.line}"


_OPEN = re.compile(r"^(?P<indent>\s*)(?P<fence>`{3,}|~{3,})(?P<info>[^`]*)$")


def fences(text: str, path: Path) -> Iterator[Fence]:
    """Every fenced block in `text`, with 1-based line numbers for its opening fence.

    An opening fence closes at the first line consisting of the same fence character, at least
    as long, and nothing else — which is CommonMark's rule and also what GitHub renders.
    """
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        opened = _OPEN.match(lines[index])
        if opened is None:
            index += 1
            continue
        fence = opened.group("fence")
        indent = len(opened.group("indent"))
        info = opened.group("info").strip().split()
        language = info[0].lower() if info else ""
        tokens = tuple(info[1:])
        start = index
        index += 1
        body: list[str] = []
        while index < len(lines):
            stripped = lines[index].strip()
            if stripped and set(stripped) == {fence[0]} and len(stripped) >= len(fence):
                break
            body.append(_dedent(lines[index], indent))
            index += 1
        yield Fence(path, start + 1, language, tokens, "\n".join(body) + "\n")
        index += 1


def _dedent(line: str, indent: int) -> str:
    """Strip up to `indent` leading spaces: a fence opened inside a list item or a component
    is indented, and CommonMark removes that indentation from its content lines."""
    removable = len(line) - len(line.lstrip(" "))
    return line[min(removable, indent) :]


def outside_fences(text: str) -> Iterator[tuple[int, str]]:
    """Every (1-based line number, line) that is not inside a fenced block."""
    lines = text.splitlines()
    fence: str | None = None
    for number, line in enumerate(lines, start=1):
        if fence is None:
            opened = _OPEN.match(line)
            if opened is not None:
                fence = opened.group("fence")
                continue
            yield number, line
        else:
            stripped = line.strip()
            if stripped and set(stripped) == {fence[0]} and len(stripped) >= len(fence):
                fence = None


def relative(path: Path) -> str:
    """A document's path relative to whichever checkout holds it.

    Two roots, so two chances: a site page is named from this repository and `README.md` is
    named from the library's, which is the path a reader would type in either case.
    """
    for root in (REPO_ROOT, CORE_ROOT):
        if path.is_relative_to(root):
            return path.relative_to(root).as_posix()
    return str(path)
