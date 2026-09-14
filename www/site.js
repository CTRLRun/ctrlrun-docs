(function () {
  var form = document.getElementById('ct-notify');
  if (!form) return;
  var ENDPOINT = 'https://ctrlrun-review-form.vercel.app/api/interest';
  var button = document.getElementById('ct-notify-button');
  var errorBox = document.getElementById('ct-notify-error');
  var done = document.getElementById('ct-notify-done');
  var fields = form.querySelector('fieldset');
  var requestId = null, sending = false, sent = false;
  function uuid() { return (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); })); }
  function fail(message) { errorBox.textContent = message; errorBox.hidden = false; button.textContent = 'Retry'; }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (sending || sent) return;
    var email = form.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail('Enter a valid email address.'); form.elements.email.focus(); return; }
    if (!requestId) requestId = uuid();
    sending = true; fields.disabled = true; errorBox.hidden = true; button.textContent = 'Sending…';
    var controller = new AbortController(); var timer = setTimeout(function () { controller.abort(); }, 15000);
    fetch(ENDPOINT, { method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ intent: 'launch-updates', email: email, website: form.elements.website.value, requestId: requestId }) })
      .then(function (response) { return response.json().then(function (data) { return { ok: response.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || result.data.ok !== true || typeof result.data.id !== 'string') throw new Error(result.data.error || 'We could not confirm this. Retry, or email contact@arpanghoshal.com.');
        sent = true; form.querySelector('fieldset').hidden = true; done.hidden = false;
        if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('ctrlrun:conversion', { detail: { name: 'launch_updates_submitted' } }));
      })
      .catch(function (failure) { fail(failure.name === 'AbortError' || failure.name === 'TypeError' ? 'We could not confirm this. Retrying is safe, or email contact@arpanghoshal.com.' : failure.message); })
      .then(function () { clearTimeout(timer); sending = false; fields.disabled = false; });
  });
})();
