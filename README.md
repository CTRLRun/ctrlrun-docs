# ctrlrun documentation

The source of [ctrlrun.dev](https://ctrlrun.dev): the pages, the tools that render them from
the library's own source, and the tests that check them.

The library itself is **[CTRLRun/ctrlrun](https://github.com/CTRLRun/ctrlrun)**. Nothing in
this repository is published to PyPI, and nothing here is imported by `pip install ctrlrun`.
If you came looking for the code, the specifications or the changelog, they are there.

## Layout

This repository is the Mintlify site root, so a file's path here is the URL it serves.

| Path | What it is |
|---|---|
| `docs.json` | Site configuration and the whole navigation tree |
| `index.mdx`, `execution-boundary.mdx` | The top-level pages |
| `docs/` | Every documentation page: guides, concepts, cookbook, reference, architecture |
| `snippets/`, `images/`, `style.css`, `*.js` | Components, media and the browser demos |
| `capabilities.yaml` | The capability matrix's source. Edit the YAML, never a rendered table |
| `generated/` | Rendered fragments. Written by `tools/docs_audit/`, never by hand |
| `tools/docs_audit/` | The renderers and the four drift checks |
| `tests/` | What proves the pages describe the shipped library |
| `website-form/` | The Vercel function behind the site's review form |

## Working on it

The checks read the library they document, because a page that says the CLI prints X is only
true if the CLI prints X. Clone it beside this repository:

```sh
git clone https://github.com/CTRLRun/ctrlrun-docs
git clone https://github.com/CTRLRun/ctrlrun
cd ctrlrun-docs
pip install -e "../ctrlrun[dev,gateway,otel,identity]"
pip install ruff mypy pytest griffe pyyaml
./scripts/check.sh
```

`../ctrlrun` is the default. Set `CTRLRUN_SOURCE` to point somewhere else.

**A missing library checkout is an error, not a skip.** `tools/docs_audit/_core.py` raises and
names both places it looked. A documentation check that skipped because it could not find the
code would report green while verifying nothing, and the page would go on claiming whatever
it claimed the day the checkout went missing.

## Regenerating

Pages under `docs/reference/`, the cookbook and the research write-ups are rendered, not
typed. Edit the source they come from and re-run the renderer:

```sh
python tools/docs_audit/render_api.py --write           # from ctrlrun's docstrings
python tools/docs_audit/render_cli.py --write           # from click's --help
python tools/docs_audit/render_schemas.py --write       # from the receipt and event schemas
python tools/docs_audit/render_cookbook.py --write      # from examples/cookbook/
python tools/docs_audit/render_capabilities.py --write  # from capabilities.yaml
python tools/docs_audit/render_probe.py --write         # from research/framework-probe/
python tools/docs_audit/render_soak.py --write          # from research/soak/
python tools/docs_audit/render_readiness.py --write     # from the version and the suite
```

Each also takes `--check`, which is what CI runs.

## How the two repositories stay in step

- CI here checks out `CTRLRun/ctrlrun` and runs every page check against it: the branch of
  the same name as the one under test when there is one, `main` otherwise. A change there
  that alters a docstring or a `--help` comes with a branch here of the same name, regenerated
  against it, and the two merge together, the code first. `main` is checked against `main`.
- That repository's `docs` job is the mirror image: it checks out the branch here named
  after the kernel branch under test, or `main`, and runs the same checks.
- A push to that repository's `main` sends a `library-changed` dispatch, so a change to the
  code re-checks the pages that describe it.
- A weekly run is the floor, so a dispatch that stops arriving is a red run and not silence.

## Licence

Apache-2.0, the same as the library. See [LICENSE](LICENSE).

## The site, file by file

- `index.mdx` serves `/`: the one Overview. The hero and the hallucinated-refund example, the
  seven-step diagram, and below them the technical overview `docs.mdx` used to carry at
  `/docs` until the two were merged on 2026-09-16. `/docs` redirects here.
- `execution-boundary.mdx` serves `/execution-boundary`: the boundary in three sections -- the drawing, the three
  ways it goes into a codebase, and the four steps by which autonomy widens. The drawing lives
  in `snippets/execution-boundary.jsx` and is chosen by one control, the domain: it carries the
  action, the five checks and the refusal each one raises, so the prose beside it stays short.
- `docs/` is every technical page, published under `/docs/...`.
- `execution-boundary.mdx` is a custom-mode page. The two commercial pages it sat beside,
  `risk-check.mdx` and `protect-my-agent.mdx`, were removed when the site became technical only.
- `snippets/` holds small client-side React components. Mintlify injects React hooks; do not
  add cross-snippet imports or third-party browser dependencies.
- `style.css` scopes product styling to `.cr-site`; documentation keeps the native layout.
- `docs.json` defines navigation, metadata and the permanent redirects from the former URLs.
- `images/` is public assets. `assets/` is source assets and the browser verification scripts.

## Preview and validate

```bash
mint dev                      # http://localhost:3000
mint validate && mint broken-links
```

And the checks, from this repository's root with a library checkout beside it:

```bash
./scripts/check.sh
node --test website-form/review.test.mjs
NODE_PATH="$(npm root -g)" node assets/verify-website.cjs
```

The browser harness needs Playwright and the preview server. It covers the demo state
transitions, the keyboard picker, mobile overflow, risk scoring, form validation, the mocked
email failure/retry/success path, the documentation sidebar and the canonical URLs. It never
sends an email. Set `WEBSITE_BASE_URL` to a hosted preview to run the same checks against a
deployment; hosted checks also catch redirect normalization the local server does not.
**Do not add `/index` → `/` or `/docs/index` → `/docs` redirects**: Mintlify normalizes those
sources to their destinations, which makes them self-redirects.

## The demos, and what they actually run

The Medical Affairs workbench uses `medical-workbench.js`, styles scoped to
`#cr-medical-workbench`, and the library's `examples/medical_workbench.py`. Keep its embedded
`MODULE` equivalent to that Python source; `tests/test_medical_workbench.py` checks the copy
against the library checkout. The browser loads ctrlrun on demand. Evidence and synthesis are
synthetic; release decisions and receipts execute in Python.
`assets/verify-medical-workbench.cjs` exercises browser Python, both downloads, error
recovery and all six stages at three viewport widths.

The boundary page holds 12 domains, which between them name the 48 narrower domains the
picker used to list one by one, and 102 actions. An older `/try?domain=Finance` link still
resolves: `/try` redirects to `/execution-boundary`, and the alias map built from those names
carries the domain. Every decision on the page is an
illustrative client-side simulation.

The risk check stores no answers and sends nothing until a visitor submits a review request.
Its result distinguishes an indicated pattern from an unknown answer, and explains the score.

The review form posts to the Vercel Function in `website-form/`, which calls Resend. The
recipient is fixed server-side and no API key appears in any Mintlify file. A mailto/copy
fallback stays available, and a browser retry reuses its request id, so success appears only
once the server confirms Resend accepted the message.

`website-events.js` and the components emit `ctrlrun:conversion` events for page visits, CTA
clicks, selections, scenario outcomes and the launch-updates signup. No
analytics provider is configured: these are integration hooks and not stored analytics. Event
payloads exclude contact details and free-text form contents.

## Deployment

The Mintlify GitHub App deploys from this repository's `main`, with the **content directory at
the repository root** — it was `/docs` inside `CTRLRun/ctrlrun` before the split, and that
setting has to be changed once, in the Mintlify dashboard, or the site keeps building from a
directory that no longer has any pages in it.

The Vercel project serves only the form API; it hosts no second frontend. Keep the `/mcp`
platform endpoint unchanged: the `/docs/mcp/...` pages document MCP integrations and are
separate from Mintlify's own generated search endpoint.
