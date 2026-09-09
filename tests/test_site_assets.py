"""The site's copies of the library's brand assets.

`images/` here and `docs/assets/` in the library hold the same three files, because the site
serves them and the README embeds them from raw.githubusercontent. Two copies of one image is
a thing that drifts, and a drifted wordmark is the kind of defect nobody reports.

The comparison used to live in the library's `test_readme_assets.py`, where both directories
were in one checkout. It came here rather than being dropped: this is the checkout that has
both now, and `_core.py` makes a missing library a failure rather than a skip.
"""

from __future__ import annotations

from pathlib import Path

from _core import CORE_ROOT

REPO_ROOT = Path(__file__).resolve().parents[1]
IMAGES = REPO_ROOT / "images"
ASSETS = CORE_ROOT / "docs" / "assets"

#: The three the site and the README both use. `wordmark.svg`, `logo*.png` and the social
#: preview are the library's alone, and `demo-poster.jpg`, `demo.mp4` and `social-preview.png`
#: are the site's alone; neither set has a second copy to drift against.
SHARED = ("wordmark-light.svg", "wordmark-dark.svg", "favicon.svg")


def test_the_sites_wordmarks_are_the_librarys():
    for name in SHARED:
        site = (IMAGES / name).read_text(encoding="utf-8")
        library = (ASSETS / name).read_text(encoding="utf-8")
        assert site == library, f"images/{name} has drifted from the library's docs/assets/"


def test_the_shared_assets_are_all_actually_here():
    """The control. A `SHARED` naming a file neither directory has would make the test above
    pass on nothing, which is the shape of false green this repository keeps finding."""
    for name in SHARED:
        assert (IMAGES / name).is_file(), f"images/{name}"
        assert (ASSETS / name).is_file(), f"the library has no docs/assets/{name}"
    assert SHARED, "an empty list would make both tests vacuous"


def test_the_accent_survives_in_both_copies():
    """Same assertion the library makes about its own copies, so a drift that replaced both
    with something off-brand is caught rather than agreed on."""
    for name in SHARED:
        assert "#F5A623" in (IMAGES / name).read_text(encoding="utf-8"), f"{name} lacks the accent"
