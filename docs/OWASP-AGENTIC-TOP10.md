---
title: "OWASP Top 10 for Agentic Applications"
description: "A reading of somebody else's taxonomy against the guarantees CTRLRun tests, naming the four entries it does not address."
sidebarTitle: "OWASP Agentic Top 10"
---

This is a **reading** of somebody else's taxonomy against the guarantees CTRLRun tests. It is
not a compliance claim, a conformance claim, a certification, or a statement that CTRLRun
covers the OWASP Top 10 for Agentic Applications. Three of the ten entries are not addressed
by CTRLRun at all, and they are listed by name below.

Every row maps a guarantee to an entry, and every guarantee is backed by a passing acceptance
test — so each row points at code and at a test. A row whose test disappears is a row that
comes out.

---

## The edition this was written against

| | |
|---|---|
| **Document** | OWASP Top 10 for Agentic Applications |
| **Edition** | 2026 |
| **Publisher** | OWASP GenAI Security Project, OWASP Foundation |
| **Announced** | 2025-12-09 |
| **Entry codes** | `ASI01:2026` – `ASI10:2026` |
| **Landing page** | [https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/) |
| **Read on** | 2026-09-04 |

**How the codes and titles below were derived, stated plainly because it matters.** The
published document itself is a PDF behind a download form on the landing page above and could
not be retrieved. The ten codes and titles were taken from
[`OWASP/secure-agent-playbook`](https://github.com/OWASP/secure-agent-playbook/blob/main/plugins/ai-security-skills/plays/agentic-ai-risk-assess.md),
an OWASP-owned repository that enumerates them, and corroborated against two independent
third-party summaries that agree with it in every entry. Where a third summary disagreed —
`ASI02` as "Tool Misuse & Exploitation", `ASI04` as "…Compromise", `ASI08` as "Cascading Agent
Failures" — the OWASP-owned repository's wording is the one used here.

### The ten entries

| Code | Title |
|---|---|
| `ASI01:2026` | Agent Goal Hijack |
| `ASI02:2026` | Tool Misuse |
| `ASI03:2026` | Identity & Privilege Abuse |
| `ASI04:2026` | Agentic Supply Chain Vulnerabilities |
| `ASI05:2026` | Unexpected Code Execution |
| `ASI06:2026` | Memory & Context Poisoning |
| `ASI07:2026` | Insecure Inter-Agent Communication |
| `ASI08:2026` | Cascading Failures |
| `ASI09:2026` | Human-Agent Trust Exploitation |
| `ASI10:2026` | Rogue Agents |

Anyone with the published PDF in front of them should check these ten strings against it. If
one differs, this table is what is wrong, not the mapping.

---

## Guarantee → entries mitigated

Each guarantee is one sentence about what the kernel **refuses**. The "how" column names the
mechanism, not the entry.

| Guarantee | Invariant | Entries | How |
|---|---|---|---|
| **G1** mutated approval refused | An approval is bound to one `action_hash`; presenting it for any other action is refused, and the approval is not consumed. | `ASI09:2026`, `ASI01:2026` (partly), `ASI06:2026` (partly) | The approval a human granted is bound to the exact canonical form of the action they were shown, so an action that changed after the approval — by a hijacked goal or by anything else — has no approval to present. |
| **G2** replayed approval refused | An approval is single-use; the second presentation is refused and does not execute. | `ASI09:2026` | The approval record is consumed in the same transaction that admits it, so one human decision authorizes exactly one execution and a loop cannot spend it twice. |
| **G3** duplicate effect refused | A second attempt on an effect key whose record is `COMMITTED` is refused, and the remote is not called. | `ASI08:2026`, `ASI02:2026` | Effects are identified by a key derived from the action's own arguments, and a committed key is refused rather than retried — so a retry loop cannot turn one intended effect into several. |
| **G4** one winner under concurrency | Reservation is atomic across processes, not merely across threads. | `ASI08:2026` | The reservation is taken inside a `BEGIN IMMEDIATE` against a unique constraint on the effect key, so two agents that picked up the same task produce one effect and one refusal. |
| **G5** ambiguous blocks a blind retry | An executor that raises anything other than `NotExecuted` leaves the effect `AMBIGUOUS`, and the retry is refused rather than executed. | `ASI08:2026` | A lost response is recorded as an *unknown* outcome rather than a failure, and an unknown outcome is a state only a human or a reconciliation hook may leave — so the failure does not cascade into a second execution of something that may already have happened. |
| **G6** unknown action refused | Unknown action → DENY. There is no default-allow. | `ASI02:2026`, `ASI01:2026` (partly), `ASI06:2026` (partly) | The policy is the list of what an agent may do; anything not written in it is refused, so a tool an agent was talked into reaching for is refused whether or not the reasoning that reached for it was sound. |
| **G7** no principal refused | An action proposed with no principal is refused, and no receipt and no events are written. | `ASI03:2026` | Every action carries a principal or it does not run, so there is no path on which an action executes with nobody attributable to it. |
| **G8** expired authority refused | A grant is authority only until its `expires_at`; after that the action it covered is denied, by name. | `ASI03:2026`, `ASI10:2026` | Authority is evaluated on every action against the clock, not at the start of a session, so an agent still running after its grant lapsed is denied on its next proposal. |
| **G9** delegation cannot escalate | A delegated grant is valid only if it is provably a subset of its parent on every dimension — and a child that **drops** a dimension its parent constrains is rejected rather than treated as unconstrained. | `ASI03:2026`, `ASI10:2026` | Containment is checked at creation and again on every evaluation by walking the chain to its root, and omission is never inheritance — so an agent handed authority cannot mint itself more of it, and a revocation anywhere in the chain cuts everything beneath it. |
| **G10** unknown exception is ambiguous | `NotExecuted` is the only outcome that means "the remote did nothing". Everything else, timeouts included, is `AMBIGUOUS`. | `ASI08:2026` | The mapping from an executor's exception to an outcome is asymmetric on purpose: a timeout is not a failure, so a framework's retry-on-error cannot be the thing that decides whether money moved twice. |
| **G11** an altered receipt is detected | Each receipt carries the hash of the one before it. Altering, deleting or reordering one breaks the chain, and the break is reported by name — `content_altered`, `hash_missing`, `link_broken`, `missing`, `head_mismatch`, `unchained` — and by `seq`. | `ASI09:2026` (partly) | The evidence an operator reads after an incident is the thing an attacker who got that far has the most reason to edit. This does not stop them: it makes **changing what a receipt says, while keeping the receipts after it**, cost a rewrite of all of them plus the head, rather than one statement. What it does not close is the end of the log — erasing a suffix, or appending to it, each cost two statements and are undetected, because the head is a row in the same database and not an external anchor. v0.6 has no anchor and claims none. It is **not** a signature and says nothing about who wrote the log; somebody who can rewrite every row including the head recomputes the chain and it verifies, and `THREAT_MODEL.md` still lists a malicious administrator as out of scope. |
| **G12** a byte written is ambiguous | `ctrlrun.transport` classifies a transport failure from evidence rather than from an exception type: it raises `NotExecuted` only where a connection it opened was handed no request byte, in an executor run that had offered none. After one byte, a reset, a read timeout, a reused connection or a second connection in the same run is the original exception, and the effect is `AMBIGUOUS`. | `ASI08:2026`, `ASI09:2026` (partly) | `FAILED` versus `AMBIGUOUS` is the one decision this library exists to get right, and the kernel does not make it: an executor does. Until v0.7 the correct rule lived only behind `ctrlrun[gateway]`, so the surface most people use had a docstring and no implementation, and the obvious hand-written classifier maps `ConnectionResetError` to "nothing happened" after the whole request reached the remote. That is a licence to act twice, written by a well-meaning integrator. What this closes is the absence of a correct rule in core. What it does not close: the register sees only this library's own sends, so an executor that sends part of the effect through another transport and then uses the classifier can be handed a claim that is true of these connections and false of the effect. No parameter, attribute or environment variable widens what counts as `FAILED`. |
| **G13** clock divergence is named | The kernel measures how far this host's clock disagrees with the store's, on a store that has a clock of its own, and reports the divergence as `CLOCK_SKEW_DETECTED` when it passes the configured threshold. It changes no decision: every lease is still compared against the application clock exactly as before. | `ASI08:2026` (partly) | Once the store is shared, each host brings its own clock, and the failure is fail-closed and therefore quiet. A host running ahead sees a live lease as expired and marks `AMBIGUOUS` a record whose real holder is mid-flight and about to succeed; a host running behind refuses for longer than it should. Neither says why. What this closes is the silence, not the skew: an operator reading a receipt learns that two clocks disagreed and by how much, so the response to the first failure is not itself the second one. It does not synchronize anything, and a skew below the threshold is not reported. |
| **G14** token changes across a renewal | `ctrlrun.idempotency_token()` answers inside an executor with a token derived from `(effect_key, attempt)`: stable within one attempt, including across a resume, and different after a renewal. Send it to a provider as its idempotency key. | `ASI08:2026` (partly) | A provider handed the effect key alone would answer the one retry the kernel permits, permitted *because the executor proved nothing happened*, with the cached failure of the attempt that failed. A token that moves with the attempt keeps a provider's cache from becoming a second source of stale outcomes. What it is for is reconciliation, a deterministic handle to ask a provider what became of an attempt whose outcome is unknown; it does not make a retry safe, and after `AMBIGUOUS` the kernel still refuses one. It is unique only as far as the operator's effect keys are, and nothing here checks two stores sharing a provider account. |
| **G15** renewal past the ceiling refused | An action entry may declare `max_attempts`; above it the executor is not called, the record is released as `FAILED`, a `blocked` receipt names the ceiling, and `ActionDenied(reason="attempt_ceiling")` is raised. The refused attempt number is spent. | `ASI08:2026` (partly), `ASI10:2026` (partly) | Without a ceiling a renewal after `FAILED` is unbounded, so an agent that keeps proposing an action that keeps failing keeps dispatching, and one human yes on an `APPROVE` action bought unlimited dispatches. The ceiling is the operator's, not the kernel's: an entry that declares none renews exactly as before, and the decision is taken on the attempt number the store assigned, after the reservation, so two callers cannot both pass a read taken before reserving. It bounds attempts on one effect key, not what an agent does across many. |
| **G16** a moved fingerprint is refused | Under `APPROVE`, a `preconditions=` provider's answer is kept as a `sha256:` fingerprint on the request; on the presenting pass it is computed again, strictly before the store call that consumes the approval, and a difference is refused with `ApprovalMismatch(reason="precondition_changed")`, reserving nothing and leaving the approval granted. | `ASI09:2026` (partly), `ASI01:2026` (partly) | A human's yes was given against the world as it was; this refuses the action where the state the approval depended on has moved since. It **narrows** the window between approval and execution and does not close it: the comparison is a network call outside the atomic reservation write, and a change that lands between the comparison and the reservation is not refused. What the provider looks at is in the operator's code, which verify does not read; verify grades the check with a provider of its own. |

---

## Not covered by CTRLRun

The half that makes the table above credible. One honest sentence each; nothing aspirational.

| Entry | Title | Why not |
|---|---|---|
| `ASI04:2026` | Agentic Supply Chain Vulnerabilities | Out of scope. CTRLRun never inspects a package, a model, a tool registry or an MCP server's provenance; it decides actions, and a poisoned dependency reaches it as an ordinary caller. |
| `ASI05:2026` | Unexpected Code Execution | Out of scope. Nothing here sandboxes an interpreter or constrains what a process may run. CTRLRun sits between an agent and one remote effect, not between an agent and its own runtime. |
| `ASI07:2026` | Insecure Inter-Agent Communication | Not yet. Authority does not propagate across agent hops in this release — a grant is evaluated where the action is proposed, and there is no A2A model. `docs/ROADMAP.md` puts that in v0.10; until then, an agent handing work to another agent is outside what these guarantees say anything about. |

And the three entries where the mapping above is **partial**, with the part that is not covered
stated here rather than left implied:

| Entry | Title | Covered | Not covered |
|---|---|---|---|
| `ASI06:2026` | Memory & Context Poisoning | G6 and G1 constrain what an agent acting on a poisoned context can *do*: the action must still be named in the policy, so a belief an attacker planted cannot reach a tool the agent was never entitled to use, and an approval granted for one action cannot be spent on another. This is the same downstream constraint that makes `ASI01` partial, and it is here for the same reason. | CTRLRun never reads a model's memory, its context or its prompt, so it neither detects nor prevents the poisoning. And the shape poisoning most often takes is the one the kernel has least to say about: **corrupted arguments to an action the agent is entitled to take** — the right operation against the wrong record. Policy conditions, resource patterns and v0.6 data scope bite on part of that; nothing bites on an identifier an attacker chose. |
| `ASI01:2026` | Agent Goal Hijack | G1 and G6 constrain what a hijacked agent can *do*: it still meets the policy, and it still cannot present an approval granted for a different action. | CTRLRun does not detect or prevent the hijack. It never sees the prompt, the plan or the reasoning, so an agent whose goal was replaced proposes actions exactly as a healthy one would — and every action inside its policy and its grants will run. |
| `ASI09:2026` | Human-Agent Trust Exploitation | G1 and G2 close the shape where an approval a human gave for one action is spent on another, or spent twice. | CTRLRun does not authenticate the *approver*, does not model separation of duties, and has no opinion on whether the human was misled into approving. A human persuaded to approve the right action for the wrong reason gets a valid approval, and the receipt records it as one. |

---

## Where the guarantees are actually checked

The mapping is only worth what the tests behind it are worth. `ctrlrun verify` runs these ten
against a configuration and reports which of them that configuration can exercise at all —
**not applicable is not a pass**, so a mapping row whose guarantee your policy cannot exercise
shows up as `N/A` with the reason rather than as a green tick. See
[`docs/verify.md`](/docs/verify).

Each guarantee also descends from an acceptance test in `docs/SPEC-v0.1.md §7`,
`docs/SPEC-v0.2.md §10` or `docs/SPEC-v0.3.md §10`, named in the registry and carried into
every report as `descends_from`.

---

This document is regenerated when the guarantee catalogue changes, and when OWASP publishes a
new edition. It was written against `ctrlrun.guarantees/v2` and the **2026** edition of the
OWASP Top 10 for Agentic Applications.
