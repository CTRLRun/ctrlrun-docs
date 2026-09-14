// The email form under "Something bigger is coming." on the homepage. One field, one button.
// Posts to /api/interest with the launch-updates intent; the server decides the subject line
// and that no company is required for this intent, so nothing the browser sends can change that.
// Same idempotency and honeypot pattern as the tier forms: one requestId per filled-in form, a
// hidden "website" field that a person never sees.
//
// ENDPOINT lives inside the component because a snippet exports one binding and module-level
// constants beside it are not in scope when MDX evaluates it.
export const LaunchUpdates = () => {
  const ENDPOINT = 'https://ctrlrun-review-form.vercel.app/api/interest';
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(null);
  const sendingRef = useRef(false);
  const track = name => window.dispatchEvent(new CustomEvent('ctrlrun:conversion', { detail: { name } }));

  const send = async event => {
    event.preventDefault();
    if (sendingRef.current || sent) return;
    if (!requestId.current) requestId.current = crypto.randomUUID();
    sendingRef.current = true; setSending(true); setError('');
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent: 'launch-updates', email, website, requestId: requestId.current }),
        signal: AbortSignal.timeout(15000)
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true || typeof data.id !== 'string') throw new Error(data.error || 'We could not confirm this. Retry, or email contact@arpanghoshal.com.');
      setSent(true); track('launch_updates_submitted');
    } catch (failure) {
      setError(failure.name === 'TimeoutError' || failure.name === 'TypeError' ? 'We could not confirm this. Retrying is safe, or email contact@arpanghoshal.com.' : failure.message);
    } finally { sendingRef.current = false; setSending(false); }
  };

  if (sent) return <p className="ct-notify-done" role="status">Thanks. One email when it lands, nothing else.</p>;
  return (
    <form className="ct-notify-form" onSubmit={send} noValidate={false}>
      <fieldset disabled={sending} className="ct-notify-fields">
        <label className="ct-notify-label" htmlFor="ct-notify-email">Email</label>
        <div className="ct-notify-row">
          <input id="ct-notify-email" className="ct-input" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={event => { setEmail(event.target.value); setError(''); }} />
          <button type="submit" className="ct-button">{sending ? 'Sending…' : error ? 'Retry' : 'Tell me first'}</button>
        </div>
        <div className="ct-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} /></label></div>
      </fieldset>
      {error && <p role="alert" className="ct-notify-error">{error}</p>}
    </form>
  );
};
