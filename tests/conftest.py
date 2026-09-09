"""What every documentation test needs before it can import anything.

`tools/docs_audit/` is a directory of scripts rather than an installed package -- the tools
are run as `python tools/docs_audit/render_cli.py --check`, and the tests import the same
modules to assert on their innards. Putting it on `sys.path` once, here, is what lets a test
say `from _core import CORE_ROOT` instead of repeating four lines of path arithmetic.

Nothing in this file reaches for the library checkout. `_core.py` does that, at import, and
raises when it cannot find one -- so a missing checkout is a collection error naming the two
places it looked, not a suite that quietly runs the subset of checks needing no source.
"""

from __future__ import annotations

import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools" / "docs_audit"
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))
