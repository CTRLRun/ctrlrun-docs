---
title: "Authority and delegation"
description: "Grants, containment and the omission rule in plain language: who may propose an action, and how a delegated grant can only narrow."
sidebarTitle: "Authority in depth"
---

Until v0.3, a ctrlrun policy could see the action and nothing else. It answered *how much
autonomy does this action have* — run it, ask a human, refuse it — and the principal was
attribution on a receipt. That is a real question and it is still the one `actions:` answers.

It is not the only question. "May a €50,000 refund run without a human?" and "may *this agent*
propose a €50,000 refund at all?" are different, and a system that can only ask the first will
eventually answer the second by accident.

Authority is the second axis. This page is the model in plain language; the contract is
[`SPEC-v0.3.md`](https://github.com/CTRLRun/ctrlrun/blob/main/docs/SPEC-v0.3.md) §4 and §5.

---

## Opt in, and then it is closed

A document with **no `authority:` section behaves exactly as v0.2 did**. Nothing is evaluated,
no `AUTHORITY_*` event is written, and no decision changes.

The moment the section exists, **every principal needs a grant, and no grant means denied** —
including for actions the policy allows outright, including reads, including actions with no
effect key. There is no `default: allow`, no per-action opt-out, and no flag that makes a
missing grant permissive. Half-configured authority is the failure mode this rule exists to
prevent: it is the state in which nobody can say whether an action was permitted or merely
unlisted.

```yaml
schema: ctrlrun.policy/v3      # `authority:` needs v3, or a v1 reader would ignore it

authority:
  grants:
    - id: head-of-support
      subject: { agent: "head-of-support", user: "dana@example.com" }
      actions: ["stripe.refund"]
      resources: ["payment:*"]
      constraints: { amount_gte: 0, amount_lte: 10000000 }
      environments: ["production"]
```

`grants: []` is valid and permits nothing. A **missing** `grants` key is a load error, because
inferring "nothing" from an absent key would make a truncated edit look deliberate.

## A grant carries no decision

There is no `decision:` in a grant, and this is the design rather than an omission.

How much autonomy `stripe.refund` has is the same for the head of support and for the newest
agent in the fleet: it is a property of the action and of the amount, and it lives in
`actions:`. What differs between principals is **whether they may propose it at all**.

The two axes are evaluated separately — authority first — and combine as **the stricter of the
pair**. Authority cannot make a denied action allowed. Policy cannot make an unauthorized
action permitted. Neither can loosen the other, which is what lets you read either one on its
own and be right about what it does.

And policy still cannot see the principal. `agent_eq` and every other principal-addressing
condition is refused at load, exactly as in v0.1. Authority is a separate vocabulary, on
purpose.

## What a grant matches on

| Key | Matches |
|---|---|
| `subject` | the principal: `agent`, and optionally `user` |
| `actions` | action names, as patterns |
| `resources` | the action's resource string, as patterns |
| `constraints` | the action's arguments, in the same syntax a rule's `when:` uses |
| `environments` | the deployment the action is running in |
| `expires_at` | when the grant stops working |
| `tasks` | the unit of work the action was bound to, as patterns |
| `budgets` | **not a match: a sum.** How much this grant's actions may add up to, over a rolling window |

**Patterns are deliberately small**, because containment between two of them has to be
decidable: a literal, a `prefix*` that cannot cross a separator, and a final `**`. So
`stripe.*` matches `stripe.refund` and **not** `stripe.refund.partial`. There is no `?` and no
character class. Granting the whole surface of a system is spelled `**` — one token, greppable
in review, and impossible to write by accident.

**The environment is not the caller's to state.** It is set once on the `Control` and stamped
on every Action, so a grant scoped to `["staging"]` cannot be satisfied by a call that
describes itself as staging. An authorization dimension the subject can set is not one.

## How much, not just whether

Every key above except one answers *may this principal do this?* A budget answers a different
question, and it is the one a grant could not ask before v0.9: **how much, in total?**

```yaml
- id: head-of-support
  subject: { agent: "support-agent" }
  actions: ["stripe.refund"]
  constraints: { amount_lte: 10000000 }     # one refund, up to 100,000.00
  budgets:
    - { metric: amount, limit: 50000000, window: PT24H }   # 500,000.00 a day, across the grant
```

`constraints` bounds one action. `budgets` bounds the aggregate. A grant that answers only the
first permits a thousand actions that each pass it, which is how an agent acting entirely within
its permissions empties an account one permitted refund at a time.

Four things worth knowing, because each one is a decision that could have gone the other way.

**It is consumed when the effect is reserved**, in the same transaction, not checked on one line
and consumed on another. Two processes cannot both pass a check and then both spend.

**It is released only when the effect reaches `FAILED`** — the one state in which the executor
proved nothing happened. A committed spend is a spend, permanently.

**Ambiguity is not a refund.** An `AMBIGUOUS` effect holds its charge until a human or a
`reconcile` hook says what happened, because otherwise an agent that can manufacture ambiguity
can manufacture authority. This is the one that surprises people, and it is why
`ctrlrun inspect --grant` exists: a budget refusing while it looks nowhere near its limit is
almost always one unresolved effect, and the view names it and the command that clears it.

**Every grant in the chain is charged.** A delegation spends its own budget and its parent's, so
a holder cannot mint children to spend the same budget over again.

A daily budget *smaller* than one action the same grant permits is legal and almost always a
mistake: the first action of the day exhausts it, and any rule band above it becomes unreachable.
`ctrlrun verify` reports that rather than failing.

## Delegation, and the rule that makes it safe

A principal holding a `delegable` grant can create a narrower one at runtime:

```console
$ ctrlrun delegate --parent head-of-support --file finance.yaml --as head-of-support/dana@example.com
created dlg_1f0c…  parent head-of-support at depth 1
revoke it with: ctrlrun revoke dlg_1f0c…
```

A delegated grant is valid only if it is **provably a subset of its parent, on every
dimension** — checked when it is created, and again every single time it is evaluated.

The re-check is not belt-and-braces. It is what makes revocation transitive, what makes an
expiring parent stop authorizing without anyone having to find its children, and what makes a
narrowed root grant narrow everything beneath it. A containment check performed only at
creation would leave every delegation exactly as wide as the file used to be — which is the
shape of every stale-permission incident there has ever been.

`delegable: true` **requires `expires_at`**. Authority that can mint more authority and never
lapses is the one shape this model refuses to write down.

## The omission rule

This is the part that surprises people, so it gets its own section.

**A child that drops a dimension its parent constrains is rejected.** Not inherited. Certainly
not unconstrained.

```yaml
# parent
constraints: { amount_lte: 2500000 }
resources: ["payment:EU-*"]

# child — REJECTED, dimension "resources"
constraints: { amount_lte: 200000 }
# (no `resources:` key at all)
```

Read the child on its own and it looks narrower: the amount came down. But a grant with no
`resources` places no resource limit, so the child would authorize `payment:US-*`, which the
parent never could. Silence widened it.

Most permission systems read an omitted field as "inherit the parent's". That is a reasonable
convention and it is not this one, because it makes the safe reading of a document depend on a
document you are not looking at. Here, **a delegated grant means exactly what it says**, and
saying less is refused rather than resolved. The cost is that every link states every
dimension; the benefit is that a chain can be reviewed one file at a time.

The same rule applies to the subject: a delegation may not carry a wildcard grantee, and may
not drop its parent's `user`. Both hand the grant to a wider population than the parent
covered.

## Revocation

```console
$ ctrlrun revoke dlg_1f0c…
revoked dlg_1f0c… by cli:local
every delegation beneath it is denied from the next evaluation
```

**Transitive by structure.** Nothing is rewritten and no children are visited — every
evaluation walks to the root anyway, so a chain of any depth is cut by one write. It is
idempotent, and there is no `unrevoke`: the operation whose safety matters is the one taken in
a hurry.

Two limits worth knowing before you need them:

- **`Authority` is built when the document is loaded, and v0.3 does not hot-reload.**
  Revocation and expiry are live — they are read from the store and the clock on every
  evaluation. An *edit to the file* is not: narrowing a ceiling, bringing an expiry forward or
  removing `delegable` takes effect when the process next loads the document, which for
  `ctrlrun gateway` means a restart.
- **There is no way to list delegations in v0.3**, so there is no way to sweep a subtree.
  `ctrlrun revoke` works one id at a time, and the ids are in the events file. The operation
  that cuts a chain of *unknown* width is setting `delegable: false` on the root grant and
  restarting: every descendant is then denied on the next evaluation.

## Reading the evidence

Every action that passes authority appends `AUTHORITY_RESOLVED` — not only delegated ones,
because a deployment with a permissive grant has to be distinguishable from one with no
section at all. A denial appends `AUTHORITY_DENIED` and **never** `POLICY_EVALUATED`: policy is
not evaluated, so no approval request is created and no human is left holding a request for an
action that could never run.

The reason is one of a closed set — `no_authority`, `authority_constraint`,
`authority_expired`, `authority_escalation`, `authority_revoked`, `authority_unreadable` — and
never a grant id. A grant may legally be named `no_authority`, and evidence that can be spoofed
by naming a grant is not evidence. The ids travel in `data.grant_id` and
`data.delegation_id`.

## Try it

- `ctrlrun demo`, scenario 5 — the chain, the escalation, and the refusal, in process.
- [`examples/authority-escalation/`](https://github.com/CTRLRun/ctrlrun/tree/main/examples/authority-escalation) — the same story as a
  standalone script, including the delegation that is refused at *creation*.
- [`examples/authority/`](https://github.com/CTRLRun/ctrlrun/tree/main/examples/authority) — a payments chain and a DevOps chain, as
  complete documents to read rather than run.
