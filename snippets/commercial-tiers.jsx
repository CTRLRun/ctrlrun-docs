// The two commercial tiers, each with the form its button asks for. The comparison table
// that used to sit under them is gone; the one row a reader acted on -- who does the work --
// is now a line on each card. Pro takes a place on the
// waiting list, so it asks for as little as a place requires; Enterprise is the start of a
// conversation, so it asks what the deployment actually needs.
//
// Both post to /api/interest, which decides the subject line and the required fields from
// `intent` rather than trusting anything the browser sends.
//
// One component, no nested ones: inside an MDX snippet a capitalised tag is looked up in the
// MDX component registry, so a locally defined <TierForm /> resolves to nothing. Only one form
// is open at a time, so a single set of fields serves both.
//
// ENDPOINT and TIERS live inside the component for the same reason: a snippet exports one
// binding, and module-level constants beside it are not in scope when MDX evaluates it.
export const CommercialTiers = () => {
  const ENDPOINT = 'https://ctrlrun-review-form.vercel.app/api/interest';

  const TIERS = [
    {
      intent: 'pro-waitlist',
      name: 'ctrlrun Pro',
      status: 'IN DEVELOPMENT',
      promise: 'Centralized governance for your AI agents.',
      body: 'Connect your agents and workflows, manage policies, investigate activity, and understand operational risk from one dashboard. Built on ctrlrun’s open-source foundation.',
      who: 'Your team, on our dashboard.',
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
      name: 'ctrlrun Enterprise',
      status: 'ENGAGEMENTS OPEN',
      promise: 'AI governance tailored to your deployment.',
      body: 'Everything in Pro, with ctrlrun engineers to design, integrate, and maintain the additional controls your business needs. Custom policies, integrations, deployment options, and insights — scoped to your requirements.',
      who: 'Our engineers, with your team.',
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
  const [open, setOpen] = useState('');
  const [sentIntent, setSentIntent] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [detail, setDetail] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const sendingRef = useRef(false);
  const track = name => window.dispatchEvent(new CustomEvent('ctrlrun:conversion', { detail: { name } }));

  const openTier = tier => {
    setOpen(tier.intent);
    setEmail(''); setCompany(''); setDetail(''); setError('');
    requestId.current = null;
    track(tier.intent.replace(/-/g, '_') + '_opened');
  };

  const send = async (event, tier) => {
    event.preventDefault();
    if (sendingRef.current || sentIntent === tier.intent) return;
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
      setSentIntent(tier.intent); track(tier.intent.replace(/-/g, '_') + '_submitted');
    } catch (failure) {
      setError(failure.name === 'TimeoutError' || failure.name === 'TypeError' ? 'We could not confirm submission. You can retry the same request safely, or email us directly.' : failure.message);
    } finally { sendingRef.current = false; setSending(false); }
  };

  return (
    <div className="cr-tiers">
      {TIERS.map(tier => (
        <div className={open === tier.intent ? 'cr-tier cr-tier-open' : 'cr-tier'} key={tier.intent}>
          <span className="cr-step">{tier.status}</span>
          <h3>{tier.name}</h3>
          <p className="cr-tier-promise">{tier.promise}</p>
          <p className="cr-tier-body">{tier.body}</p>
          <p className="cr-tier-who"><span>Who does the work</span> {tier.who}</p>
          {sentIntent === tier.intent && <p className="cr-tier-done" role="status">{tier.done}</p>}
          {sentIntent !== tier.intent && open !== tier.intent && (
            <button type="button" className="cr-button" onClick={() => openTier(tier)}>{tier.cta} <span aria-hidden="true">→</span></button>
          )}
          {sentIntent !== tier.intent && open === tier.intent && (
            <form className="cr-tier-form" onSubmit={event => send(event, tier)}>
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
      ))}
    </div>
  );
};
