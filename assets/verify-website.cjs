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

  await page.goto(base + '/risk-check');
  await page.getByLabel('Move money', { exact: true }).check();
  for (let index = 0; index < 5; index++) await page.locator('input[name="risk-' + index + '"][value="' + ([2, 4].includes(index) ? 'No' : 'Yes') + '"]').check();
  await page.getByRole('button', { name: 'Check my execution risk →' }).click();
  assert((await page.locator('.cr-risk-result').innerText()).includes('5 execution-risk patterns'), 'All five indicated patterns appear in the risk result');
  assert((await page.locator('.cr-risk-result').innerText()).includes('Execution risk: High'), 'High result has a transparent threshold');
  await page.locator('input[name="risk-0"][value="Unsure"]').check();
  assert(await page.locator('.cr-risk-result').count() === 0, 'Changing an answer clears the stale result');
  for (let index = 0; index < 5; index++) await page.locator('input[name="risk-' + index + '"][value="' + ([2, 4].includes(index) ? 'Yes' : 'No') + '"]').check();
  await page.getByRole('button', { name: 'Check my execution risk →' }).click();
  assert((await page.locator('.cr-risk-result').innerText()).includes('Lower indicated risk'), 'Controls present produce a lower indicated result');
  await page.setViewportSize({ width: 375, height: 812 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Risk check fits mobile');
  await page.goto(base + '/protect-my-agent?domain=DevOps&risk=High&patterns=4&unknowns=1');
  assert((await page.locator('.cr-domain-context').innerText()).includes('DevOps'), 'Domain context carries into the review form');
  await page.getByRole('button', { name: 'Review my request →' }).click();
  assert(await page.locator('.cr-email-preview').count() === 0, 'Empty form cannot prepare a request');
  await page.getByLabel('Work email', { exact: true }).fill('engineer@example.com');
  await page.getByLabel('Company', { exact: true }).fill('Example test company');
  await page.getByLabel('What does your agent do?').fill('Test deployment workflow');
  await page.getByLabel('Which actions can it execute?').fill('Deploy production releases');
  await page.getByLabel('Retry safety', { exact: true }).check();
  await page.getByRole('button', { name: 'Review my request →' }).click();
  const href = await page.getByRole('link', { name: 'Use my email app instead ↗' }).getAttribute('href');
  assert(href.startsWith('mailto:contact@arpanghoshal.com?'), 'Review handoff uses the approved recipient');
  const body = decodeURIComponent(href.split('&body=')[1]);
  assert(body.includes('Example test company') && body.includes('Deploy production releases') && body.includes('Retry safety') && body.includes('High'), 'Email brief includes qualification and risk context');
  assert((await page.locator('.cr-email-preview').innerText()).includes('has not been sent'), 'The form never falsely claims delivery');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Review form fits mobile');
  await page.getByLabel('Company', { exact: true }).fill('Updated test company');
  assert(await page.locator('.cr-email-preview').count() === 0, 'Editing the brief clears the prepared handoff');
  await page.getByRole('button', { name: 'Review my request →' }).click();
  const submissions = [];
  await page.route('https://ctrlrun-review-form.vercel.app/api/review', async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: submissions.length === 1 ? 502 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(submissions.length === 1 ? { error: 'Provider temporarily unavailable.' } : { ok: true, id: 'mock-only-no-email-sent' }) });
  });
  await page.getByRole('button', { name: 'Send review request →' }).click();
  await page.getByRole('alert').filter({ hasText: 'Provider temporarily unavailable.' }).waitFor();
  assert((await page.locator('.cr-email-preview').innerText()).includes('has not been sent'), 'Provider failure never claims success');
  await page.getByRole('button', { name: 'Retry submission →' }).click();
  await page.getByRole('heading', { name: 'Review request submitted.' }).waitFor();
  assert(submissions.length === 2 && submissions[0].requestId === submissions[1].requestId, 'Uncertain email retries reuse the same idempotency key');
  assert(submissions[1].email === 'engineer@example.com', 'Work email is included for replies');
  assert(await page.getByRole('button', { name: 'Send review request →' }).count() === 0, 'Successful submission cannot be double-clicked');
  await page.unroute('https://ctrlrun-review-form.vercel.app/api/review');
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
