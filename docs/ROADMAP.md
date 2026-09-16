---
title: "Roadmap"
description: "What each version asked and answered, from the v0.1 kernel to v1.0, and what is deliberately not on the list."
---

Dependency-first: every layer depends on the one below being correct. Milestones ship when their tests pass, not on dates. Nothing below v0.1 is in scope for code today.

Standards rule: integrate first, map second, never claim compliance. A standard appears in a mapping doc only after code touches it and a test proves the guarantee.

Sector rule: every pack cites its sources and ships its `REVIEW.md`. No compliance claims.

Track rule: kernel versions ship correctness; the tracks that ship beside it (packs, templates, mappings, adapters) ship on their own cadence and never block or share a version with the kernel.

## v0.1 — Kernel ✅ shipped

Action · Policy (ALLOW/APPROVE/DENY) · `@protect` · exact-action approval (hash, single-use, expiry) · effect key · SQLite atomic reservation · COMMITTED/FAILED/AMBIGUOUS · receipts + events (JSONL) · CLI · `ctrlrun demo` with four scenarios.

Exit: all acceptance tests in `SPEC-v0.1.md §7` pass; demo < 60 s; README literally true.

Standards: none. `THREAT_MODEL.md` is the only compliance-adjacent claim.

## v0.2 — Zero-friction deployment ✅ shipped

- MCP adapter and `ctrlrun gateway --upstream <mcp server>` so an existing MCP tool server gets CTRLRun semantics with no agent changes.
- OpenTelemetry export of events (align with ACS observability; don't invent a tracing format).
- Webhook approval provider (Slack/Teams/anything that can POST back).
- `ctrlrun inspect <action_id>`.
- Reconciliation hook: `@protect(..., reconcile=...)` resolves AMBIGUOUS automatically, and only where its answer points.
- `examples/` directory with standalone scripts per scenario (`double-refund/`, `approval-mutation/`, `agent-race/`, `approval-replay/`). In v0.1 `ctrlrun demo` is the example; separate scripts earn their keep once there is more than one way to wire CTRLRun in.
- Sector policy templates: `examples/policies/<sector>.yaml` for devops, payments, e-commerce, insurance, healthcare, legal, security, government, hr. Header comment: *"Starting point on the v0.1 kernel. Adapt before use."* Uses only v0.1 primitives. Tier one of the sector-pack content track below.

Adoption story: *existing MCP server + one CTRLRun gateway = action safety.*

**Reconciled against what shipped.** Three things arrived earlier than this file expected, and
one arrived that it did not list:

- The **OWASP ACS adapter** was a v0.3 standards line. Reading the v0.1.0 schemas showed a
  stable enough interface to build against, so it shipped here — with no compliance claim, and
  `docs/ACS.md` recording where the standard is silent.
- **`Suspended` / `Control.resume`** were not on any milestone. MCP elicitation (§6.9) needs a
  reservation held across a round trip the kernel does not control, and so does an advisory
  hook model like ACS. It is public API now, frozen in `SPEC-v0.2.md` §11.
- **Policy `schema: ctrlrun.policy/v2`** grew out of the gateway rather than being planned:
  a tool call has no decorator to carry an effect template.
- **`EventSink`** replaced the store's file writing, which the v0.1 kernel had owned.

Standards: OpenTelemetry export (code), MCP gateway. The OWASP ACS adapter shipped in v0.2 (see `docs/ACS.md`); "ACS-compatible" is still unearned and waits on an ACS conformance suite to measure against.

## v0.3 — Authority ✅ shipped

- Principal abstraction and `IdentityProvider` interface — `StaticIdentityProvider`,
  `HeaderIdentityProvider` in core, `JWTIdentityProvider` in `ctrlrun[identity]`.
- Authority grants: subject, permitted actions, resource patterns, constraints, environments,
  expiry. Opt-in, then fail-closed.
- Delegation with attenuation: `child ⊆ parent`, at creation **and** at every evaluation;
  escalation → DENY. Omission is rejected rather than inherited.
- Fifth signature demo: authority escalation, plus `examples/authority-escalation/` and
  `examples/authority/`.

**Two things were delivered that this line did not anticipate**, and they are recorded here
rather than left as a surprise in the changelog:

- **Observe mode and `ctrlrun stats`.** An enforcement kernel nobody dares turn on is not
  enforcement, so v0.3 ships the rollout path with the model: `mode: observe` runs every real
  decision and records what *would* have been blocked. It was scoped as build-list item 4 once
  the shape of the authority denial made it obvious that operators would need the numbers
  before they would accept the refusals.
- **`ctrlrun verify` exists as a stub that exits 2.** It runs nothing and claims nothing. It is
  here because observe mode's whole purpose is to lead somewhere, and the command an operator
  reaches for next should not be a `No such command` error that suggests they mistyped. The
  real one is v0.4, below, unchanged.

This is the first point at which `VISION.md` was opened for design input, and only §5's
authority-grant shape was taken from it.

Standards: v0.3 **consumes** identities and issues none — no token minting, no OAuth flow, no
authorization server, no introspection. It verifies a JWT (RFC 7519) against a JWKS (RFC 7517)
with RFC 8725's algorithm and explicit-typing rules applied, and it claims no conformance with
any of them. `--principal-from-client-info` is removed, and `AcsControlHook` gained the same
requirement for the same reason: a self-reported name cannot be an authorization input.

## v0.4 — Verification ✅ shipped

- `ctrlrun verify`: runs the kernel's own failure scenarios against the operator's config and reports pass, fail or **not applicable** per guarantee. Ten of them, `ctrlrun.guarantees/v1`: mutated approval · replayed approval · duplicate effect · concurrent reservation across real OS processes · ambiguous blocks a blind retry · unknown action fail-close · no principal · expired authority · delegation escalation on every dimension including omission · unknown exception is ambiguous, never failed.
- **Not applicable is not a pass.** A guarantee this configuration cannot exercise is reported `N/A` with the reason, excluded from the denominator and listed separately. There is no flag that folds one into the count.
- **Every guarantee carries a positive control.** A refusal asserted against a scenario in which nothing ran passes on a kernel with the guard deleted, so a control that misbehaves is `fail` with `reason: "control failed"` — never a pass, and never an N/A.
- Counterexample output on failure: the ordered events, receipts and effect records that show the violation.
- GitHub Action + badge, "CTRLRun verified N/M", where M is **applicable** guarantees. The badge means *declared guarantees pass*, never "this agent is secure."
- `research/framework-probe/`, outside `src/` and never packaged: what an agent stack does with a lost response when nothing guards the effect. Behaviour, not quality.

Exit: every acceptance test in `SPEC-v0.4.md §8` passes, and every one in v0.1, v0.2 and v0.3 still does. `ctrlrun verify` against `examples/authority/payments.yaml` reports 11/11; against `examples/policies/payments.yaml`, 6/6 with five not applicable — the N/A rule dogfooded rather than described.

Standards: first mapping doc — `docs/OWASP-AGENTIC-TOP10.md`, each guarantee mapped to the OWASP Top 10 for Agentic Applications entries it mitigates, and the four entries CTRLRun does not address listed by name. A reading of somebody else's taxonomy, and it says so on its first line.

## v0.5 — Adapter contract (Released 2026-09-05)

- The adapter contract, documented. It is one of the six contracts v1.0 freezes, so it is written to be lived with.
- Two reference adapters, to prove the contract is real rather than aspirational: OpenAI Agents SDK and LangGraph. Each reuses the framework's own HITL primitives — LangGraph's `interrupt()` and checkpointers, the Agents SDK's tool-approval interruption — mapped onto **`ApprovalRequired` / `with_approval`**, which v0.1 has shipped since the kernel. Never a second approval path beside the framework's own. They ship on the adapters track under their own versions like every other adapter; what v0.5 owns is the requirement that two exist and that the contract survived writing them.

  **This line said `Suspended` / `Control.resume` until `SPEC-v0.5.md` was written, and it was wrong.** `Suspended` exists for the remote asking a question *mid-execution*, where the reservation is already taken and must stay taken; an approval gate has none to hold, because v0.1 consumes the approval in the same transaction as the reservation and a human deliberating for an hour must pin nothing. `SPEC-v0.5.md` §3.1 argues it in full. The correction is recorded here rather than made silently, on the rule `SPEC-v0.4.md` §9.4 set for the threat model's sentence about a check verify could not deliver.
- LangGraph and not LangChain, deliberately. LangGraph owns the primitive the adapter reuses, and LangChain's agent path runs on LangGraph, so one adapter covers both. A separate LangChain adapter would buy only the legacy `AgentExecutor` path.

  **Amended 2026-09-16, and the reason is recorded here rather than made silently.** There is a LangChain adapter now, `ctrlrun-langchain` 1.0.0, released 2026-09-15, and the sentence above is still true of the thing it was about. What changed is LangChain: 1.0 added `AgentMiddleware.wrap_tool_call`, whose contract hands the middleware the tool call itself, so `handler` *is* the executor. That is not the legacy `AgentExecutor` path and it is not an approval primitive either; it is a different surface, on which the effect is reserved before the tool runs and committed from what it returned, and a refused call never reaches the tool. An adapter on it is not the second approval path this track forbids, because it routes nothing through an interrupt: it gates the call. The rule that an adapter exists only to reuse a framework's own HITL primitive is amended to say *own primitive*, of which HITL is one kind and a call-wrapping hook is another. `ctrlrun-langgraph` still covers the LangGraph interrupt, and the two are documented as different shapes on the adapters page.
- An adapter is an entry point, so each one is a `SPEC` §4.3.1 row before it is code: principal validity and expiry, then authority, then policy.

Exit: two adapters pass the v0.1 and v0.3 acceptance suites through the adapter surface; and a third is written against the contract alone, in a session that may not read the kernel, because a contract that only its author can implement is not a contract.

Standards: none new.

## Adapters — their own version line

**Three ways in, and only one of them is an adapter.** `@protect` covers anything running in this process, today, with no adapter and no framework support: a raw OpenAI call or a LangChain tool is a decorated function. The gateway covers anything reaching its tools over MCP, in any language, also with no adapter. An adapter exists for one reason — to route an APPROVE through a framework's own interrupt instead of raising past it — so a framework with no human-in-the-loop primitive of its own has nothing for an adapter to reuse and does not need one. That is the answer to "what about X" for every X, and it is why this list is short rather than growing by one each time a framework is named.

Versioned as `adapters-<framework>-MAJOR.MINOR` — `adapters-crewai-1.0`, `adapters-google-adk-1.0` — and never as a kernel version. An adapter answers to two upstreams and neither is this roadmap: it breaks when its framework makes a breaking release, on that project's schedule, for reasons that have nothing to do with what the kernel is doing. Each adapter's README states a supported kernel range and a supported framework range, and its major version tracks whichever of the two forced the break. Each is reviewed in a session that did not write it, on the rule that covers every adapter already.

**The frameworks.** Every adapter is Python and in-process. OpenAI Agents SDK · LangGraph · Google ADK · Microsoft Agent Framework (Python) · Claude Agent SDK (Python) · PydanticAI · CrewAI · Strands Agents · LlamaIndex. The first two are v0.5's references and arrive with the contract; they are on this track and not in that milestone's version, because an OpenAI or LangGraph breaking release is no more a kernel event than a CrewAI one. Each reuses its framework's own approval and interrupt primitives where they exist and reimplements none of them, ships when its own review is clean, and gates no kernel release. The order they arrive in is demand, not this list.

**Everything else.** The contract, so the community writes the rest.

Standards: none of its own.

## v0.6 — Durable runtime ✅ shipped

- Postgres StateStore (cross-host reservation).
- Schema migrations, recovery on restart, policy versioning, receipt integrity — a hash chain, which detects **alteration** and not authorship.

  **This line said "hash chain / signatures" until `SPEC-v0.6.md` was written, and the slash was the problem.** A chain says the log was not altered after the fact; a signature proves origin, and proving origin brings key generation, rotation and revocation with it — which is *issuing*, and this project verifies what it is handed (`SPEC-v0.3.md` §1.1). Signing is out of scope for v0.6 and `SPEC-v0.6.md` §11 argues it, noting that a chain plus an external timestamp or anchor gets most of the benefit without keys, as a v0.8+ option rather than a gap. The correction is recorded here rather than made silently, on the rule `SPEC-v0.4.md` §9.4 set for the threat model's sentence about a check verify could not deliver.
- Control registry and data-scope primitives: the kernel-side objects a sector pack configures, shipped here so that a pack is configuration rather than code.

Exit: the v0.1 concurrency and mutation standard met against a real Postgres on two hosts under failure injection; a published soak with no unexplained AMBIGUOUS and a positive control that fired; a receipt chain tamper test.

**All three are met, and the third was met by amending it rather than by meeting it as written — which is recorded here rather than quietly rephrased.**

- *The concurrency and mutation standard against a real Postgres* — met, with one narrowing stated in item 4's PR and repeated here: it was run as **separate OS processes against one Postgres, with the connection broken by a proxy the tests own**, not as two hosts, because this build environment has no container runtime. Separate processes give separate connections, no shared memory and no shared file locks, which is what `BEGIN IMMEDIATE` was silently relying on and what a second host removes, so the reservation guarantee is exercised. A **network partition between hosts** is not, and stays unclaimed.
- *The receipt chain tamper test* — met. Six cases, each asserting **which** break was reported and **where**; `SPEC-v0.6.md` §6.5 names all six, and §6.4 says what the chain does not cover before saying what it does.
- *A soak with no unexplained AMBIGUOUS* — met, and **the criterion it is measured against was changed on 2026-09-07, downwards.** It read *at least one week of calendar time*, and the week was removed rather than waited out. `SPEC-v0.6.md` §8.1 carries the amendment in full: what was traded, what it costs, and what did not change. In short — elapsed hours were a proxy for the wrong question, since whether an unattributed `AMBIGUOUS` exists is settled by the injection ledger and the positive control and not by the clock; what a week would have bought is whether anything **accumulates**, and that is now unestablished by anything here and is claimed by nothing. The published run is twenty minutes, 889,735 actions, 0 unattributed, control fired, and the duration is printed everywhere the run is quoted so a reader can discount it. **This is a release gate that was relaxed by the person it was blocking, and the honest version of that sentence is this one rather than its absence.**

Standards: `docs/CONTROL-MAPPING.md` — clause-level mapping of receipt integrity/retention to EU AI Act Art. 12 and SOC 2 CC6/CC7, and of exact-action approval to Art. 14. Each row points at a test. Written only when a design partner asks.

## Sector packs — their own version line

Versioned as `packs-<sector>-MAJOR.MINOR` — `packs-payments-1.0`, `packs-healthcare-1.0` — and never as a kernel version. A pack depends on the v0.6 control registry and data-scope primitives and on nothing after them, which is why the track is listed here; it is not a step in the chain. It appears in no kernel milestone's exit criteria, and v0.7 follows v0.6 whether or not a single pack exists.

**Templates (shipped in v0.2).** `examples/policies/<sector>.yaml`, written against v0.1 primitives only, each headed *"Starting point on the v0.1 kernel. Adapt before use."*

**Full depth (after v0.6).** The same nine sectors — devops, payments, e-commerce, insurance, healthcare, legal, security, government, hr — each pack shipping a control registry, approver roles, data scope, consequence defaults, and worked examples. Each pack is authored in one AI session and reviewed in a separate AI session that did not author it, against the cited public sources for that sector (PCI DSS and PSD2 for payments; HIPAA Security Rule for healthcare; SOX/COSO and maker-checker guidance for finance and insurance; ABA Model Rules for legal; NIST SP 800-53 AC/AU families for security; CIS Kubernetes benchmarks for devops; public-sector records-management rules for government; employment-law basics for hr). The review produces `packs/<sector>/REVIEW.md` listing every control, the source clause it derives from, and each gap or uncertainty found; unresolved gaps stay listed. Each pack README states: *"Authored and reviewed by AI against the cited public sources."* No pack describes itself as compliant with any regulation.

Released individually as `packs/<sector>/`, each when its own review is clean. A pack's major version tracks its own breaking changes — a renamed control, a removed approver role, a narrowed data scope — and never the kernel's; a pack and the kernel it runs on are two independent version numbers, and the compatibility statement is a supported kernel range in the pack's README. A pack never gates a kernel release and is never gated by one: nine packs is a list, not a milestone, and eight unwritten packs do not hold up v0.7.

Standards: none of its own. The sector rule above applies in full.

## The operator MCP server ✅ shipped

Not a kernel milestone, and listed here because a reader will look for it. `ctrlrun mcp-operator`
exposes the operator's read and write commands as MCP tools, so the person who has to answer an
approval can answer it from their own assistant. It gates no kernel release and none gates it,
and it lands in whichever release comes next — it is a subcommand of the `ctrlrun` distribution,
so unlike an adapter it carries no version line of its own. `docs/SPEC-mcp-operator.md` is the
contract and `docs/SPEC-v0.3.md` §4.3.1 carries its two entry-point rows.

It authenticates *who* answered and records it. It does not check that they were entitled to —
that is separation of duties, which is still not built, and the specification says so in the
place a reader would otherwise assume otherwise.

Standards: none new.

## `ctrlrun scan` ✅ shipped

Not a kernel milestone, and listed here because the question it answers had no command.
`ctrlrun scan` reads a Python tree and a policy document and reports the consequential call
sites and policy entries CTRLRun is **not** covering — the gap between *installed* and *in the
path*. `docs/SPEC-scan.md` is the contract; it was written first and its §8 tests were red
before any of it existed.

It gates no release and none gates it, and it lands in whichever release comes next. **It is
not a v0.6 feature**, and lands before that tag no more than the operator server does:
`SPEC-v0.6.md` §9.4's claim is about the surface *that milestone* grew, and a subcommand
arriving before the tag does not retroactively make it one. `test_T177c` holds v0.6's list
frozen and names anything added afterwards separately, which is where `scan` sits. Like the operator server it is a subcommand of the
`ctrlrun` distribution and carries no version line of its own; unlike the operator server it
adds no entry point at all, and `SPEC-scan.md` §9.2 states that as a rule rather than a fact
about the first implementation, because the tempting version of this tool builds an action for
each call site it finds and asks the policy what would happen to it — which would be a principal
invented by a tool from a source file.

The honest half is the load-bearing half: a scanner reports what it found where it looked, and
a clean result is not a verdict. §4 enumerates what it misses by construction — dynamic
dispatch, reachability, anything outside the tree, and a deployment whose protection is entirely
the gateway — and requires that the report say so on every run, including the run with no
findings. A number that improves when the vocabulary is shortened is a number that will be, so
there is no score, no percentage and no badge (§10).

Five sections of the specification carry a paragraph beginning *Found by*, and they are the
record of what writing the tests and running the command changed about the design: the plural
rule that separates `stripe.refunds.create` from `refunds_report`; `execute` dropped from the
vocabulary, because `cursor.execute` was 90 of 208 findings against this repository's own
`src/`; a policy action whose decorator supplies its own effect template no longer reported as
missing one; a call on an expression matched rather than filed as undetermined, which took that
list from 216 entries to 10; and `undetermined` removed from the finding kinds it was listed
among and contradicted by.

Standards: none new.

## Agents you cannot modify: no version line (page ✅ shipped, one run owed)

Added 2026-09-11, recorded here rather than left implicit, because the question keeps arriving
in the form "does this work with a WhatsApp agent, a Slack agent, a hosted OpenAI or Claude
agent I only configure". The answer is a property of what already ships, not a feature to build,
and a roadmap that never states it leaves every reader to derive it from `v0.2 §6.3`.

**The claim, worded so it can be tested.** CTRLRun controls any agent whose consequential
actions pass through a tool or an API the operator runs. The agent's code, language, framework
and vendor do not enter into it: the gateway checks a `tools/call` on the wire (v0.2), and
`@protect` checks a call at the endpoint that acts (v0.1). An agent nobody can program, a
no-code builder, a vendor's bot on WhatsApp or Slack, a hosted assistant with a custom
connector, all reach their tools the same way, and that is where the check is. It is the same
sentence the v0.2 adoption story already makes, *existing MCP server + one CTRLRun gateway =
action safety*, with the agent named as the thing that does not matter.

**Where it stops, stated so nobody sells past it.** An action that never leaves the platform,
Meta AI sending a WhatsApp message, Slack's own assistant posting to a channel, passes nothing
the operator runs and is not interceptable by anything, this project included. The way to a
yes there is deployment, not code: remove the platform's built-in capability from the agent,
give the same capability back as a custom tool pointing at the gateway or at a protected
endpoint, and the built-in call has become a gated one. Whether a given platform allows both
halves is a fact about that platform, and the per-platform answers are connector work on the
commercial track below, not kernel work here. Audit logs and event feeds a platform emits after
the fact are observation and are never described as control; the four rules are about what may
happen, and none of them can be kept for an action that has already happened.

**What this track owes, all of it documentation and proof, none of it a guarantee.** A page
beside `not-only-agents` stating the three cases (the agent connects to a tool server you
choose; the agent calls an API you own; the agent uses its platform's built-ins) and the
remove-and-replace pattern: **shipped 2026-09-11** as
[`docs/agents-you-cant-modify`](/docs/agents-you-cant-modify), linked from the home page and
the enterprise deck covers under the line *Works with agents you can and can't modify*, and saying on
the page that the run below has not happened. And one end-to-end run, **still owed**, of a hosted MCP client through a public
gateway (`--allow-remote`, TLS in front, `--identity-jwt` for the principal) to a tool server
that requires OAuth, because `v0.2 §6.3` relays `Authorization` and the `401` challenge
untouched while the tool server's protected-resource metadata names the tool server's URL and
the client connected to the gateway's, and nobody has yet watched a strict client resolve that.
If the run passes it is a cookbook recipe; if it does not, a gateway that publishes its own
resource metadata is a kernel change, and it arrives as its own specification amendment on its
own version line after v1.0, reviewed on its own merits, as the *Beyond v1.0* rule requires.

It gates no release and none gates it. It adds no public name, no flag and no guarantee ID.

Standards: none new. RFC 9728 is consumed by the tool server, not by the gateway, and this
track does not change that unless the run above says it must.

## v0.7 — Execution boundary ✅ shipped

Every guarantee shipped so far is a guarantee about what happens *inside* CTRLRun. But the kernel does not decide whether the remote side acted — an executor does, by raising `NotExecuted` or not. It does not own the clock its leases are measured against, once the store is on another host. It does not know whether the world still looks the way it did when a human said yes. v0.7 asks what the kernel owes at each of those edges.

- **A transport classifier in core.** `FAILED` versus `AMBIGUOUS` is the one decision this project exists to get right, and the kernel does not make it — the user's executor does. The correct rule is already written and already implemented, in the gateway's `outcome.py`: the connection was never established, or the peer said in band and before dispatch that it rejected the request; everything after the first byte is `AMBIGUOUS`. It is reachable today only by installing `ctrlrun[gateway]`, while `@protect` — the surface the README leads with — gets a docstring. One rule, one implementation, reachable from core.
- **Clock-skew detection.** v0.6 moved the store to another host so several hosts could share it; lease liveness stayed on the application clock. Skew is fail-closed and therefore quiet — a host running ahead marks a live reservation `AMBIGUOUS` while its real holder is mid-flight and about to succeed, and nothing names the cause. This makes divergence observable. It does not change how a lease is evaluated.
- **A provider idempotency token**, derived from the effect key *and the attempt number*. Derived from the effect key alone it would be stable across v0.1 §5.4's renewal, and a provider would replay its cached failure for the one retry the kernel permits precisely because the executor proved nothing happened. Its main value is a deterministic handle for reconciliation to observe with — not a licence for anything to act twice.
- **A ceiling on renewal after `FAILED`.** There is none today: an executor that always reports "nothing happened" renews without bound, each dispatch recorded as an ordinary retry. An operator-set policy key, and an amendment to §5.4 written as an amendment. **The key is the operator's and there is no default**: an entry that declares no `max_attempts` renews without bound, exactly as at 0.6.1, and no value of the key means "unlimited". Where an entry does declare one, G15 grades the refusal of a renewal past it.

  **The sentence that stood here said *one human approval plus an executor that always reports "nothing happened" is unlimited dispatches*, and building item 4 proved it wrong in enforce mode. Corrected here rather than quietly rephrased.** One granted approval buys one dispatch: every renewal of an approved action needs a new granted approval, so the human is asked again each time. "Granted" is not always a person (a scripted provider, an automated `wait=True` loop and approvals granted ahead of a gateway all count), and observe mode needs none. The case the ceiling actually exists for is **the action the policy allows outright**, which renews without anyone being asked at all. What the ceiling bounds is that, plus renewals on the `ALLOW` path and the reconcile route; `SPEC-v0.7.md` §5.5 records that an adapter can still put a human in front of an attempt the ceiling will then refuse, which costs a wasted answer and never an execution.
- **Precondition fingerprints.** An approval binds to an action hash and an expiry, and to nothing about the world it was granted against. A human approves a deletion when the balance is zero; thirty minutes later it is not, and the action hash has not moved. The operator supplies a fingerprint, it is hashed through the canonicalizer so raw resource state never reaches a receipt, and it is rechecked before the reservation. **It narrows the window between decision and execution; it does not close it** — the recheck cannot run inside the atomic reservation write, so a residual gap remains, and that sentence appears wherever the feature does.

Exit: `ctrlrun.guarantees/v3` — G12 a byte written and the peer killed is `AMBIGUOUS`, never `FAILED`, by a classifier that observes rather than infers · G13 skew between the store's clock and a host's is named, with a positive control that stays silent when the clocks agree · G14 the provider token changes across a renewal, provably · G15 a renewal past the operator's ceiling is refused · G16 a precondition whose fingerprint has moved is refused before the reservation — each with a positive control, each `N/A` with a reason where the configuration names no ceiling or no fingerprint. And the precondition recheck documented as narrowing everywhere it is described.

**Guarantee IDs assigned on 2026-09-10, and the reason is recorded here rather than made silently.** v0.8 was numbered before v0.7 was, and took G12–G16 and `v3`. `docs/OWASP-AGENTIC-TOP10.md` and `ctrlrun verify` both refer to guarantees by ID, so a milestone without IDs cannot be mapped until someone invents the numbers later — and v0.9 said *three guarantees added* without naming one. IDs now follow version order: v0.7 takes G12–G16 and `v3`, v0.8 moves to G17–G21 and `v4`, v0.9 takes G22–G24 and `v5`. Nothing outside this file referred to the old numbers.

**A2A moved from v0.7 to v0.8 on 2026-09-08, and the reason is recorded here rather than made silently**, on the rule this file already follows for the v0.6 receipt-integrity line and the soak criterion. Multi-agent authority propagation builds on a kernel whose executor boundary is sound. Three of the five items above are weaknesses in guarantees the project already sells — the classifier most of all — and shipping a hop-counting authority model on top of an outcome mapping the primary surface leaves undefended would be building the next floor before the joists. Nothing about A2A changed; only its position.

Standards: none new.

**Renumbered on 2026-09-10, and the reason is recorded here rather than made silently.** The chain below used to run *boundary → multi-agent → hardening → 1.0*, and nowhere in it did the kernel learn who may say yes or how much. An approval is a string somebody typed; a grant limits one action and says nothing about a thousand of them. Both are what a reader means by governance, and the homepage now says *action governance* — so the two milestones that make it true go in, before multi-agent, because propagating authority across hops needs authority that can be bounded and a yes that can be attributed underneath it. Nothing already shipped moves. A2A moves once more, to v0.10, and v0.10 says why. The homepage H1 stays *Execution safety for AI agents* until v0.9 exits; `internal/POSITIONING.md` carries that gate.

## v0.8 — Oversight ✅ shipped

One question: who may say yes, and can the kernel tell?

Today `approver` is a non-empty string, and `ctrlrun delegate --as` is an assertion typed at a shell; the record keeps `created_via` so a reader can tell an act from an assertion, and that is the whole of it. The operator server authenticates who answered and does not check that they were entitled to. `docs/OWASP-AGENTIC-TOP10.md`'s `ASI09` row says so in as many words. v0.8 closes the part of that sentence a kernel can close.

- **The approver is a principal.** Resolved through the v0.3 `IdentityProvider`, never carried as a string. A receipt records the verified principal that granted, and an approval with no resolvable approver is refused — the rule G7 applies to the requester, applied to the other side of the yes.
- **Entitlement from the control registry.** A control (v0.6) names its approver role; an approval from a principal the role does not cover is refused, and the refusal names the control. Omission is not entitlement.
- **Requester ≠ approver**, on the resolved principal and not the string. **M-of-N** requires N distinct verified principals; a second yes from the same principal counts once.
- **Break-glass is a grant, not a flag.** It widens authority, it is recorded like any other grant, it expires, and every action taken under it carries the grant id in its receipt. There is no setting that skips a check.
- **Credential revocation, consumed.** A revoked token is valid until `exp` today and the threat model says so. v0.8 consumes OpenID Shared Signals / CAEP events and refuses a principal whose credential was revoked before its expiry. Consuming only — issuing nothing, running no authorization server, exactly as v0.3.
- **Revocation by selector.** `ctrlrun revoke` takes one id, and the ids are in the events file — `docs/authority.md` says so. During an incident the operation an operator reaches for is *everything this principal issued* or *everything under this grant*, and today that is a script over the events file, written under pressure. v0.8 adds `--by <principal>` and `--under <grant id>`: a query over rows that already exist, each match revoked exactly as one is today — one revocation, one record, idempotent — so a run that stops halfway leaves the rows it reached revoked and the rest untouched, and a second run finishes. Still no `unrevoke`. Added 2026-09-10, because the alternative was building it in the product, and the rule below says the kernel does not gain a primitive for the dashboard's sake — this one is the kernel's, and it was missing.
- **A policy change is a protected action.** A policy diff has a canonical form, so it has an action hash and an effect key; `ctrlrun policy propose` and `approve` put the same exact-action approval around the file that decides everything else, under the approver rules above. Beside it, a **diff replay**: the last N receipts evaluated against the proposed policy, reporting which decisions change. It reports what changes and never whether a policy is too permissive — `SPEC-v0.4.md` §3.9's rule for verify, applied here.

**Does not close.** Whether the human was misled into the yes: a persuaded approver gives a valid approval and the receipt records it as one. And a policy-change approval does not defend against an administrator with write access to the file; the threat model's malicious-administrator line is unchanged.

Do not build: an approval UI · notification delivery (the webhook is the primitive; each destination stays delivery work) · escalation timers beyond expiry · issuing approver credentials · unrevoking · a delegation browser.

Exit: `ctrlrun.guarantees/v4` — G17 unentitled approver refused · G18 self-approval refused · G19 M-of-N with a duplicated principal refused · G20 revoked credential refused before `exp` · G21 an unapproved policy change decides nothing (G17–G21 and `v4` since 2026-09-10; v0.7 says why) — each with a positive control, each `N/A` with a reason on a configuration that names no approver role. The entitlement sentence in `SPEC-mcp-operator.md` is rewritten to say what is then true.

Standards: none new. RFC 8935 and RFC 8936 (SSF push and poll delivery) and CAEP are consumed as code; they appear in a mapping doc only after the test above exists, and "SSF-compatible" is unearned until a conformance suite says otherwise.

## v0.9 — Envelope ✅ shipped

One question: how much, over which records, for which task?

A grant today limits one action — `amount_lte: 5000` — and says nothing about the thousand actions that each pass it. That is the quantitative half of authority, and `VISION.md` §5's "how much" has had no code under it.

- **Consequence budgets.** A metric, a scope and a window, on a grant. Consumed on reserve, held until reconciled: an `AMBIGUOUS` effect keeps its consumption until a human or a hook resolves it, so an agent cannot spend unlimited authority by generating ambiguity, and a `FAILED` one releases it. It was parked as a rate limiter with a correctness hole until that is specified; this is where it is specified, and v0.7's attempt number is what makes "until reconciled" computable.
- **Scope providers.** A resource-ownership precondition through v0.7's fingerprint mechanism: *this record is in this principal's assigned scope*, fetched strictly before the reservation, hashed through the canonicalizer, fail-closed when the provider raises. This is what turns v0.6's data-scope primitive into an enforced one, and it is the bite on the sentence `docs/OWASP-AGENTIC-TOP10.md` currently has to write for `ASI06` — that nothing bites on an identifier an attacker chose.
- **Task-bound authority.** A grant carries a task id and is attenuated by the same `child ⊆ parent` rule on that dimension as on every other. Mechanically one more delegation dimension; it is the object v0.10 propagates, and it shrinks what a hijacked agent can do without anything reading the hijack.

**Does not close.** A budget cannot recall an action already in flight when a window rolls. A scope provider is worth what its source is worth, and the residual gap `SPEC-v0.7.md` states for preconditions — the recheck cannot run inside the atomic reservation write — applies to it unchanged. Task binding limits blast radius; it does not detect a hijack, and `ASI01` stays partial.

Do not build: a consequence taxonomy — a budget names a metric, not a class · compensation or saga · a fleet-wide budget across stores · anything that reads a prompt to decide which task an agent is on.

Exit: `ctrlrun.guarantees/v5` — G22 a budget exhausted by ambiguity refuses the next reserve until reconciled, and releases on `FAILED`, under the v0.6 multi-process standard against Postgres · G23 a scope provider that raises leaves nothing reserved and nothing executed · G24 a task-bound grant is refused on a task it does not name, by name — each with a positive control, each `N/A` with a reason on a grant that carries no budget, no scope, or no task.

**Reconciled against what shipped.** Three things differed from this section, and each is
recorded where it was decided rather than quietly adjusted here.

- **A budget is a metric, a limit and a window.** This section said "a metric, a scope and a
  window", which conflated two of v0.9's three dimensions: a budget bounds an aggregate and a
  scope provider answers about a record, and nothing about the budget is scoped.
- **Scope providers are a second hook, not the precondition mechanism.** This section said they
  would go "through v0.7's fingerprint mechanism". They do not: `SPEC-v0.9.md` §5.2.1 records the
  amendment to `SPEC-v0.7.md` §6.9 and the three mechanical differences that justify it, the
  first being that a precondition answers *has this changed* and a scope answers *is this yours*.
  A deployment may declare both over the same mapping, which is why the scope hash carries its
  own domain tag.
- **Two refusals, not one.** `scope_unavailable` and `out_of_scope` are distinct reasons, because
  a deployment whose scope source is down and one whose agent reached for somebody else's record
  are different incidents, and observe mode reported the wrong one until an independent review
  found it.

The exit criteria are met: `ctrlrun.guarantees/v5`, G22, G23 and G24, each with a positive
control and each `N/A` with a true reason on a configuration that carries no budget, scope or
task. All three PASS on `examples/authority/payments.yaml`, so the milestone's own guarantees are
graded on what this repository ships rather than only on a fixture.

**This is the gate for the category line, and it used to be the gate for the H1.** Recorded 2026-09-12: the H1 moved ahead of v0.9, to *CTRLRun stops AI agents from taking wrong, restricted, or malicious actions in your workflows*, because it states what the shipped kernel does today and claims nothing about authority. *Action governance* still waits: after v0.9 it is true in code, and only then does the category line move up.

Standards: none new.

## v0.10 — Multi-agent ✅ shipped

**Reconciled against what shipped.** Three things differ from what this section promised, and each
is recorded rather than quietly adjusted.

**A hop is a record in the issuer's store, not a token on the wire.** This section said "propagated
across agent hops" without saying how. `SPEC-v0.10.md` §3.2 settles it: what crosses is a
**reference**, two strings in whatever metadata the transport already carries, and the envelope
itself never travels. The budget rule forces it, because charging every ancestor happens in one
transaction. **The cost is that both agents decide against the same store**, and a deployment where
they do not is refused fail-closed rather than approximated.

**Upstream pinning is enforced at the gateway, and refuses in-process.** The row below says a
swapped server "is a `DENY`". It is, at `ctrlrun gateway`, which is the surface that holds the
connection. In-process there is no upstream to observe, so a pinned action refuses on **every**
call with `upstream_unverified`, and the ACS hook refuses such a policy at construction: ACS is
advisory and the platform runs the tool, so the hook holds no connection to pin.

**The first hop is a one-way step.** `SPEC-v0.10.md` §9.3: `created_via` is a closed vocabulary and
the authority walk reads every delegation row before filtering any of them, so a 0.9.x binary
meeting one `hop` row answers `authority_unreadable` for **every action in the deployment**.
Installing 0.10.0 is reversible; creating the first hop is not.

Exit criteria met: `ctrlrun.guarantees/v6` with G25, G26 and G27 each grading `PASS` on
`examples/authority-escalation` and each grading the same under `--only` as in a full run; one
shipped example exercises a hop and one pins an upstream; a two-hop chain charges every ancestor
under the multi-process standard against Postgres; and observe mode reports the refusal enforce mode
raises. The upgrade was checked against the **released** 0.9.0 from PyPI rather than a fixture.

## v0.10 — Multi-agent, as planned

- A2A integration: task-bound delegated authority (v0.9) with limits, expiry, and depth, propagated across agent hops.
- Authority propagation across hops: the envelope a second agent receives is `⊆` the envelope the first agent held, checked at the hop and again at every evaluation, exactly as v0.3 checks a delegation.
- **Upstream identity pinning.** A policy entry may pin the upstream it authorizes — a TLS key, or the hash of an MCP server's advertised tool schema — so a swapped server behind the same name, or a tool whose schema moved under an approved action name, is a `DENY`. The honest slice of `ASI04`: still deciding actions, still never inspecting a package; provenance at large stays out of scope and the OWASP row says so.

**A2A moved from v0.8 to v0.10 on 2026-09-10, and the reason is recorded here rather than made silently** — the second move of the same item, on the same rule as the first. It moved to v0.8 because propagation needs a sound executor boundary underneath it. It moves again because propagation needs two more things underneath it that the chain did not have: authority that can be bounded (v0.9) and a yes that can be attributed (v0.8). A hop-counting model that propagates an unbounded grant approved by a string would be A2A on sand. Nothing about A2A changed; only its position, twice.

Standards: A2A, as code. No conformance claim.

## v0.11 — Evidence · shipped 2026-09-14

One question: can the record be trusted after the fact, and kept?

- **An external anchor for the receipt chain.** The chain detects alteration and says on every page that it does not detect truncation or append — both measured at two statements, undetected, because the head is a row in the same database. v0.11 anchors the head outside the database at an interval (an RFC 3161 timestamp, or an equivalent the operator supplies) so that **anything at or below an anchored `seq` can no longer be removed or altered** without the anchored pair failing to reproduce. An anchor freezes a prefix: **an append is not detected**, because an appended row lands above every anchored `seq`, and nor is a receipt created and destroyed entirely between two anchors. This sentence said "erased or appended" until 2026-09-14, when `SPEC-v0.11.md`'s review ran the cases; §2.4 there is the table, and the named kinds are the anchor's own, not the six chain-break kinds. No keys of its own: it consumes a timestamp and issues nothing, which is why it is here and signing is not. **Built by item 2 on 2026-09-14**, with `G28` grading it and `ctrlrun anchor` running it. CTRLRun ships **no** provider: an RFC 3161 client is a network client, so the operator supplies four calls (`make`, `check`, `latest`, `since`) and `examples/anchored-chain/` shows the smallest one that works. `since()` is the call a review added and the reason the design holds: with `make` and `check` alone, the record of *which* anchors exist lived in CTRLRun's own table, so deleting the newest row there left the older anchor reproducing and the truncation invisible, at a cost of one more statement.
- **Retention and legal hold.** There is no retention policy today and `docs/postgres.md` says so, in the same breath as the reason one is hard to write: deleting receipts from the middle or the end of the chain is detected as a break by design. v0.11 pays that debt: a chain-preserving prune that leaves a checkpoint receipt verifiable across the gap, and a hold that refuses to prune, both recorded as receipts themselves. **v0.9 adds a second growing table and states the invariant rather than the command**: the budget ledger only grows, and `SPEC-v0.9.md` §7.3 says that rows older than the longest window on any budget of a grant cannot affect a future decision, so somebody else's archiving is safe. One caveat travels with it, because the invariant is about decisions and not about evidence: an `AMBIGUOUS` effect older than that window still **holds** a charge the operator surfaces display, so an archiver on a live ledger excludes un-released rows. `ctrlrun stats` reports the row count so the growth is visible before it matters. **Built by item 3 on 2026-09-14**, as `ctrlrun prune` and `ctrlrun hold`, with `G29`, `G30` and `G32` grading it. Two things the build settled that the line above did not say. The ledger rule is **settlement and then a window**, not "un-released": `COMMITTED` holds permanently and only `FAILED` releases, so "un-released" would have been almost every row forever, and a `COMMITTED` row is prunable only **outside** §7.3's window, because pruning one inside it hands back authority nobody granted. And the window is **supplied** on the command line rather than derived: a ledger row carries no window and no limit, those travel on `Charge` from the authority document, and a store that resolved them would be reading the policy.
- **Enforcement coverage.** From what is already written: policy entries never exercised, gateway tools never routed, `@protect` actions never seen. The runtime half of `ctrlrun scan`, under the same rule — a clean result is not a verdict, no score, no percentage, no badge. **Built by item 5 on 2026-09-14** as `ctrlrun scan --coverage`. One correction the build earned: this line said *from events already written*, and the action name is **not on the event**. `ACTION_PROPOSED` carries an `action_hash` and nothing that maps it back to a name, so the answer comes from receipts, which every action that reached a decision leaves — **a denial included**, which is why an action that is always denied counts as exercised rather than as a gap. No new event type and no new column either way, which is what §7 made the test of whether the question was the right one. It does not move the exit code: a number that ranked a deployment would be the verdict this rule forbids, wearing a shell's clothes.
- **One chain, several receipt schemas.** `ctrlrun.receipt/v7` is the schema today, and the rule since `SPEC-v0.3.md` §12.2 is that every reader upgrades before any writer switches, so an older receipt on disk still parses. v0.8 (the verified approver; the grant id under break-glass), v0.9 (budget consumption) and v0.10 (the hop) each add fields and each bump the version, so a chain kept from v0.6 across them holds **five receipt schema versions**: `v3`, which 0.6 wrote, `v4`, which v0.7 added, and `v5`, `v6` and `v7` after it. This sentence has now gone stale twice and is corrected here rather than quietly both times. It said *three shapes* and named `v3` as the schema today, before v0.7's precondition fields bumped it; v0.7's release pass fixed that and left *four* and `v4`, which v0.10's hop field made wrong again. A count of versions in a document is a number that goes stale at every release, which is the argument for reading `receipt.py`'s constants instead. And nothing yet proved that `verify` walks it end to end, hash by hash, each receipt hashed by the rule its own version wrote. **v0.11's item 4 proves it and `G31` grades it, since 2026-09-14.** No new field: the version string already existed. What is new is the proof, and the rule that a receipt whose version the binary does not know is *named* and not reported as a break — the same distinction v0.6 §3.2 draws for a `schema_version` row the binary does not know. **The proof is built from the released wheels rather than from fixtures** (`scripts/five_schema_chain.py`): five environments, `pip install ctrlrun==0.6.1`, `0.7.0`, `0.8.0`, `0.9.0`, `0.10.0`, one store, then this build verifies across the whole thing, because a fixture is only this build's opinion of what 0.6 wrote. One thing that proof got wrong first is worth keeping: run with `PYTHONPATH=src`, the variable is inherited by every child, so all five "released wheels" imported the build under test and the run reported **one** schema version while looking exactly like a pass. The script now strips it and checks, per release, that the interpreter ran from that release's own environment. Added 2026-09-10, proved 2026-09-14.

- **A malformed value in a receipt row blinded every reader of the chain, and one `UPDATE` was enough. Closed by v0.11's item 1 on 2026-09-14.** Found while building v0.7's item 5, deferred there with a written decision, and named here because it is the evidence surface and this is the evidence milestone. A receipt whose *schema label* is unknown, and a receipt carrying an *added key*, were each already reported at their `seq` and left every other row readable. A malformed **value** of a key the schema declares was not: a float among a receipt's `controls` raised out of `Receipt.from_dict`, so `ctrlrun receipts`, `receipts --verify-chain`, `ctrlrun inspect`, `ctrlrun stats` and the operator MCP server's `receipts` and `stats` tools all stopped together, and a single tampered row hid the whole document rather than naming itself. 0.6.1 behaved the same way and v0.7 neither introduced nor widened it. **The fix is `SPEC-v0.7.md` §12.5's second candidate**, a reader that reports per row: `StateStore.receipts()` hands back a `ctrlrun.receipt.UnreadableReceipt` for a row it cannot construct, naming its `seq` and the type of what refused it. `CHAIN_BREAKS` did **not** grow, and §12.5's first candidate is declined with a reason in `SPEC-v0.11.md` §5.1: `content_altered` already names a document that cannot be canonicalized, so a second name would be two names for one break. **Two corrections this entry earned by being implemented.** It listed `G11` among the readers that stop; `ctrlrun verify` grades `G11` against a scratch store it creates and fills itself, which no `UPDATE` reaches, so `G11` was never blinded by an operator's tampered row. And it omitted the operator MCP server, which is a *network* surface: the same one statement took out the remote console as well as the terminal. Added 2026-09-12, closed 2026-09-14.

**Does not close.** Authorship. An anchor proves the log existed in this form at that time; it does not prove who wrote it, and a malicious administrator who rewrites everything before the next anchor is still out of scope. Signed receipts stay off the roadmap for the reason `SPEC-v0.6.md` §11 gives.

Exit criteria met: `ctrlrun.guarantees/v7` with `G28` to `G32` each grading `PASS` and each grading
the same under `--only` as in a full run; `examples/anchored-chain` exercises an anchor and prints
what one does **not** prove; a chain written by the **released** 0.6.1, 0.7.0, 0.8.0, 0.9.0 and
0.10.0 wheels verifies end to end across five receipt schema versions; a prune across a checkpoint
verifies and anchors that checkpoint before deleting anything; a held range refuses to prune; and
two prunes racing under the multi-process standard against Postgres leave no break the store did not
already have. The upgrade was checked against the **released** 0.10.0 from PyPI rather than a
fixture: 0.11.0 migrates the store, the chain verifies across the boundary, and 0.10.0 then refuses
it with `SchemaMismatch` rather than corrupting it.

**Reconciled against what shipped**, because three sentences above were written before the code
existed and two of them were wrong.

- **The anchor detects truncation and NOT append**, and the bullet above said "erased or appended"
  until 2026-09-14. A forged receipt lands at head + 1, above every anchored `seq`, so nothing stops
  reproducing and the next anchor freezes it like any other. `T531` runs a forged append and
  requires both reports to stay clean, so the limit is a tested property rather than a sentence
  somebody has to remember.
- **Enforcement coverage does not come "from events already written."** `ACTION_PROPOSED` carries an
  `action_hash` and nothing that maps it back to a name. It comes from receipts, which every decided
  action leaves, **a denial included** -- so an action that is always denied counts as exercised.
- **`ctrlrun scan --coverage` is the surface**, and `docs/CONTROL-MAPPING.md` is still not written.
  The v0.11 line cited it in the present tense; roadmap line 136 says it is written only when a
  design partner asks, and none has.
- **Retention shipped twice.** The build order made an independent review required for the prune,
  *the one not to skip*, and the merge did not wait for it. The review found seven defects, the
  first of which made a forged checkpoint launderable with one row in the store's own `anchors`
  table, and the fixes went in as a second pull request. `SPEC-v0.11.md` §13.4 records all seven
  and the rule this milestone adds: **a required review is a merge gate, not a step in the item.**

Three surfaces this milestone amends rather than adds to, each named because an amendment to a
frozen surface is not a patch: `StateStore` gains anchor, checkpoint and hold methods
(`SPEC-v0.6.md` §9.2), `StateStore.receipts()` may now hand back an `UnreadableReceipt` instead of
raising, and `verify_chain` seeds from a checkpoint where a store has one. **`CHAIN_BREAKS` is
unchanged and stays closed at six**: the anchor has its own set, because putting its kinds in
`CHAIN_BREAKS` would fail `G11`'s control with `control failed` on every anchoring deployment.

Do not build: a SIEM · dashboards over receipts · a receipt query language · export formats beyond JSON and OTel.

Exit: **the truncation case** that `SPEC-v0.6.md` §6.4 lists as undetected now detects, with the anchor as the positive control and the two-statement attack as the scenario (append is **not** in this criterion, and §2.4 of `SPEC-v0.11.md` says why); a prune across a checkpoint verifies, and the prune's checkpoint is anchored before anything is deleted; a held range refuses to prune; a chain written across **five** receipt schema versions verifies end to end, and the checkpoint receipt of a prune carries the version current when it was written.

Standards: RFC 3161 consumed as code. None claimed.

## v0.12 — Hardening · shipped 2026-09-15

Fuzzing, property tests, concurrency stress, failure injection, upgrade testing, compatibility guarantees, CodeQL/SAST/SBOM/signed artifacts.

**Reconciled against what shipped.** Most of the line above was already true when v0.12 opened: fuzzing (`fuzz.yml`), CodeQL, signed artifacts (trusted publishing with PEP 740 attestations), concurrency stress (`test_soak.py` and the multi-process standard), failure injection (`tests/failure_injection.py`) and upgrade testing against released wheels all shipped in earlier milestones. What was genuinely missing was **property tests** and an **SBOM**, and both are here.

**Benchmarks are struck from this line rather than deferred.** `docs/postgres.md` withholds a throughput figure on purpose and `production/soak.mdx` says three times that its number is not one to plan against. A benchmark suite manufactures exactly the figure those two pages decline to give, and the first thing anyone would do with it is quote it. There is no performance claim in this project to defend, and a test is owed by a claim. If one is ever made, this is where its benchmark goes.

**Compatibility guarantees stay open** and belong to v1.0's *stable has an operational definition*, which is the same document under another name.

- **The import cycle is closed, and §6's rule is a test.** Broken in two places, neither of which was the pair the line above predicted. `Decision` and `POLICY_UNAPPROVED` moved to `ctrlrun.decision`, which imports nothing from the package; then the policy **document grammar** moved to `ctrlrun.grammar`, so `authority.py` no longer imports `policy.py` at all. `SPEC-v0.3.md` §4.5's requirement that the two axes share **one** condition evaluator is better served than before: it is now owned by neither axis. **No public name moved** -- `policy.py` re-exports all thirty-four, so §8's frozen block is unchanged, and this was therefore not the public-surface question the line assumed. `tests/test_module_graph.py` asserts both the import-order and the layering graph are acyclic, and its allow-list of recorded exceptions is **empty**. Writing that guard found a second cycle nobody had recorded. Closed 2026-09-15.

**An external security review is optional and gates nothing, decided 2026-09-10.** It was a line in the list above and a sentence in v1.0's exit; both are gone. A review by a third party is bought, scheduled and scoped by whoever pays for it, and a milestone that waits on a purchase is a milestone with a date nobody on this project controls. If one happens, its scope names the approver path (v0.8) explicitly, because it is the surface a product selling action governance is attacked through, and its report is published beside `docs/how-this-is-built.md` with what it did and did not look at. Until then that page says what has and has not been reviewed, which is the same sentence it says today.

Standards: none new.

## v1.0 — Stable contracts

1.0 means stable contracts, not feature count: Action schema, Receipt schema, effect semantics, Policy API, StateStore API, Adapter API — and, added on 2026-09-10, the **Grant schema** (v0.3, which a product selling action governance cannot leave unfrozen) and the **Approval record schema** (v0.8). Eight. MCP production-grade. Authority model documented. Threat model published. Upgrade path tested. An external security review, if one has happened, published; if not, `docs/how-this-is-built.md` says so, and 1.0 does not wait for it.

**Stable has an operational definition, and it ships as a document beside the eight — added 2026-09-10.** For each contract: what counts as a breaking change and what does not (a new optional field is not; a field whose meaning moves is), how long a deprecated field is still read after it stops being written, and which receipt schema versions a 1.x `verify` walks. The rule already in force for receipts — every reader upgrades before any writer switches (`SPEC-v0.3.md` §12.2), proven across versions by v0.11 — is the model; 1.0 writes it down for the other seven. Without it *stable* is a mood, and a customer keeping receipts across a 1.x upgrade is holding evidence with no stated shelf life.

Standards: an EU controls pack, phrased as "technical controls supporting a compliance program" and written when a design partner asks. It does not wait for an external review, and it is not one.

**`docs/OWASP-SOLUTIONS-LANDSCAPE.md`, added 2026-09-10.** The OWASP GenAI Security Project's Agentic Solutions Landscape scores a solution on nine lifecycle stages, the ten `ASI:26` entries and some forty capability checkboxes. The page reads that checklist against v1.0, one row per checkbox in the form's own wording, each *Yes* or *Partly* pointing at a guarantee or a command and each *No* given its one-sentence reason; every row that depends on `G12`–`G24` prints the version it waits on. It is the third document the docs lint exempts by rule, beside the Agentic Top 10 reading and the threat model, for the same reason: it exists to list what is not covered. A submission to the landscape is filled in from that page and from nothing else, so a box ticked on the form with a *No* row here is the form being wrong, and the page is regenerated when the guarantee catalogue changes, when a version it names is tagged, and when OWASP revises the form. It claims no listing, no endorsement and no conformance: OWASP says it endorses nothing, and this project's standards rule says the same from the other side.

## Pro and Enterprise: the commercial layer, its own line

**What the marketing surfaces promise, recorded here so the kernel and the sales pages stop disagreeing.** `ctrlrun.dev`, `/protect-my-agent` and `enterprise.ctrlrun.dev` sell two things around the boundary, both closed source: **ctrlrun Pro**, a managed product for centralized governance, and **ctrlrun Enterprise**, Pro plus a scoped engineering engagement. None of it ships in the `ctrlrun` wheel, none of it gates a kernel release, and none of it sits on a kernel version line. The wording every surface uses is "built on ctrlrun's open-source foundation" — never that the managed layer is itself open source.

| Promised on a marketing surface | Where | Status against shipped code |
|---|---|---|
| Policies and approvals managed from one dashboard | Pro card on `/`, `/protect-my-agent`, adopt deck | Not built, and labelled *in development* on every surface. It is the management plane the *Beyond v1.0* line keeps off this roadmap — deliberately, because it is built on the closed-source track. |
| Activity investigated across agents from one place | Pro card, `/protect-my-agent`, adopt deck | Partly shipped. The receipt chain and `OTelEventSink` (v0.2) are the primitives; tenant-aware ingestion, indexing, retention and the views above them are product work. |
| Operational risk understood across connected agents | Pro card, adopt deck | Not built. It reads receipts, writes nothing and decides nothing. |
| A supported set of maintained connectors | Pro card, `/protect-my-agent` coverage table | Partly shipped. The MCP gateway (v0.2), the adapter contract (v0.5) and `WebhookApprovalProvider` are the primitives; managed connection lifecycle, health and compatibility support are product work. |
| Approvals in the tools a team already uses | `/protect-my-agent`, adopt deck | Partly shipped. `WebhookApprovalProvider` (v0.2) is the primitive; each destination is delivery work. |
| Custom policies, integrations and deployment options | Enterprise card on `/`, `/protect-my-agent`, adopt deck | Not built as library code, and not intended to be. Per-engagement delivery work scoped to one deployment. |
| Connections to payment and ledger systems | adopt deck, automotive use case | Not built. Per-deployment integration work, never a library module. |

**The rule that keeps this honest.** Every row is either a service delivered around the boundary or a layer sold separately. A row moves onto a kernel version line only when it becomes library code with tests, and at that point it stops being a commercial row. Nothing here is described as shipped, on any surface, before that happens. An availability label is part of the claim: *in development* and *engagements open* are the two the surfaces use, and neither may become *available* on a page before it is true in code.

**Two rows left the table on 2026-09-10** rather than being reclassified, because the surfaces stopped promising them: prompt-injection checks (it reads the prompt, and the kernel decides the action) and an HTTP API. If either returns to a sales page it returns to this table first.

## Beyond v1.0

A management plane — organization-wide policy, approval center, fleet views, central evidence — is not on this roadmap. It gets built only if users pull toward it, and `VISION.md` describes the shape it would take.

**This roadmap covers the open-source kernel, and only that.** The ctrlrun Pro dashboard is a separate, closed-source product built around the boundary; it is not a kernel deliverable and never appears on a version line here. That is not a contradiction with the paragraph above — it is the same decision seen from two sides. A management plane stays off this roadmap *because* the managed one is commercial work, and the kernel is not shaped to make a product possible.

What the split costs is a rule, and the rule is the point: **the kernel gains nothing in order to serve the dashboard.** If the product ever needs a primitive the library does not have, it arrives here as its own specification amendment on its own version line, reviewed on its own merits, exactly as any other kernel change would be. Receipts stay portable JSON so the evidence a customer keeps works with or without the product, which is what makes the two tracks separable at all.

**`Receipts are portable JSON. No dashboard. No web UI.` therefore stays binding in full** — for this repository, which is the only thing it has ever governed.
