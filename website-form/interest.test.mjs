import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from './api/interest.mjs';

const pro = { intent: 'pro-waitlist', email: 'engineer@example.com', company: 'Example', agents: 'Support agent', requestId: '11111111-1111-4111-8111-111111111111' };
const enterprise = { intent: 'enterprise-contact', email: 'cto@example.com', company: 'Example', message: 'Approvals in Slack, on-prem deployment.', requestId: '22222222-2222-4222-8222-222222222222' };
const updates = { intent: 'launch-updates', email: 'reader@example.com', requestId: '33333333-3333-4333-8333-333333333333' };
const request = (body, headers = {}) => ({ method: 'POST', headers: { origin: 'https://ctrlrun.dev', 'content-type': 'application/json', 'x-vercel-forwarded-for': '192.0.2.1', ...headers }, body });
const response = () => ({ code: 200, headers: {}, body: null, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; } });
const handler = (overrides = {}) => createHandler({ env: { RESEND_API_KEY: 'test-only' }, rateStore: new Map(), fetcher: async () => ({ ok: true, json: async () => ({ id: 'test-email' }) }), ...overrides });

test('each intent sends to the fixed recipient with its own subject and idempotency key', async () => {
  for (const [input, subject] of [[pro, 'CTRLRun Pro waiting list — Example'], [enterprise, 'CTRLRun Enterprise enquiry — Example']]) {
    let sent;
    const fn = handler({ fetcher: async (url, options) => { sent = { url, ...options }; return { ok: true, json: async () => ({ id: 'test-email' }) }; } });
    const res = response(); await fn(request({ ...input, to: 'attacker@example.com', from: 'spoof@example.com' }), res);
    assert.equal(res.code, 200); assert.equal(res.body.ok, true);
    const body = JSON.parse(sent.body);
    assert.deepEqual(body.to, ['contact@arpanghoshal.com']);
    assert.equal(body.reply_to, input.email);
    assert.equal(body.from, 'CTRLRun <reviews@updates.arpanghoshal.com>');
    assert.equal(body.subject, subject);
    assert.equal(sent.headers['Idempotency-Key'], input.intent + '/' + input.requestId);
  }
});

test('an unknown intent cannot send mail, and Enterprise must say what it needs', async () => {
  let calls = 0;
  const fn = handler({ fetcher: async () => { calls++; throw new Error('must not send'); } });
  const rejected = [
    request({ ...pro, intent: 'free-everything' }),
    request({ ...pro, intent: '' }),
    request({ ...enterprise, message: '' }),
    request({ ...pro, email: 'a@b.com\r\nBcc: x@y.com' }),
    request({ ...pro, company: '' }),
    request({ ...pro, requestId: 'invalid' }),
    request({ ...pro, website: 'spam' }),
    request({ ...pro, message: 'x'.repeat(601) }),
    request(pro, { origin: 'https://elsewhere.example' }),
    request('{')
  ];
  for (const req of rejected) { const res = response(); await fn(req, res); assert.ok(res.code >= 400, JSON.stringify(req.body)); }
  assert.equal(calls, 0);
});

test('an optional field sent empty is accepted rather than rejected', async () => {
  // The browser always sends the key; Pro leaves it blank when the visitor does.
  const res = response();
  await handler()(request({ ...pro, agents: '' }), res);
  assert.equal(res.code, 200);
});

test('Pro needs no message but Enterprise carries one into the mail body', async () => {
  let sent;
  const fn = handler({ fetcher: async (url, options) => { sent = options; return { ok: true, json: async () => ({ id: 'test-email' }) }; } });
  const res = response(); await fn(request(pro), res);
  assert.equal(res.code, 200);
  assert.ok(!JSON.parse(sent.body).text.includes('What they need'));
  const res2 = response(); await fn(request(enterprise), res2);
  assert.equal(res2.code, 200);
  assert.ok(JSON.parse(sent.body).text.includes('Approvals in Slack, on-prem deployment.'));
});

test('provider failure, timeout and malformed success never become success', async () => {
  for (const fetcher of [async () => ({ ok: false }), async () => { throw new Error('timeout'); }, async () => ({ ok: true, json: async () => ({}) })]) {
    const res = response(); await handler({ fetcher })(request(pro), res);
    assert.equal(res.code, 502); assert.notEqual(res.body.ok, true);
  }
});

test('a missing API key reports unavailable rather than pretending to send', async () => {
  const res = response();
  await createHandler({ env: {}, rateStore: new Map(), fetcher: async () => { throw new Error('must not send'); } })(request(pro), res);
  assert.equal(res.code, 503);
});

test('repeated requests from one address are rate limited', async () => {
  const fn = handler();
  let last;
  for (let i = 0; i < 7; i++) { last = response(); await fn(request({ ...pro, requestId: '3333333' + i + '-3333-4333-8333-333333333333' }), last); }
  assert.equal(last.code, 429);
  assert.equal(last.headers['Retry-After'], '600');
});

test('preflight is allowed for site origins and refused for everything else', async () => {
  const fn = handler({ fetcher: async () => { throw new Error('Preflight must not send'); } });
  for (const origin of ['https://ctrlrun.dev', 'https://unrelated.mintlify.site']) {
    const res = response(); await fn({ ...request(pro, { origin }), method: 'OPTIONS' }, res);
    assert.equal(res.code, origin.includes('unrelated') ? 403 : 204);
  }
});

test('launch updates takes an address and nothing else', async () => {
  // ctrlrun.dev has no tiers and no sales path, so the one form on it asks for one field. If
  // `company` were required here, as it is for the two commercial intents, the site's only form
  // would reject every submission it receives -- and it would do so at the endpoint, where the
  // page cannot see it.
  let sent;
  const fn = handler({ fetcher: async (url, options) => { sent = { url, ...options }; return { ok: true, json: async () => ({ id: 'test-email' }) }; } });
  const res = response();

  await fn(request(updates), res);

  assert.equal(res.code, 200);
  assert.equal(res.body.ok, true);
  const body = JSON.parse(sent.body);
  // No company, so no trailing dash: a subject line ending in ' — ' is the bug this catches.
  assert.equal(body.subject, 'CTRLRun launch updates');
  assert.equal(body.reply_to, updates.email);
  assert.ok(!body.text.includes('Company:'), body.text);
});

test('a company sent with launch updates is carried, not silently dropped', async () => {
  // Optional is not ignored. Somebody who types an employer should see it in the mail.
  let sent;
  const fn = handler({ fetcher: async (url, options) => { sent = { url, ...options }; return { ok: true, json: async () => ({ id: 'test-email' }) }; } });
  const res = response();

  await fn(request({ ...updates, company: 'Example' }), res);

  assert.equal(res.code, 200);
  const body = JSON.parse(sent.body);
  assert.equal(body.subject, 'CTRLRun launch updates — Example');
  assert.ok(body.text.includes('Company: Example'), body.text);
});

test('the commercial intents still require a company', async () => {
  // Making `company` conditional must not relax it where it was required. Without this, the
  // change that added one intent quietly loosened validation for the other two.
  const fn = handler();
  for (const input of [pro, enterprise]) {
    const res = response();
    const { company, ...without } = input;
    await fn(request(without), res);
    assert.equal(res.code, 400, input.intent);
  }
});
