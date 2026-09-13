"""The cookbook pages, and the directories they are the single source of.

The recipes themselves -- that each one runs offline, twice, and refuses something -- are
checked in the library, beside the `examples/cookbook/` directories they run. What is here is
the half that needs the pages: a directory is what its page shows, a hand edit to an extracted
file is drift, and every page carries its five sections.

A recipe page is the single source; `tools/docs_audit/render_cookbook.py` extracts the policy
and the script into `examples/cookbook/<name>/`. Here each directory is run in a subprocess
whose `sitecustomize` refuses every socket, twice in the same working directory so a second
run must refuse the same things rather than trip over a stale record, and the exit status must
be 0 — every recipe carries an `else: raise SystemExit` on the path where a refusal did not
happen, so a recipe that quietly starts succeeding fails here.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from _core import CORE_ROOT

REPO_ROOT = Path(__file__).resolve().parents[1]
TOOLS = REPO_ROOT / "tools" / "docs_audit"
COOKBOOK = CORE_ROOT / "examples" / "cookbook"
PAGES = REPO_ROOT / "docs" / "cookbook"

if not (TOOLS.exists() and PAGES.exists()):  # pragma: no cover - not a checkout
    pytest.skip("no repository checkout", allow_module_level=True)

sys.path.insert(0, str(TOOLS))

import render_cookbook  # noqa: E402

REQUIRED_SECTIONS = (
    "## The policy",
    "## The code",
    "## What the agent sees",
    "## The receipt",
    "## When an AMBIGUOUS appears",
)


def test_every_recipe_directory_is_what_its_page_shows():
    assert render_cookbook.check(render_cookbook.recipes()) == []


def test_every_extracted_script_carries_the_licence_the_kernel_requires():
    """The kernel's `test_every_source_file_carries_its_copyright_and_license` requires two SPDX
    lines at the top of every `.py` and `.sh` under `examples/`, and this generator writes
    nineteen of those files. It did not emit them, so the first run after that rule landed stripped
    them off all nineteen and turned the kernel's own suite red on output produced here.

    The kernel's rule and this generator are in two repositories and nothing connected them. This
    is the connection, stated on the side that writes the files. The `.yaml` files are excluded
    because the kernel's rule names the two suffixes it checks and the extracted policies have
    never carried the tags.
    """
    tags = (
        "# SPDX-FileCopyrightText: 2026 The CTRLRun contributors",
        "# SPDX-License-Identifier: Apache-2.0",
    )
    checked = 0
    for name, files in render_cookbook.recipes().items():
        for filename, content in files.items():
            if not filename.endswith((".py", ".sh")):
                assert not content.startswith(tags[0]), (
                    f"{name}/{filename}: the kernel's rule does not cover this suffix, so a tag "
                    "here is drift in the other direction"
                )
                continue
            checked += 1
            assert content.splitlines()[:2] == list(tags), f"{name}/{filename}"
    assert checked >= 19, checked


def test_a_hand_edit_to_an_extracted_file_is_drift(tmp_path, monkeypatch):
    monkeypatch.setattr(render_cookbook, "EXAMPLES", tmp_path)
    extracted = render_cookbook.recipes()
    render_cookbook.write(extracted)
    first = next(iter(extracted))
    target = tmp_path / first / "main.py"
    target.write_text(target.read_text() + "\n# edited by hand\n")

    assert any(first in item for item in render_cookbook.check(extracted))


@pytest.mark.parametrize("page", sorted(p.stem for p in PAGES.glob("*.mdx") if p.stem != "index"))
def test_every_recipe_page_has_the_five_sections(page):
    text = (PAGES / f"{page}.mdx").read_text(encoding="utf-8")
    for section in REQUIRED_SECTIONS:
        assert section in text, f"{page}: missing {section!r}"
