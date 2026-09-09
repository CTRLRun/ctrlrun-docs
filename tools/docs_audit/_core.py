"""Where the library checkout is, and why the audit needs one.

The documentation lives in `CTRLRun/ctrlrun-docs` and the library it documents lives in
`CTRLRun/ctrlrun`. Splitting the two repositories did not split the guarantee: a page that
says the CLI prints X is still only true if the CLI prints X, and the check that proves it
has to read both trees.

So the audit resolves a **core checkout** and reads the library's side out of it. There is no
fallback that lets the checks pass without one. A missing checkout raises, and CI fails; it
does not skip. A documentation check that skips because it could not find the code is the
false green this project keeps finding -- the page would go on claiming whatever it claimed
the day the checkout went missing.

Resolution order:

1. `$CTRLRUN_SOURCE`, if set. CI sets it to the path it checked the library out to.
2. `../ctrlrun`, a sibling of this repository, which is where a developer with both clones
   already has it.

A path that exists but is not the library is refused rather than used: the marker is
`src/ctrlrun/__init__.py`, so a stale or half-cloned directory cannot answer the question
quietly.
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

#: What a real `CTRLRun/ctrlrun` checkout has and a wrong directory does not.
MARKER = Path("src") / "ctrlrun" / "__init__.py"

INSTALL = (
    "The documentation checks read the library they document. Clone it beside this "
    "repository:\n"
    "    git clone https://github.com/CTRLRun/ctrlrun ../ctrlrun\n"
    "or point CTRLRUN_SOURCE at an existing checkout:\n"
    "    export CTRLRUN_SOURCE=/path/to/ctrlrun"
)


class CoreCheckoutMissing(RuntimeError):
    """No `CTRLRun/ctrlrun` checkout was found. Raised, never swallowed into a skip."""


def _candidates() -> list[Path]:
    configured = os.environ.get("CTRLRUN_SOURCE")
    found = [Path(configured).expanduser().resolve()] if configured else []
    return [*found, REPO_ROOT.parent / "ctrlrun"]


def core_root() -> Path:
    """The library checkout, or `CoreCheckoutMissing` naming every place that was looked."""
    looked: list[str] = []
    for candidate in _candidates():
        looked.append(str(candidate))
        if (candidate / MARKER).is_file():
            return candidate.resolve()
    raise CoreCheckoutMissing(
        "no CTRLRun/ctrlrun checkout found (looked at: " + ", ".join(looked) + ")\n" + INSTALL
    )


CORE_ROOT = core_root()
