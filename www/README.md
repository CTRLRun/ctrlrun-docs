# ctrlrun.dev

The project site for the open-source kernel: one static page, a 404, the fonts, the recording. Nothing to buy on it. Deployed by Vercel with this folder as the project root; `vercel.json` carries the security headers the OpenSSF Best Practices hardened-site criterion probes for, and the permanent redirects that send `/docs/*` and the old Mintlify pages to docs.ctrlrun.dev.

- `index.html` opens with the README's H1 and lede, verbatim; `tests/test_home_and_readme_agree.py` pins them here as well as in `index.mdx`.
- The "Something bigger is coming" form posts to the website form's `/api/interest` with the `launch-updates` intent: an email and nothing else.
- Copy is the README's. The seven-step diagram is `snippets/how-diagram.jsx`, inlined; regenerate it with `scripts/render-how-diagram.py` and re-run `scripts/build-www.py` (to be added) or paste.
