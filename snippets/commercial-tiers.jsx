// The action on one commercial tier card: the button that opens its form, and the form. The card
// around it -- status, name, promise, body, who does the work -- is static markup in index.mdx,
// and so is the whole Open Source card, whose action is a link and needs nothing from here.
//
// That split is the point. Mintlify renders a component imported from /snippets on the client, so
// everything this file used to draw was absent from the server-rendered HTML: a crawler, and any
// fetcher that does not run JavaScript, got the three section headings and none of the three
// tiers. Roughly 190 words of the page's plainest prose was invisible, which is most of why the
// home page measured 264 words. The prose moved into the page; only what needs state stayed here.
//
// One instance per card, named by `intent`, so each card keeps its own fields. A card whose form
// is open is bordered by `.cr-tier:has(.cr-tier-form)` in style.css, because the class that used
// to say so was on a card this file no longer owns.
//
// Both tiers post to /api/interest, which decides the subject line and the required fields from
// `intent` rather than trusting anything the browser sends.
//
// ENDPOINT and TIERS live inside the component for the original reason: a snippet exports one
// binding, and module-level constants beside it are not in scope when MDX evaluates it.
export const CommercialTiers = ({ intent }) => {
  const ENDPOINT = 'https://ctrlrun-review-form.vercel.app/api/interest';

  const TIERS = [
    {
      intent: 'pro-waitlist',
      cta: 'Request early access',
      field: 'agents',
      label: 'What do your agents do?',
      optional: true,
      rows: 2,
      max: 200,
      placeholder: 'For example, a support agent that issues refunds',
      submit: 'Join the waiting list →',
      done: 'You are on the list. We will write to that address when Pro opens up.'
    },
    {
      intent: 'enterprise-contact',
      cta: 'Discuss your deployment',
      field: 'message',
      label: 'What does your deployment need?',
      optional: false,
      rows: 3,
      max: 600,
      placeholder: 'Controls, integrations, deployment constraints, timeline',
      submit: 'Send enquiry →',
      done: 'Thank you. We will reply from contact@arpanghoshal.com to arrange a call.'
    }
  ];

  const tier = TIERS.find(candidate => candidate.intent === intent);

  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [detail, setDetail] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const sendingRef = useRef(false);
  const track = name => window.dispatchEvent(new CustomEvent('ctrlrun:conversion', { detail: { name } }));

  // Hooks run before this: an unknown intent is a mistake in the page, not a state to render.
  if (!tier) return null;
  const eventName = suffix => tier.intent.replace(/-/g, '_') + suffix;

  const openTier = () => {
    setOpen(true);
    setEmail(''); setCompany(''); setDetail(''); setError('');
    requestId.current = null;
    track(eventName('_opened'));
  };

  const send = async event => {
    event.preventDefault();
    if (sendingRef.current || sent) return;
    // One id per filled-in form: an uncertain response can be retried without a second email.
    if (!requestId.current) requestId.current = crypto.randomUUID();
    sendingRef.current = true; setSending(true); setError('');
    try {
      const payload = { intent: tier.intent, email, company, website, requestId: requestId.current };
      payload[tier.field] = detail;
      const response = await fetch(ENDPOINT, {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true || typeof data.id !== 'string') throw new Error(data.error || 'We could not confirm submission. Please retry or email us directly.');
      setSent(true); track(eventName('_submitted'));
    } catch (failure) {
      setError(failure.name === 'TimeoutError' || failure.name === 'TypeError' ? 'We could not confirm submission. You can retry the same request safely, or email us directly.' : failure.message);
    } finally { sendingRef.current = false; setSending(false); }
  };

  return (
    <div className="cr-tier-action">
      {sent && <p className="cr-tier-done" role="status">{tier.done}</p>}
      {!sent && !open && (
        <button type="button" className="cr-button" onClick={openTier}>{tier.cta} <span aria-hidden="true">→</span></button>
      )}
      {!sent && open && (
        <form className="cr-tier-form" onSubmit={send}>
          <fieldset disabled={sending}>
            <label className="cr-field">Work email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => { setEmail(event.target.value); setError(''); }} /></label>
            <label className="cr-field">Company<input autoComplete="organization" required maxLength={100} value={company} onChange={event => { setCompany(event.target.value); setError(''); }} /></label>
            <div className="cr-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
            <label className="cr-field">{tier.label}{tier.optional && <span className="cr-caption"> (optional)</span>}<textarea rows={tier.rows} required={!tier.optional} maxLength={tier.max} placeholder={tier.placeholder} value={detail} onChange={event => { setDetail(event.target.value); setError(''); }} /></label>
            <button type="submit" className="cr-button">{sending ? 'Sending…' : error ? 'Retry →' : tier.submit}</button>
            <p className="cr-caption">Sent to the CTRLRun team through Resend, only to answer this request. Please leave out credentials and customer data.</p>
          </fieldset>
          {error && <p role="alert" className="cr-form-error">{error} <a href="mailto:contact@arpanghoshal.com">contact@arpanghoshal.com</a></p>}
        </form>
      )}
    </div>
  );
};
