---
title: "OWASP Agentic Solutions Landscape"
description: "A reading of the OWASP Agentic Solutions Landscape checklist against what ctrlrun 0.12.2 ships, with the boxes it does not tick named."
sidebarTitle: "OWASP Solutions Landscape"
---

This is a **reading** of somebody else's checklist against the guarantees ctrlrun tests. The
OWASP GenAI Security Project keeps a directory of solutions for agentic applications, and its
submission form scores a solution on nine lifecycle stages, the ten entries of the Agentic Top
10, and about forty capability checkboxes. This page says which of those ctrlrun can honestly
tick, which it can tick in part, and which it cannot. One row per checkbox, in the form's own
wording, each pointing at a guarantee, a command or a document.

It is not a listing claim, a conformance claim, or an endorsement. OWASP states that it does
not endorse or recommend products or services, and a directory entry is a directory entry.
Most of the boxes below are not ticked, and that is the half that makes the ticked ones
credible.

---

## What was read, and against which version

| | |
|---|---|
| **Document** | AI Security Solutions Landscape, Agentic solution submission form |
| **Publisher** | OWASP GenAI Security Project, OWASP Foundation |
| **Form** | [https://genai.owasp.org/solution-submission-agentic/](https://genai.owasp.org/solution-submission-agentic/) |
| **Read on** | 2026-09-10 |
| **Written against** | ctrlrun **0.12.2**, guarantees `G1`–`G32`, catalogue `ctrlrun.guarantees/v7` |

**Written against what is tagged, and the version is printed on every row that needs one.**
Every guarantee cited below is in the catalogue `ctrlrun verify` runs today, `G1` through
`G32`, and every one of them is in the 0.12.2 wheel. **There are no design rows.** A *Since*
column names the milestone that added the row rather than a separate download: 0.3.0 was
published to TestPyPI alone, and what it added reached PyPI inside 0.4.0. This page was first written against an unreleased 1.0 and marked the rows that waited
on it; none of them waits any longer, and the hedge came out rather than being left to read
as a disclaimer on rows that ship. Nothing here is ticked on the strength of something
unreleased, and a row whose guarantee loses its test goes back to *No* in the same commit.

The form's entry codes are `ASI01:26` through `ASI10:26`, the same 2026 edition the
[OWASP Agentic Top 10 reading](/docs/OWASP-AGENTIC-TOP10) was written against; that page
records how the ten titles were derived and asks anyone holding the published PDF to check
them.

**Three words.** *Yes* means a guarantee or a shipped command does what the checkbox says, and
the row names it. *Partly* means ctrlrun does a stated part of it, and the row says which part
it does not. *No* means nothing in ctrlrun addresses the box, and the reason is one sentence.

---

## Lifecycle stages

The form asks which stages of the agent lifecycle a solution covers. ctrlrun is a library that
sits at one point, between the decision to act and the call that acts, so it reaches most
stages from that one point rather than covering each in its own right.

| Stage | Status | What ctrlrun has there | Since |
|---|---|---|---|
| Scope & Plan | Partly | A published threat model of the execution boundary ([THREAT_MODEL](/docs/THREAT_MODEL)), and a policy document that *is* the plan for what an agent may do. Nothing that models *your* agent for you. | v0.1 |
| Develop & Experiment | Yes | `@protect` on any function in the process; `ctrlrun scan` reports the consequential call sites a policy does not cover, and `ctrlrun scan --coverage` reports what a store shows was declared and never exercised. Both are lists with reasons, not scores. | v0.1, scan since v0.6, coverage since v0.11 |
| Augment & Fine Tune Data | No | ctrlrun never touches training data, models or memory. | none |
| Test & Evaluate | Yes | `ctrlrun verify` runs the kernel's own failure scenarios against your configuration and reports pass, fail or **not applicable** per guarantee ([verify](/docs/verify)). | v0.4 |
| Release | Yes | The `ctrlrun verify` GitHub Action and badge as a release gate; the badge means *declared guarantees pass*, never "this agent is secure by inspection". | v0.4 |
| Deploy | Yes | The MCP gateway in front of an existing tool server; framework adapters; observe mode to roll out without refusing anything yet. | v0.2, v0.3 |
| Operate | Yes | Exact-action approvals; `ctrlrun resolve` for an `AMBIGUOUS` effect; the operator MCP server; break-glass as a recorded grant; `ctrlrun revoke --by` / `--under`. | v0.1, v0.8 |
| Monitor | Yes | Receipts on a hash chain with an external anchor; OpenTelemetry export; `ctrlrun stats`; enforcement coverage from events already written; a retention pass that refuses rather than warns, `ctrlrun prune` and `ctrlrun hold place`. | v0.6, v0.11 |
| Govern | Yes | Authority grants and delegation that cannot escalate; approver entitlement; consequence budgets; task-bound authority; a policy change as a protected action. Action governance, in the one sense the [roadmap](/docs/ROADMAP) permits: what an action is allowed to do, not how an organisation runs its agents. | v0.3, v0.8, v0.9 |

---

## Capabilities, checkbox by checkbox

The wording in the first column is the form's, quoted so a reviewer can match rows without
translation. Where the form names a technology as an example (*e.g., Sigstore, Immudb*), the
example is theirs and is not a claim that ctrlrun uses it.

### Scope & Plan

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Support for Gen AI Security Project - Agentic Security Threat Modeling Approach | No | ctrlrun publishes its own threat model of one boundary. It does not implement or support the project's modelling approach. | none |
| Conducting Agentic Threat Modeling | Partly | [THREAT_MODEL](/docs/THREAT_MODEL) is a threat model *of ctrlrun*: what it refuses, and the four things it states as out of scope: a compromised host, a malicious administrator, a lying remote, code that bypasses the decorator. It is a worked example, not a tool. | v0.1 |
| Draft policy Agent for tool scopes | Yes | The policy document is the list of actions an agent may propose, with conditions; anything not in it is refused (`G6`). Starting-point policies ship under `examples/policies/`, each headed *adapt before use*. | v0.1 |
| Identify system-wide non-human Identities & Auth Protocols | No | ctrlrun consumes a principal from an `IdentityProvider` and issues nothing. It has no inventory of identities. | none |
| Draft policy for Agent privilege boundaries | Yes | An authority grant names a subject, permitted actions, resource patterns, constraints, environments and an expiry; opt-in, then fail-closed (`G7`, `G8`). | v0.3 |
| Draft policy for delegation logic | Yes | A delegated grant is valid only as a subset of its parent on every dimension, checked at creation and on every evaluation; omission is rejected, not inherited (`G9`). Task binding adds one more dimension (`G24`). | v0.3, v0.9 |
| Define controls for memory scoping, isolation & long-term persistance | No | ctrlrun never reads or writes an agent's memory. | none |

### Develop & Experiment

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Perform SAST/DAST on agent planning code, tool wrappers, & plugin interfaces | Partly | `ctrlrun scan` reads a Python tree and reports the consequential call sites and policy entries ctrlrun is *not* covering, and since v0.11 `--coverage` adds the runtime half: what the store shows was declared and never exercised. It is a coverage scanner, not a vulnerability scanner, and its report says what it misses by construction on every run. **Neither half produces a number**: a policy entry nothing exercised may be correctly unused, and saying otherwise would be grading the operator's document. | v0.6, v0.11 |
| Harden agent loop logic against infinite loops, unsafe function routing, & unauthorized self-modification | Partly | A retry loop cannot turn one intended effect into several (`G3`, `G5`), an unknown action is refused (`G6`), and renewal after `FAILED` has an operator-set ceiling (`G15`). Nothing here inspects loop logic or prevents self-modification. | v0.1, v0.7 |
| Validate connector (e.g., MCP) contracts (input/output schemas & permissions) | Partly | The gateway maps every MCP tool call onto a policy decision, and a policy entry may pin the upstream it authorises, by the SHA-256 of the server's leaf certificate or by the hash of a tool's advertised schema: a tool whose schema moved under an approved action name is refused `upstream_mismatch`, and an upstream nothing observed is refused `upstream_unverified` and never admitted (`G27`). Enforced by `ctrlrun gateway`, the surface that holds the connection; in-process there is no upstream to observe. It does not validate schemas in general. | v0.2, v0.10 |
| Implement policy enforcement hooks in Frameworks (e.g. LangGraph, CrewAI, Others) | Yes | `@protect` for anything in-process; the adapter contract with OpenAI Agents SDK and LangGraph reference adapters, each routing an `approve` through the framework's own interrupt; the OWASP Agent Control Standard adapter ([ACS](/docs/ACS)). | v0.1, v0.2, v0.5 |

### Augment & Fine Tune Data

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Detect usage of poisoned models in training pipelines | No | Out of scope. | none |
| Apply PII & Sensitive data masking injected into agent components | No | Out of scope. Raw resource state never reaches a receipt, because a precondition fingerprint is hashed through the canonicalizer, but that is evidence hygiene, not masking. | none |
| Apply differential privacy or obfuscation on sensitive data injected into agent memory | No | Out of scope. | none |
| Data masking on structured data | No | Out of scope. | none |
| Agent Action Audit | Yes | Every consequential action leaves a receipt naming the principal, the action hash, the decision, the approval and the outcome; `ctrlrun inspect <action_id>` reads one; the chain detects alteration (`G11`) and, with the external anchor, truncation (`G28`). An **append is not detected**: it lands above every anchored `seq`, so no anchored pair stops reproducing. | v0.1, v0.6, v0.11 |

### Test & Evaluate

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Agent Penetration Testing | No | ctrlrun tests its own guarantees against your configuration. It does not attack your agent. | none |
| Adversarial red-teaming: goal drift, prompt injection, hallucination chaining, & over-permissioned tool usage | Partly | `ctrlrun verify` exercises mutated and replayed approvals, races across OS processes, escalation on every delegation dimension and a blind retry after a lost response. Over-permissioned tool use is what `ctrlrun scan` and observe mode measure. Nothing here reads a prompt or drifts a goal. | v0.4, v0.3 |
| Multi-agent scenario simulations for collusion, misalignment, or deception detection | No | Out of scope. | none |
| Validate agent decisions against expected goal plans | No | ctrlrun never sees the plan. It decides actions. | none |
| Sandboxed testing of all tool calls, code execution, cloud API triggers | No | `verify` runs against fake remotes that count their calls; it is a test of the kernel, not a sandbox for your tools. | none |
| Available Agent Scanning | Partly | Static: `ctrlrun scan`, the gap between *installed* and *in the path*. Runtime: enforcement coverage from events, meaning policy entries never exercised, gateway tools never routed, `@protect` actions never seen. No score, no percentage, no badge, by rule. | v0.6, v0.11 |

### Release

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Generate & verify model + agent + tool SBOMs - shared responsibility | No | ctrlrun ships its own SBOM and signed SLSA provenance for its own releases. It generates nothing for your agent. | none |
| Register all agents in an internal trust registry | No | A grant names a subject; there is no registry of agents. | none |
| Sign model weights, plugin manifests, & memory snapshots | No | Out of scope. | none |

### Deploy

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Apply & manage runtime Guardrails | Partly | Policy at the tool call decides `allow`, `approve` or `deny` for every consequential action, and observe mode reports what would have been refused before anything is. Not input or output filtering, and not moderation; the [comparison page](/docs/compare/guardrail-libraries) says where the line is. | v0.1, v0.3 |
| Rotate all shared secrets, keys, & tokens with ephemeral, scoped credentials | No | ctrlrun issues no credentials and rotates none. | none |
| Enforce zero-trust policies between agents, tools, & external APIs | Yes | Every action carries a verified principal or does not run (`G7`); authority is evaluated on every action against the clock (`G8`); an unknown action is refused (`G6`); the gateway applies all of it to a tool server that has no idea ctrlrun exists. Between agents: the envelope a second agent receives is a subset of the first agent's, checked at the hop and on every evaluation. | v0.1, v0.3, v0.10 |
| Configure Inter-agent authorization policies, capabilities, & roles | Yes | Delegation with attenuation (`G9`), task-bound authority (`G24`), authority propagated across A2A hops with depth and expiry, and approver roles from the control registry (`G17`). | v0.3, v0.8, v0.9, v0.10 |

### Monitor

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Audit reflection accuracy by comparing stated & observed planning outcomes | No | ctrlrun never sees a plan or a reflection. | none |
| Use immutable logs (e.g., Sigstore, Immudb) for forensic readiness | Partly | Tamper-evident, not immutable. Each receipt hashes the one before it, so alteration, deletion and reordering are reported by name and by `seq` (`G11`); the head is anchored outside the database through a provider **you** supply, since ctrlrun ships none, so a suffix erased at or below an anchored `seq` is detected (`G28`) and the window you are exposed to is your own anchoring interval. Retention does not quietly break it: `ctrlrun prune` removes a prefix and leaves a checkpoint the reader seeds from, so the chain verifies across the gap, it refuses rather than warns and has no `--force` (`G29`), an honest prune leaves the anchors reproducing (`G32`), and a range under `ctrlrun hold place` refuses to prune at all, with the hold named (`G30`). Receipts are not signed, and the chain says nothing about who wrote it. | v0.6, v0.11 |
| Alert on anomalies; e.g., goal reversal, unexpected plan depth, adversarial-input, excessive tool usage, or rapid inter-agent chatter | Partly | Excessive use is refused rather than alerted on: a consequence budget on a grant is consumed on reserve and held until an `AMBIGUOUS` effect is reconciled (`G22`), and every refusal is an event on the sink your alerting reads. ctrlrun ships no alerting and sees no plan or prompt. | v0.2, v0.9 |
| Correlate telemetry from agent step tracing, tool execution, & message logs | Yes | The OpenTelemetry sink opens one span per action carrying `ctrlrun.action_id`, `ctrlrun.effect_key` and `ctrlrun.approval_id`, and the receipt carries the same `action_id`, so a tool-execution span joins an agent trace and a receipt on one identifier ([export guide](/docs/guides/export-to-opentelemetry)). | v0.2 |

### Operate

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| LLM Incident Detection & Response | Partly | Response, not detection: `ctrlrun revoke --by <principal>` and `--under <grant id>` cut everything a principal or a grant issued, idempotently; `ctrlrun resolve` settles an `AMBIGUOUS` effect; break-glass is a recorded, expiring grant, never a flag that skips a check. | v0.3, v0.8 |
| Continuously scan loaded plugins for CVEs & privilege escalation vectors | No | ctrlrun never inspects a package. | none |
| Runtime guardrails & moderation; anomalous tool use | Partly | An action outside the policy or outside the grant is refused, by name. No moderation, and no model of what is anomalous beyond *not permitted*. | v0.1, v0.3 |
| Monitor agent memory mutation patterns for drift | No | Out of scope. | none |
| Detect task replay, infinite delegation, or hallucination loops | Partly | A replayed approval is refused (`G2`), a duplicate effect is refused (`G3`), delegation carries a depth limit across hops, and a task-bound grant is refused on a task it does not name (`G24`). Hallucination loops are not detected; their consequential actions are refused. | v0.1, v0.9, v0.10 |
| Enable human-in-the-loop (HITL) override thresholds on high-risk or ambiguous actions | Yes | An `approve` decision with a condition such as `amount_gt`; the approval bound to the exact action the human saw, single-use, expiring (`G1`, `G2`); an `AMBIGUOUS` effect that only a human or a reconciliation hook may leave (`G5`); and where the deployment configures an approver identity, the approver a verified principal who is entitled, not the requester, and counted once under M-of-N (`G17`–`G19`), with a threshold above one denied outright where it configures none. | v0.1, v0.8 |

### Govern

| Checkbox | Status | What it means here | Since |
|---|---|---|---|
| Enforce role- & task-based access policies across agent populations & their tool access | Yes | Grants and delegation per principal (`G7`–`G9`), approver roles from the control registry (`G17`), task-bound authority (`G24`), and a budget per grant (`G22`). *Across populations* is per principal and per grant; a fleet-wide budget across stores is on the roadmap's do-not-build list. | v0.3, v0.8, v0.9 |
| Align control evidence with frameworks like EU AI Act, NIST AI RMF, & ISO/IEC 42001 | No | Receipts are the evidence and they are portable JSON. No mapping document from a guarantee to a clause of any of those frameworks exists at 1.0; the roadmap says one is written when a design partner asks. This box stays empty until that document exists and each row of it points at a test. | none |
| Automate goal alignment audits, including adversarial review of long-term agent memory | No | Out of scope. | none |
| Automate agent versioning, expiration, & rotation policies | Partly | A grant expires and the action it covered is denied on the next proposal (`G8`); a credential revoked before its `exp` is refused via Shared Signals / CAEP events, consumed and never issued (`G20`). No agent versioning and no rotation. | v0.3, v0.8 |

---

## Agentic Top 10 coverage

The form asks for `ASI01:26` through `ASI10:26` as ten checkboxes. The
[Agentic Top 10 reading](/docs/OWASP-AGENTIC-TOP10) carries the row-by-row mapping and the
sentence for each entry saying what is *not* covered; this table is the summary at 0.12.2,
with the version that moved each entry. Each row's guarantees are exactly what that reading
maps to the entry, which is a test and not an intention.

| Entry | Status | Guarantees | What stays out | Since |
|---|---|---|---|---|
| `ASI01:26` Agent Goal Hijack | Partly | `G1`, `G6`, `G16`, `G21`, `G22`, `G23`, `G24` | The hijack itself. Task binding, a budget and a scope provider shrink what a hijacked agent can do; nothing reads the hijack. | v0.1, v0.7, v0.8, v0.9 |
| `ASI02:26` Tool Misuse | Yes | `G3`, `G6`, `G23`, `G27` | Misuse that stays inside the policy, the grant and the budget. | v0.1, v0.9, v0.10 |
| `ASI03:26` Identity & Privilege Abuse | Yes | `G7`, `G8`, `G9`, `G17`, `G18`, `G19`, `G20`, `G21`, `G24`, `G25`, `G26` | Issuing identity. ctrlrun verifies what it is handed. | v0.1, v0.3, v0.8, v0.9, v0.10 |
| `ASI04:26` Agentic Supply Chain Vulnerabilities | No | none | Out of scope, and no guarantee maps to it: no package, model, build, registry or signature chain is ever inspected. Upstream pinning binds one connection and one tool schema, and it is mapped under `ASI02:26` and `ASI07:26`, where binding a peer belongs, rather than here. | none |
| `ASI05:26` Unexpected Code Execution | No | none | Out of scope: nothing here sandboxes an interpreter. | none |
| `ASI06:26` Memory & Context Poisoning | Partly | `G1`, `G6`, `G23` | The poisoning. A scope provider bites on an identifier an attacker chose, fetched before the reservation and fail-closed; the recheck still cannot run inside the atomic write, and that residual gap is stated wherever the feature is. | v0.1, v0.9 |
| `ASI07:26` Insecure Inter-Agent Communication | Partly | `G25`, `G26`, `G27` | Transport security. Authority across an A2A hop is a subset of the sender's, checked at the hop and on every evaluation, and a pinned upstream refuses a swapped peer; the channel itself is not ctrlrun's. | v0.10 |
| `ASI08:26` Cascading Failures | Yes | `G3`, `G4`, `G5`, `G10`, `G12`, `G13`, `G14`, `G15`, `G22` | A failure that never reaches a consequential action. | v0.1, v0.7, v0.9 |
| `ASI09:26` Human-Agent Trust Exploitation | Partly | `G1`, `G2`, `G11`, `G12`, `G16`, `G17`, `G18`, `G19`, `G28`, `G29`, `G30`, `G31`, `G32` | Persuasion. A human misled into approving the right action for the wrong reason gives a valid approval, and the receipt records it as one. | v0.1, v0.6, v0.7, v0.8, v0.11 |
| `ASI10:26` Rogue Agents | Partly | `G8`, `G9`, `G15`, `G20`, `G21`, `G22`, `G24`, `G25`, `G26` | Detection. A rogue agent is bounded, expired and revoked; it is not recognised as rogue. | v0.3, v0.7, v0.8, v0.9, v0.10 |

---

## What this page is for

A submission to the landscape is filled in from this page and from nothing else, so that
every ticked box has a row here and every row points at something that runs. If a box is
ticked on the form and its row here says *No*, the form is wrong. If a guarantee behind a
*Yes* loses its test, the row becomes *Partly* or *No* in the same commit, on the rule the
[Agentic Top 10 reading](/docs/OWASP-AGENTIC-TOP10) already follows.

This page is regenerated when the guarantee catalogue changes, when a version named in a
*Since* column is tagged, and when OWASP revises the form. The first two both happened without
it, so the rule is now a test rather than a sentence: `tests/test_owasp_landscape.py` checks
that every guarantee cited here exists in the registry, that the catalogue named is the one
`ctrlrun verify` reports, that no *Since* column names a version the changelog has not
released, and that each `ASI` row's guarantees are exactly what the
[Agentic Top 10 reading](/docs/OWASP-AGENTIC-TOP10) maps to that entry. It was written against
`ctrlrun.guarantees/v7`, the catalogue 0.12.2 ships, and the form as read on 2026-09-10.

## Next

- [OWASP Agentic Top 10](/docs/OWASP-AGENTIC-TOP10): the row-by-row mapping this summary is drawn from.
- [Verify](/docs/verify): how each guarantee is checked against your configuration, and why *not applicable* is not a pass.
- [Why ctrlrun](/docs/why) and [Get started](/docs/get-started/quickstart).
