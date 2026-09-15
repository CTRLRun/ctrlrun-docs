/* Run with Mintlify preview on port 3000 and Playwright installed:
 * NODE_PATH="$(npm root -g)" node docs/assets/verify-website.cjs
 * No emails are opened or sent. No real actions or network-backed demo runs.
 */
module.exports = async function verifyWebsite(page, base = 'http://localhost:3000') {
  const checks = [];
  const assert = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  const drawing = () => page.locator('svg.cr-dg');
  const shownDomain = () => page.locator('#cr-domain-value').textContent();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  assert((await page.goto(base)).status() === 200, 'Homepage responds without a redirect loop');
  await page.locator('.cr-footer').waitFor();
  assert(await page.locator('h1').count() === 1, 'Homepage has one H1');
  assert(await page.locator('.cr-footer').isVisible(), 'Final CTAs render in custom mode');
  assert(await page.locator('link[rel=canonical]').getAttribute('href') === 'https://ctrlrun.dev/', 'Homepage canonical points to /');
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Homepage fits viewport ' + width);
  }
  // The execution boundary: one control, one drawing, and the refusals named inside it.
  assert((await page.goto(base + '/execution-boundary')).status() === 200, 'The boundary page responds without a redirect loop');
  assert(await drawing().count() === 1, 'The path is drawn once, not once per state');
  const drawn = await drawing().textContent();
  for (const raised of ['ActionDenied', 'ApprovalRequired', 'ApprovalMismatch', 'DuplicateEffect', 'AMBIGUOUS']) {
    assert(drawn.includes(raised), 'The drawing names the refusal ' + raised);
  }
  assert(drawn.includes('Refund customer') && drawn.includes('refund_customer:txn_4821'), 'The drawing carries the action and its effect key');
  assert(drawn.includes('Stripe. The ledger.'), 'The drawing names the real system for the domain shown');
  await page.getByRole('button', { name: 'Your domain FinTech & Banking' }).click();
  assert(await page.getByRole('option').count() === 12, 'Twelve domains, where there were forty-eight');
  await page.getByRole('combobox', { name: 'Search domains' }).fill('payroll');
  assert(await page.getByRole('option').count() === 1, 'A narrower name still finds the domain holding it');
  await page.keyboard.press('Enter');
  assert(await shownDomain() === 'HR & Payroll', 'Choosing by a narrower name selects its domain');
  assert((await drawing().textContent()).includes('Send offer'), 'The drawing follows the domain');
  assert((await drawing().textContent()).includes('The payroll run'), 'The system on the far side is the one this domain actually calls');
  assert((await page.locator('.cr-domain-cta').innerText()).includes('payroll'), 'Commercial CTA follows the selected domain');
  await page.getByRole('button', { name: 'Your domain HR & Payroll' }).click();
  await page.getByRole('combobox', { name: 'Search domains' }).fill('does-not-exist');
  assert(await page.getByText('No domain holds that name.').isVisible(), 'Empty search has a useful recovery message');
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button', { name: 'Your domain HR & Payroll' }).evaluate(node => node === document.activeElement), 'Escape restores focus to the domain button');
  assert((await drawing().textContent()).includes('A person answers this one'), 'The approval path is drawn coming back');
  assert((await drawing().textContent()).includes('Ask what happened. Never repeat.'), 'The unknown outcome is settled, not retried');

  await page.goto(base + '/execution-boundary?domain=Finance&action=Transfer%20funds');
  assert(await shownDomain() === 'FinTech & Banking', 'A link written against the old forty-eight names still resolves');
  assert((await drawing().textContent()).includes('Transfer funds'), 'and keeps the action it named');
  await page.evaluate(() => { window.crTestEvents = []; window.addEventListener('ctrlrun:conversion', event => window.crTestEvents.push(event.detail)); });
  await page.getByRole('button', { name: /Claims worker, timeout/ }).click();
  assert(await shownDomain() === 'Insurance', 'A refusal card redraws the boundary above it');
  assert((await page.evaluate(() => window.crTestEvents)).some(event => event.name === 'story_opened'), 'Conversion events are emitted');
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'The boundary page fits viewport ' + width);
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // The home page's one form. `/risk-check` and `/protect-my-agent` were checked here until
  // v0.12; both pages were removed when the site became technical only, and the walkthroughs
  // that drove their multi-step forms went with them. What is left is the single signup.
  await page.goto(base + '/');
  await page.locator('#updates').scrollIntoViewIfNeeded();
  const signups = [];
  await page.route('https://ctrlrun-review-form.vercel.app/api/interest', async route => {
    signups.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, id: 'test-email' }) });
  });
  await page.locator('.cr-updates-form input[type=email]').fill('reader@example.com');
  await page.getByRole('button', { name: 'Keep me posted →' }).click();
  await page.locator('.cr-updates-done').waitFor();
  assert(signups.length === 1 && signups[0].intent === 'launch-updates', 'The signup posts the launch-updates intent');
  assert(signups[0].email === 'reader@example.com', 'The address reaches the endpoint');
  assert(!('company' in signups[0]) || !signups[0].company, 'The signup asks for nothing but an address');
  await page.unroute('https://ctrlrun-review-form.vercel.app/api/interest');
  assert(await page.locator('text=/Pro|Enterprise|Pricing/i').count() === 0, 'No commercial copy on the home page');
  await page.setViewportSize({ width: 1280, height: 900 });
  assert((await page.goto(base + '/docs')).status() === 200, 'Documentation landing responds without a redirect loop');
  await page.locator('#sidebar').waitFor();
  assert(await page.locator('#sidebar').isVisible(), 'Documentation retains the native sidebar');
  assert((await page.locator('main').innerText()).includes('Protect one function'), 'The original technical overview remains at /docs');
  const docLinks = await page.locator('#sidebar a[href]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')).filter(href => href.startsWith('/')));
  assert(docLinks.every(href => href === '/docs' || href.startsWith('/docs/')), 'Technical sidebar links stay under /docs');
  await page.goto(base + '/docs/get-started/quickstart');
  assert(await page.locator('main h1').count() === 1, 'Quickstart renders at its migrated route');
  assert(await page.locator('link[rel=canonical]').getAttribute('href') === 'https://ctrlrun.dev/docs/get-started/quickstart', 'Documentation canonical uses the migrated route');
  assert(errors.length === 0, 'No browser runtime errors: ' + errors.join('; '));
  return { passed: checks.length, checks };
};
if (typeof require !== 'undefined' && require.main === module) {
  const { chromium } = require('playwright');
  (async () => { const browser = await chromium.launch(); try { const page = await browser.newPage(); console.log(JSON.stringify(await module.exports(page, process.env.WEBSITE_BASE_URL), null, 2)); } finally { await browser.close(); } })().catch(error => { console.error(error); process.exitCode = 1; });
}
