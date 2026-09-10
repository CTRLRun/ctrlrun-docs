export const ExecutionBoundary = () => {
  // Twelve domains, each naming the narrower domains it holds. `includes` is what makes the
  // collapse honest: every name the picker used to list is still here, still searchable, and an
  // older `?domain=Finance` link still resolves through the alias map built from these lists.
  const domains = [
    {
      id: 'fintech',
      real: ['Stripe. The ledger.', 'The card network.'],
      name: 'FinTech & Banking',
      includes: ['Finance', 'Banking', 'Payments', 'FinTech', 'Accounting', 'Fraud Operations'],
      actions: ['Refund customer', 'Transfer funds', 'Issue payout', 'Charge customer', 'Approve withdrawal', 'Freeze account', 'Release transaction', 'Approve invoice', 'Reverse journal entry', 'Disable payment method']
    },
    {
      id: 'insurance',
      real: ['The claims system.', 'The payout run.'],
      name: 'Insurance',
      includes: ['Insurance'],
      actions: ['Issue claim payment', 'Approve claim', 'Change policy', 'Cancel policy', 'Escalate fraud review']
    },
    {
      id: 'healthcare',
      real: ['The scheduler.', 'The patient outbox.'],
      name: 'Healthcare & Life Sciences',
      includes: ['Healthcare Operations', 'Pharmaceuticals and Life Sciences'],
      actions: ['Send patient communication', 'Schedule appointment', 'Cancel appointment', 'Submit authorization workflow', 'Release controlled workflow', 'Trigger regulatory process', 'Update trial workflow status', 'Escalate adverse-event workflow']
    },
    {
      id: 'legal',
      real: ['The signature service.', 'The filing system.'],
      name: 'Legal & Risk',
      includes: ['Legal', 'Compliance', 'Real Estate'],
      actions: ['Send contract', 'Trigger signature', 'Submit filing', 'Send legal notice', 'Change contract status', 'Approve exception', 'Release restricted workflow', 'Send lease', 'Release deposit workflow']
    },
    {
      id: 'retail',
      real: ['The order system.', 'The warehouse.'],
      name: 'Retail & E-commerce',
      includes: ['E-commerce', 'Retail', 'Marketplace'],
      actions: ['Refund order', 'Cancel order', 'Issue store credit', 'Apply discount', 'Modify shipment', 'Change delivery address', 'Release seller payout', 'Suspend seller']
    },
    {
      id: 'travel',
      real: ['The booking system.', 'The airline GDS.'],
      name: 'Travel & Hospitality',
      includes: ['Travel', 'Airlines', 'Hospitality'],
      actions: ['Cancel booking', 'Refund ticket', 'Rebook passenger', 'Modify reservation', 'Upgrade booking', 'Issue travel credit', 'Release compensation', 'Cancel reservation']
    },
    {
      id: 'saas',
      real: ['The billing system.', 'The directory.'],
      name: 'SaaS & Customer Operations',
      includes: ['SaaS', 'Customer Support', 'Enterprise Software', 'Telecom', 'Sales', 'CRM and Revenue Operations', 'Marketing', 'Advertising', 'Communication'],
      actions: ['Refund customer', 'Cancel subscription', 'Apply account credit', 'Delete account', 'Suspend account', 'Change permissions', 'Modify customer record', 'Approve discount', 'Send bulk communication', 'Change ad budget']
    },
    {
      id: 'cloud',
      real: ['The Kubernetes API.', 'Your database.'],
      name: 'Cloud, DevOps & Data',
      includes: ['IT Operations', 'DevOps', 'Cloud Infrastructure', 'Software Engineering', 'CI/CD', 'Data Engineering', 'Machine Learning'],
      actions: ['Deploy production', 'Roll back deployment', 'Delete infrastructure', 'Terminate instance', 'Modify firewall', 'Rotate secret', 'Execute migration', 'Delete dataset', 'Deploy model', 'Merge pull request']
    },
    {
      id: 'security',
      real: ['Okta. The SIEM.', 'Every live session.'],
      name: 'Security & Identity',
      includes: ['Cybersecurity', 'Identity and Access'],
      actions: ['Disable account', 'Revoke session', 'Isolate endpoint', 'Rotate credential', 'Grant role', 'Revoke role', 'Elevate privilege', 'Create privileged account']
    },
    {
      id: 'people',
      real: ['The HR system.', 'The payroll run.'],
      name: 'HR & Payroll',
      includes: ['HR', 'Payroll'],
      actions: ['Send offer', 'Withdraw offer', 'Start offboarding', 'Change employee status', 'Issue bonus', 'Adjust payroll', 'Approve reimbursement', 'Reverse payment']
    },
    {
      id: 'industrial',
      real: ['The machine.', 'The warehouse system.'],
      name: 'Industrial & Supply Chain',
      includes: ['Manufacturing', 'Supply Chain', 'Logistics', 'Procurement', 'Automotive', 'Robotics', 'Energy and Utilities'],
      actions: ['Release batch', 'Stop production workflow', 'Reroute shipment', 'Release inventory', 'Create purchase order', 'Dispatch vehicle', 'Unlock physical access', 'Disconnect service', 'Start machine']
    },
    {
      id: 'public',
      real: ['The case system.', 'The public register.'],
      name: 'Government & Education',
      includes: ['Public Sector', 'Education', 'General Business Operations'],
      actions: ['Approve application', 'Release payment workflow', 'Change case status', 'Update citizen record', 'Enroll student', 'Release certificate', 'Grant access', 'Delete record', 'Approve request']
    }
  ];
  //: Every narrower name, lowercased, pointing at the domain that now holds it, so a link
  //: written when the picker listed forty-eight names still opens on the right one.
  const aliases = {};
  domains.forEach(item => {
    aliases[item.id] = item.id;
    aliases[item.name.toLowerCase()] = item.id;
    item.includes.forEach(name => { aliases[name.toLowerCase()] = item.id; });
  });
  //: Five checks, each with the refusal it raises. The drawing shows all five at once, which is
  //: the point of drawing it: every way this action can be stopped, in one picture.
  const checks = [
    { label: 'Authority', asks: 'Entitled to act at all?', raises: 'ActionDenied' },
    { label: 'Policy', asks: 'Allow, approve or deny these arguments?', raises: 'ApprovalRequired' },
    { label: 'Approval binding', asks: 'Bound to what the person read?', raises: 'ApprovalMismatch' },
    { label: 'Effect reservation', asks: 'Could this already have happened?', raises: 'DuplicateEffect' },
    { label: 'Outcome', asks: 'Did it happen? Do we know?', raises: 'AMBIGUOUS' }
  ];
  const waysIn = [
    {
      step: 'YOU WROTE THE AGENT',
      title: 'Wrap the action',
      body: 'On the function that causes the effect. The agent keeps every tool it had.',
      code: '@ctrlrun.protect("refund.issue",\n    effect="refund:{order_id}")',
      href: '/docs/get-started/quickstart',
      link: 'Quickstart'
    },
    {
      step: 'SOMEONE ELSE WROTE IT',
      title: 'Stand in front of it',
      body: 'The gateway takes the MCP server it already calls. The agent never knows.',
      code: 'ctrlrun gateway \\\n  --upstream http://vendor-mcp:8080',
      href: '/docs/mcp/gateway-in-5-minutes',
      link: 'The gateway'
    },
    {
      step: 'THERE IS NO AGENT',
      title: 'Same boundary',
      body: 'Workers, webhooks and cron jobs retry too. A lost reply looks the same to them.',
      code: '@ctrlrun.protect("invoice.pay",\n    effect="pay:{invoice_id}")',
      href: '/docs/not-only-agents',
      link: 'Without an agent'
    }
  ];
  const ladder = [
    { title: 'Observe', body: 'The boundary goes in. Nothing is refused, and you learn what your agents actually do.', href: '/docs/concepts/observe-mode', link: 'Observe mode' },
    { title: 'Verify', body: 'Your rules run against what was recorded. You see the refusals before anyone feels them.', href: '/docs/verify', link: 'Verify' },
    { title: 'Enforce one', body: 'A person above the threshold, the agent alone below it. One action, not forty.', href: '/docs/concepts/approval-binding', link: 'Approval binding' },
    { title: 'Widen', body: 'Raise the threshold. Add the next action. The receipts are the argument for doing it.', href: '/docs/concepts/receipts-and-evidence', link: 'Receipts' }
  ];
  const stories = [
    { title: 'Support agent, refunds', domain: 'fintech', action: 'Refund customer', line: 'A person approved $500. The agent presents that approval for $5,000.' },
    { title: 'Vendor agent, production', domain: 'cloud', action: 'Deploy production', line: 'The deploy tool is in its list, so it calls it. Nobody is paged.' },
    { title: 'Claims worker, timeout', domain: 'insurance', action: 'Issue claim payment', line: 'The reply never came back. The blind retry is refused.' }
  ];
  const [domain, setDomain] = useState('fintech');
  const [actionIndex, setActionIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const searchRef = useRef(null);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);
  const selected = domains.find(item => item.id === domain) || domains[0];
  const matches = item => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return item.name.toLowerCase().includes(needle)
      || item.includes.some(name => name.toLowerCase().includes(needle));
  };
  const filtered = domains.filter(matches);
  const action = selected.actions[Math.min(actionIndex, selected.actions.length - 1)];
  const money = /refund|funds|payout|payment|charge|bonus|reimbursement|credit|withdrawal|invoice|discount|spend|budget/i.test(action);
  const asked = money ? 'asks for $5,000' : 'asks for every target';
  const approved = money ? 'a person approved $500' : 'one target was approved';
  const effectKey = action.toLowerCase().replace(/[^a-z0-9]+/g, '_') + ':' + (money ? 'txn_4821' : 'rec_4821');
  //: An action name is up to thirty-one characters wide -- `Escalate adverse-event workflow` --
  //: and the box that holds it is not. Break the long ones at the space nearest the middle, and
  //: drop a size where even the longer half would still run past the edge.
  const actionLines = (() => {
    if (action.length <= 20) return [action];
    const middle = action.length / 2;
    let best = -1;
    for (let i = 0; i < action.length; i += 1) {
      const breaks = action[i] === ' ' || action[i] === '-';
      if (breaks && (best < 0 || Math.abs(i - middle) < Math.abs(best - middle))) best = i;
    }
    if (best < 0) return [action];
    // A hyphen stays on the line it ends; a space is consumed by the break.
    const cut = action[best] === '-' ? best + 1 : best;
    return [action.slice(0, cut), action.slice(best + 1)];
  })();
  const actionClass = 'cr-dg-label' + (actionLines.some(line => line.length > 16) ? ' cr-dg-label-sm' : '');
  const track = (name, extra = {}) => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ctrlrun:conversion', { detail: { name, domain: selected.name, action, ...extra } }));
  };
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const match = domains.find(item => item.id === aliases[(params.get('domain') || '').trim().toLowerCase()]);
    if (!match) return;
    setDomain(match.id);
    const index = match.actions.findIndex(item => item.toLowerCase() === (params.get('action') || '').toLowerCase());
    setActionIndex(index >= 0 ? index : 0);
  }, []);
  useEffect(() => {
    if (pickerOpen && searchRef.current) searchRef.current.focus();
  }, [pickerOpen]);
  useEffect(() => {
    if (pickerOpen) document.getElementById('cr-option-' + activeOption)?.scrollIntoView({ block: 'nearest' });
  }, [activeOption, pickerOpen]);
  useEffect(() => {
    const outside = event => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) setPickerOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  const chooseDomain = (id, actionName) => {
    const group = domains.find(item => item.id === id) || domains[0];
    const index = actionName ? group.actions.indexOf(actionName) : 0;
    setDomain(group.id);
    setActionIndex(index >= 0 ? index : 0);
    setQuery(''); setPickerOpen(false); setActiveOption(0);
    track('domain_selected', { domain: group.name });
    if (buttonRef.current) buttonRef.current.focus();
  };
  //: A story does not retell the decision beside the drawing. It sets the drawing.
  const openStory = story => {
    chooseDomain(story.domain, story.action);
    track('story_opened', { domain: story.domain, action: story.action });
    if (typeof document !== 'undefined') document.getElementById('cr-boundary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const questions = {
    fintech: 'Letting agents move or refund money?',
    insurance: 'Letting agents pay or decline claims?',
    healthcare: 'Letting agents act on patient workflows?',
    legal: 'Letting agents send contracts or submit filings?',
    retail: 'Letting agents refund, cancel, or change orders?',
    travel: 'Letting agents rebook, refund, or compensate?',
    saas: 'Letting agents change accounts or permissions?',
    cloud: 'Letting agents change production infrastructure?',
    security: 'Letting agents grant access or disable accounts?',
    people: 'Letting agents change payroll or employee records?',
    industrial: 'Letting agents move stock, dispatch, or start machines?',
    public: 'Letting agents approve applications or change records?'
  };

  return (
    <div className="cr-explorer">
      <section className="cr-movement" id="cr-boundary" aria-labelledby="cr-boundary-title">
        <div className="cr-movement-head">
          <div>
            <p className="cr-step">THE BOUNDARY</p>
            <h2 id="cr-boundary-title">One action. Five ways to stop it.</h2>
          </div>
          <div className="cr-field cr-domain-picker" ref={pickerRef}>
            <span id="cr-domain-label">Your domain</span>
            <button type="button" className="cr-select-button" ref={buttonRef} aria-haspopup="dialog" aria-expanded={pickerOpen} aria-labelledby="cr-domain-label cr-domain-value" onClick={() => { setPickerOpen(!pickerOpen); setActiveOption(0); }}><span id="cr-domain-value">{selected.name}</span><span aria-hidden="true">⌄</span></button>
            <small className="cr-picker-hint">Twelve, holding forty-eight names</small>
            {pickerOpen && <div className="cr-picker-menu" role="dialog" aria-label="Choose your domain" onKeyDown={event => {
              if (event.key === 'Escape') { setPickerOpen(false); buttonRef.current.focus(); }
            }}>
              <label className="cr-sr-only" htmlFor="cr-domain-search">Search domains</label>
              <input id="cr-domain-search" ref={searchRef} type="search" placeholder="payroll, airlines, pharma…" value={query} role="combobox" aria-expanded="true" aria-controls="cr-domain-options" aria-autocomplete="list" aria-activedescendant={filtered[activeOption] ? 'cr-option-' + activeOption : undefined} onChange={event => { setQuery(event.target.value); setActiveOption(0); }} onKeyDown={event => {
                if (event.key === 'ArrowDown') { event.preventDefault(); setActiveOption(Math.min(activeOption + 1, filtered.length - 1)); }
                if (event.key === 'ArrowUp') { event.preventDefault(); setActiveOption(Math.max(activeOption - 1, 0)); }
                if (event.key === 'Enter' && filtered[activeOption]) { event.preventDefault(); chooseDomain(filtered[activeOption].id); }
              }} />
              <div className="cr-domain-options" id="cr-domain-options" role="listbox" aria-label="Domains">
                {filtered.map((item, index) => <button type="button" role="option" id={'cr-option-' + index} aria-selected={selected.id === item.id} className={index === activeOption ? 'cr-option-active' : ''} key={item.id} onClick={() => chooseDomain(item.id)}>
                  <span><strong>{item.name}</strong><small>{item.includes.join(' · ')}</small></span>
                  {selected.id === item.id && <span aria-hidden="true">✓</span>}
                </button>)}
                {filtered.length === 0 && <p role="status">No domain holds that name. Try “payments”.</p>}
              </div>
            </div>}
          </div>
        </div>

        <div className="cr-dg-scroll">
          <svg viewBox="0 0 980 392" className="cr-dg" role="img" aria-label={'The execution path for ' + action + ' in ' + selected.name + ': the agent proposes the action, and the boundary answers with authority, policy, approval binding, effect reservation and outcome, raising ActionDenied, ApprovalRequired, ApprovalMismatch, DuplicateEffect or AMBIGUOUS. Only past all five does the call reach the real system and leave a receipt. An approval returns from a person bound to the same arguments; an unknown outcome returns from reconciliation without running the effect again.'}>
            <title>{action}, and the five checks between the agent and the real system</title>
            <defs>
              <marker id="cr-dg-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" className="cr-dg-headfill" />
              </marker>
            </defs>

            <rect x="4" y="88" width="290" height="124" rx="8" className="cr-dg-zone" />
            <text x="12" y="80" className="cr-dg-zonelabel">YOURS</text>
            <rect x="676" y="88" width="296" height="124" rx="8" className="cr-dg-zone" />
            <text x="684" y="80" className="cr-dg-zonelabel">NOT YOURS TO UNDO</text>

            <rect x="14" y="118" width="96" height="64" rx="6" className="cr-dg-node" />
            <text x="62" y="144" className="cr-dg-eyebrow" textAnchor="middle">THE WORK</text>
            <text x="62" y="163" className="cr-dg-label" textAnchor="middle">A ticket</text>
            <path d="M 116 150 L 142 150" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />

            <rect x="148" y="100" width="136" height="100" rx="6" className="cr-dg-node" />
            <text x="216" y="121" className="cr-dg-eyebrow" textAnchor="middle">YOUR AGENT</text>
            {actionLines.map((line, index) => <text key={line} x="216" y={(actionLines.length > 1 ? 141 : 147) + index * 15} className={actionClass} textAnchor="middle">{line}</text>)}
            <text x="216" y={actionLines.length > 1 ? 174 : 168} className="cr-dg-label" textAnchor="middle">{asked}</text>
            <text x="216" y={actionLines.length > 1 ? 192 : 187} className="cr-dg-aside" textAnchor="middle">{approved}</text>
            <path d="M 290 150 L 312 150" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />

            <rect x="306" y="50" width="340" height="262" rx="8" className="cr-dg-gate" />
            <text x="318" y="74" className="cr-dg-wordmark">CTRLRun</text>
            <text x="634" y="74" className="cr-dg-eyebrow" textAnchor="end">MAY THIS EXECUTE NOW?</text>
            {checks.map((item, index) => {
              const y = 88 + index * 44;
              return (
                <g key={item.label} className="cr-dg-row">
                  <rect x="318" y={y} width="316" height="38" rx="4" className="cr-dg-rowbox" />
                  <text x="330" y={y + 16} className="cr-dg-rowlabel">{item.label}</text>
                  <text x="622" y={y + 16} className="cr-dg-raises" textAnchor="end">{item.raises}</text>
                  <text x="330" y={y + 30} className="cr-dg-aside">{item.asks}</text>
                </g>
              );
            })}
            <text x="634" y="332" className="cr-dg-key" textAnchor="end">{effectKey}</text>

            <path d="M 420 50 L 420 36" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />
            <path d="M 540 36 L 540 50" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />
            <rect x="380" y="4" width="220" height="32" rx="6" className="cr-dg-node" />
            <text x="490" y="25" className="cr-dg-label" textAnchor="middle">A person answers this one</text>

            <path d="M 652 150 L 680 150" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />
            <text x="666" y="138" className="cr-dg-aside" textAnchor="middle">once</text>

            <rect x="688" y="104" width="136" height="92" rx="6" className="cr-dg-node" />
            <text x="756" y="126" className="cr-dg-eyebrow" textAnchor="middle">THE REAL SYSTEM</text>
            {selected.real.map((line, index) => <text key={line} x="756" y={148 + index * 19} className="cr-dg-label" textAnchor="middle">{line}</text>)}
            <text x="756" y="185" className="cr-dg-aside" textAnchor="middle">Cannot tell a retry apart</text>
            <path d="M 830 150 L 852 150" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />

            <rect x="858" y="118" width="100" height="64" rx="6" className="cr-dg-node" />
            <text x="908" y="144" className="cr-dg-eyebrow" textAnchor="middle">RECEIPT</text>
            <text x="908" y="163" className="cr-dg-label" textAnchor="middle">Kept</text>

            <path d="M 756 202 L 756 342" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />
            <rect x="640" y="344" width="240" height="34" rx="6" className="cr-dg-node" />
            <text x="760" y="366" className="cr-dg-label" textAnchor="middle">Ask what happened. Never repeat.</text>
            <path d="M 640 361 L 340 361 L 340 318" className="cr-dg-arrow" markerEnd="url(#cr-dg-head)" />
          </svg>
        </div>

        <p className="cr-dg-note">Two paths come back: an approval <em>bound to the arguments the person read</em>, and an unknown outcome <em>settled without running the effect again</em>. That is the difference between a boundary and a permission check.</p>

        <p className="cr-boundary-note">Example rules, not industry defaults. Nothing here executes.{selected.id === 'industrial' ? ' Software authorization only; physical safety controls stay separate.' : ''}{selected.id === 'healthcare' ? ' Administrative workflows only.' : ''} <a href="/docs/get-started/quickstart">Protect one function in your own code ↗</a></p>
      </section>

      <section className="cr-movement" id="cr-how-it-goes-in" aria-labelledby="cr-goes-in-title">
        <p className="cr-step">GOING IN</p>
        <h2 id="cr-goes-in-title">Three ways in. No rewrite.</h2>
        <div className="cr-ways">
          {waysIn.map(item => <div className="cr-way" key={item.step}>
            <span className="cr-step">{item.step}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <pre><code>{item.code}</code></pre>
            <a className="cr-text-link" href={item.href}>{item.link} ↗</a>
          </div>)}
        </div>
      </section>

      <section className="cr-movement" id="cr-widening" aria-labelledby="cr-widening-title">
        <p className="cr-step">WIDENING</p>
        <h2 id="cr-widening-title">Autonomy is earned in four steps.</h2>
        <ol className="cr-ladder">
          {ladder.map((item, index) => <li key={item.title}>
            <span className="cr-ladder-index" aria-hidden="true">{index + 1}</span>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
            <a className="cr-text-link" href={item.href}>{item.link} ↗</a>
          </li>)}
        </ol>
        <p className="cr-ladder-close">Autonomy widens because the boundary holds, not because the model improved.</p>
        <div className="cr-stories">
          {stories.map(story => <button type="button" className="cr-story" key={story.title} onClick={() => openStory(story)}>
            <strong>{story.title}</strong>
            <span>{story.line}</span>
            <span className="cr-story-go">Draw it above →</span>
          </button>)}
        </div>
        <div className="cr-domain-cta"><strong>{questions[selected.id]}</strong><a className="cr-text-link" href={'/protect-my-agent?domain=' + encodeURIComponent(selected.id)} onClick={() => track('protect_clicked')}>Get a safety review ↗</a></div>
      </section>
    </div>
  );
};
