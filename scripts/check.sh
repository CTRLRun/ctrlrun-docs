#!/bin/sh
# Everything CI runs, in one place, cheapest first -- the same file CI calls, so "it passed
# locally" and "it passed in CI" cannot come to mean different things.
#
# The documentation checks read the library they document. `tools/docs_audit/_core.py` finds
# it at $CTRLRUN_SOURCE or at ../ctrlrun, and *raises* when there is none: a documentation
# check that skips because it could not find the code is a check that has verified nothing
# while reporting green.
#
# There is no `mypy --strict` step, and its absence is deliberate rather than an oversight.
# The library runs `mypy --strict src`; `tools/` was never in that scope, before the split or
# after it. The tools are also a directory of *top-level* modules -- they import each other as
# `import links`, off a `sys.path` entry -- while `__init__.py` beside them says "package", and
# mypy refuses the contradiction rather than picking one. Adding the check would mean deciding
# that question, which is a change to how the tools are imported and not part of moving them.
set -eu

PYTHON="${PYTHON:-python3}"

run() {
    printf '\n=== %s ===\n' "$*"
    "$PYTHON" -m "$@"
}

printf 'library checkout: '
"$PYTHON" -c 'import sys; sys.path.insert(0, "tools/docs_audit"); from _core import CORE_ROOT; print(CORE_ROOT)'

run ruff format --check
run ruff check
run pytest

printf '\nall checks passed\n'
