export function renderLabPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Replay Attack Lab</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f4f6f8; color: #16202a; }
    header { padding: 24px 32px; background: #121820; color: white; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    h2 { margin: 0 0 14px; font-size: 16px; }
    p { margin: 0; color: #52616f; line-height: 1.5; }
    header p { color: #c8d2dc; }
    main { padding: 24px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    section { background: white; border: 1px solid #dce3ea; border-radius: 8px; padding: 16px; min-height: 420px; }
    button, select { border: 1px solid #b8c5d1; border-radius: 6px; background: white; padding: 9px 11px; font: inherit; }
    button { cursor: pointer; }
    button.primary { background: #155eef; color: white; border-color: #155eef; }
    button.copy { padding: 5px 8px; font-size: 12px; color: #364656; }
    .stack { display: grid; gap: 10px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .label { font-size: 12px; color: #687786; text-transform: uppercase; letter-spacing: .04em; }
    .block-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #f7f9fb; border: 1px solid #e2e8ef; border-radius: 6px; padding: 10px; max-height: 210px; overflow: auto; font-size: 12px; }
    .result { border-radius: 6px; padding: 10px; font-weight: 700; }
    .accepted { background: #e7f7ee; color: #0c6b3d; }
    .blocked { background: #feecec; color: #a11717; }
    .muted { color: #687786; font-size: 13px; }
    @media (max-width: 980px) { main { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <h1>Replay Attack Lab</h1>
    <p>See how a signed transfer selects a real public corpus fragment, derives a salt, and passes or fails server verification.</p>
  </header>
  <main>
    <section class="stack">
      <h2>Client</h2>
      <button class="primary" id="sign">Sign Transfer</button>
      <div>
        <div class="block-head"><div class="label">Transfer Body</div><button class="copy" data-copy="transfer" aria-label="Copy transfer body">Copy</button></div>
        <pre id="transfer">Not signed yet.</pre>
      </div>
      <div>
        <div class="block-head"><div class="label">Signed Headers</div><button class="copy" data-copy="headers" aria-label="Copy signed headers">Copy</button></div>
        <pre id="headers">Not signed yet.</pre>
      </div>
    </section>
    <section class="stack">
      <h2>Attacker</h2>
      <div class="grid">
        <button data-attack="send_normally">Send Normally</button>
        <button data-attack="tamper_amount">Change Amount</button>
        <button data-attack="tamper_recipient">Change Recipient</button>
        <button data-attack="replay_immediately">Replay Immediately</button>
        <button data-attack="replay_after_expiry">Replay After Expiry</button>
        <button data-attack="wrong_registry_hash">Wrong Registry</button>
      </div>
      <label class="stack">
        <span class="label">Defense Mode</span>
        <select id="mode">
          <option value="stateless">Stateless mode</option>
          <option value="idempotency">Idempotency mode</option>
        </select>
      </label>
      <p class="muted">Tip: sign once, send normally, then replay immediately in idempotency mode.</p>
      <div>
        <div class="block-head"><div class="label">Mutated Request</div><button class="copy" data-copy="mutated" aria-label="Copy mutated request">Copy</button></div>
        <pre id="mutated">No attack run yet.</pre>
      </div>
    </section>
    <section class="stack">
      <h2>Server Defense</h2>
      <div id="decision" class="result">Waiting.</div>
      <p id="explanation">Sign a transfer, then run an attack scenario.</p>
      <div>
        <div class="block-head"><div class="label">Corpus Derivation</div><button class="copy" data-copy="corpus" aria-label="Copy corpus derivation">Copy</button></div>
        <pre id="corpus">No derivation yet.</pre>
      </div>
      <div>
        <div class="block-head"><div class="label">Verification</div><button class="copy" data-copy="verification" aria-label="Copy verification response">Copy</button></div>
        <pre id="verification">No verification yet.</pre>
      </div>
    </section>
  </main>
  <script>
    let signedTransfer = null;
    const pretty = (value) => JSON.stringify(value, null, 2);
    async function copyBlock(id, button) {
      const text = document.querySelector('#' + id).textContent;
      await navigator.clipboard.writeText(text);
      const previous = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = previous; }, 900);
    }
    async function sign() {
      const response = await fetch('/api/lab/sign-transfer', { method: 'POST' });
      signedTransfer = await response.json();
      document.querySelector('#transfer').textContent = pretty(JSON.parse(signedTransfer.request.body));
      document.querySelector('#headers').textContent = pretty(signedTransfer.headers);
      document.querySelector('#corpus').textContent = pretty(signedTransfer.debug.salt);
      document.querySelector('#decision').textContent = 'SIGNED';
      document.querySelector('#decision').className = 'result accepted';
      document.querySelector('#explanation').textContent = 'Client produced signed headers using the selected corpus fragment and HMAC secret.';
    }
    async function attack(scenario) {
      if (!signedTransfer) await sign();
      const response = await fetch('/api/lab/attack', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario, mode: document.querySelector('#mode').value, signedTransfer })
      });
      const result = await response.json();
      const sameSalt = result.clientDebug.salt.publicCorpusSalt === result.serverDebug.salt.publicCorpusSalt;
      document.querySelector('#mutated').textContent = pretty(result.mutatedRequest);
      document.querySelector('#corpus').textContent = pretty({
        client: result.clientDebug.salt,
        server: result.serverDebug.salt,
        sameSalt,
        meaning: sameSalt
          ? 'Client and server derived the same corpus salt, so the request content/context still matches the signed request.'
          : 'Client and server derived different corpus salts because the received request context changed; this breaks the HMAC signature.'
      });
      document.querySelector('#verification').textContent = pretty({ verification: result.verification, replayStatus: result.replayStatus });
      document.querySelector('#decision').textContent = result.decision.toUpperCase();
      document.querySelector('#decision').className = 'result ' + result.decision;
      document.querySelector('#explanation').textContent = result.explanation;
    }
    document.querySelector('#sign').addEventListener('click', sign);
    document.querySelectorAll('[data-attack]').forEach((button) => button.addEventListener('click', () => attack(button.dataset.attack)));
    document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copyBlock(button.dataset.copy, button)));
    sign();
  </script>
</body>
</html>`;
}
