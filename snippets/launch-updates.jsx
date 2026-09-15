// The one form on the site: an address, and nothing else.
//
// ctrlrun.dev is a technical site for developers. It carries no pricing, no tiers and no sales
// path, and this is the single place it asks a reader for anything. That constraint is what
// makes the form's shape obvious: email, a honeypot, a button. No company field, no "what do
// your agents do", no qualification. Asking a stranger to describe their deployment before they
// have run `pip install` is how a project that wants users behaves like a project that wants
// leads.
//
// It posts to the same endpoint the site has always used, with `intent: 'launch-updates'`. The
// endpoint decides the subject line and the required fields from that intent and trusts nothing
// else the browser sends, so a new intent is a change in `website-form/api/interest.mjs` and not
// something a page can assert into existence.
//
// **The prose lives in `index.mdx`, not here.** Mintlify renders a snippet on the client, so
// anything drawn in this file is absent from the server-rendered HTML and invisible to a crawler
// or to any fetcher that does not run JavaScript. `commercial-tiers.jsx` learned that the
// expensive way: roughly 190 words of the page's plainest prose were missing from the HTML. Only
// what needs state is in here.
export const LaunchUpdates = () => {
  const ENDPOINT = 'https://ctrlrun-review-form.vercel.app/api/interest';

  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const sendingRef = useRef(false);
  const track = name => window.dispatchEvent(new CustomEvent('ctrlrun:conversion', { detail: { name } }));

  const send = async event => {
    event.preventDefault();
    if (sendingRef.current || sent) return;
    // One id per filled-in form: an uncertain response can be retried without a second email.
    if (!requestId.current) requestId.current = crypto.randomUUID();
    sendingRef.current = true; setSending(true); setError('');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'launch-updates', email, website, requestId: requestId.current }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true || typeof data.id !== 'string') throw new Error(data.error || 'We could not confirm submission. Please retry or email us directly.');
      setSent(true); track('launch_updates_submitted');
    } catch (failure) {
      setError(failure.name === 'TimeoutError' || failure.name === 'TypeError' ? 'We could not confirm submission. You can retry the same request safely, or email us directly.' : failure.message);
    } finally { sendingRef.current = false; setSending(false); }
  };

  if (sent) return <p className="cr-updates-done" role="status">You are on the list. We will write to that address once, when it is ready.</p>;

  return (
    <form className="cr-updates-form" onSubmit={send}>
      <fieldset disabled={sending}>
        <label className="cr-field cr-updates-field">
          <span className="cr-visually-hidden">Email address</span>
          <input type="email" autoComplete="email" required maxLength={254} placeholder="you@company.com" value={email} onChange={event => { setEmail(event.target.value); setError(''); }} />
        </label>
        <div className="cr-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
        <button type="submit" className="cr-button">{sending ? 'Sending…' : error ? 'Retry →' : 'Keep me posted →'}</button>
      </fieldset>
      {error && <p className="cr-tier-error" role="alert">{error}</p>}
      <p className="cr-caption">One address, one email when it ships. Sent through Resend and used for nothing else.</p>
    </form>
  );
};
