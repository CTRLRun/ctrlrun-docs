"""T180: alteration is not authorship, across every document a release ships.

SPEC-v0.6 §1.2's third rule, and §6.4's whole argument: a hash chain says the log was not
altered after the fact and says nothing about who wrote it. A document that blurs the two would
be the false-green problem in prose, and prose has no CI of its own.

Five documents, in two repositories. `README.md` and `CHANGELOG.md` are the library's, read
from `CORE_ROOT`; the three pages are here. **The scan was not split along with them**, because
one rule enforced in two places is two rules that will eventually disagree -- and this is the
only checkout that can see both trees at once. The library's CI runs it from here, against the
commit being proposed, so a README that gains such a sentence is red on its own pull request.

T181 -- what `pip install ctrlrun` pulls in, and what the wheel and the sdist carry -- stayed in
the library, because it is about the distribution rather than about the words.
"""

from __future__ import annotations

import re
from pathlib import Path

from _core import CORE_ROOT

REPO_ROOT = Path(__file__).resolve().parents[1]


def _root(name: str) -> Path:
    """Which checkout holds a scanned document. A page is here; anything else is the library's."""
    return REPO_ROOT if name.startswith("docs/") else CORE_ROOT


#: SPEC-v0.6 §8's T180. Word boundaries, so `design`, `assign`, `assignment` and `designated`
#: are not hits -- a substring list would flag those, be softened, and stop failing on the thing
#: it exists for.
FORBIDDEN = re.compile(
    r"\b(sign|signs|signed|signing|signature|signatures|authorship|"
    r"non-repudiation|tamper-proof)\b",
    re.IGNORECASE,
)

#: The documents the rule binds. `docs/SPEC-v0.6.md` is deliberately **not** here: it is the
#: place the distinction is argued at length, and scanning it would make the allow-list a copy
#: of §6.
SCANNED = (
    "README.md",
    "CHANGELOG.md",
    "docs/postgres.md",
    "docs/THREAT_MODEL.md",
    # Added with the Production section, by the independent review that noticed the gap. This
    # page is now the site's principal statement of §1.2's third rule -- it says what the chain
    # detects, what it does not survive, and that alteration is not authorship -- and it was in
    # neither this scan nor the section's own narrower one. If the Postgres guide earned a place
    # here for carrying one disclaiming sentence, a page carrying three has a stronger claim.
    "docs/production/receipt-integrity.mdx",
)


def _lines(name: str) -> list[str]:
    """One scanned document's lines.

    A **missing** file is a failure and not a skip. Skipping on absence would make the scan
    disappear exactly when somebody deleted the document it covers, and `_core.py` already
    refuses to let a missing library checkout become a quiet pass.
    """
    path = _root(name) / name
    assert path.exists(), f"{name} is required by SPEC-v0.6 §8 and is not here"
    return path.read_text(encoding="utf-8").splitlines()


def _load(name: str) -> set[str]:
    """The allow-listed lines of one file, stripped, as a set."""
    return {line.strip() for line in ALLOWED.get(name, ())}


#: **Every line below is allow-listed because somebody wrote it down here on purpose.**
#:
#: §8's T180 describes the list as sentences that *disclaim* one of the words, and most of these
#: are. Some are not, and saying so is the point of splitting the list rather than pretending:
#: a historical changelog entry about JWT signature verification, an HMAC on a webhook, and the
#: Python word for a function's parameters are all `\bsignature\b` and none of them is a claim
#: about receipts. `docs/SPEC-v0.6.md` §8's T180 is amended in this item's PR to say so, on the
#: rule that a contract defect found while implementing it is fixed in the contract.
#:
#: What the list is *for* is unchanged and is the whole design: it fails on a **new** occurrence,
#: which is the event worth failing on, and forces whoever adds one to come here and say what
#: they meant. A plain forbidden-word list would flag §6.4's own "Not authorship", be removed as
#: a false positive, and be gone.
#: Sentences that **disclaim** one of the words. §8's T180 describes the whole
#: list this way, and this half of it is.
DISCLAIMS: dict[str, tuple[str, ...]] = {
    # The 2026-09-09 rewrite cut the README to what CTRLRun does, how to use it and how it
    # works, and the two paragraphs that used to carry this are now one bullet in "What it does
    # not do". Both halves survived the cut, which is the half §6.4 cares about: the chain
    # detects alteration, and the same sentence says alteration is not authorship.
    "README.md": (
        "is detected. They are not signed: alteration is not authorship. The badge above means the",
    ),
    "CHANGELOG.md": (
        '- **`docs/docs/ROADMAP.md`\'s v0.6 bullet said "receipt integrity (hash chain / signatures)", and the',  # noqa: E501
        "slash was the problem.** A chain detects **alteration**; a signature proves **origin**, and",  # noqa: E501
        "this project verifies what it is handed. Signing is out of scope for v0.6 (`SPEC-v0.6.md` §11).",  # noqa: E501
        "- **`docs/docs/THREAT_MODEL.md`'s \"Receipts are not signed; a database admin can alter history",  # noqa: E501
        "which half it does not: **truncation at the end**, authorship, an adversary who can rewrite",  # noqa: E501
        '- Receipts are not signed. A database administrator can alter history. **This line read "(v0.6)" until v0.6 was built, and that was a promise v0.6 does not keep**: v0.6 adds a hash chain, which detects alteration and is not evidence of authorship, and it does not stop an administrator who can rewrite every row including the chain head. Signing is out of scope (`SPEC-v0.6.md` §11).',  # noqa: E501
    ),
    "docs/postgres.md": (
        "Receipts are not signed, alteration is not authorship, and the chain is not tamper-proof",
    ),
    "docs/production/receipt-integrity.mdx": (
        "- **It does not tell you who wrote a receipt.** Alteration is not authorship, it does not survive",  # noqa: E501
    ),
    "docs/THREAT_MODEL.md": (
        "- Receipts are not signed, and they are not signed after v0.6 either. v0.6 adds a **hash chain** (`SPEC-v0.6.md` §6): each receipt carries the hash of the one before it, with `seq` inside the hashed content, so a partial tamper is detected and named — an `UPDATE` on one row, a `DELETE` from the middle, a reordering. What that closes is **alteration that keeps the receipts after it**: changing what receipt *n* says while leaving the rest in place costs a rewrite of all of them plus the head, rather than one statement. **Not a truncation at the end, and not an append.** Two earlier versions of this line claimed the first; a review measured both at **two statements, undetected** — delete the rows and rewind the head, or insert a well-formed row and advance it. The head is a row in the same database as the receipts, so it raises the cost of *forgetting* and not the cost of erasing; an anchor outside the database is what would close that, and v0.6 has none. What it does **not** close is authorship, and it does not close a database admin who can rewrite every row including the chain head: such an adversary recomputes the chain and it verifies. The malicious-administrator line above is unchanged; v0.6 narrows it rather than removing it. Nor does the chain prove that every action wrote a receipt — a receipt whose write failed leaves no gap in `seq` and is invisible to the chain by construction; the events log is where that is reconciled.",  # noqa: E501
    ),
}

#: Sentences about something else entirely, which the word-boundary pattern cannot
#: tell apart: JWT signature verification, an HMAC on a webhook, and the Python word for a
#: function's parameters. §8's T180 did not anticipate these and is amended in item 9's PR.
#: They are allow-listed for the same reason the others are -- so that a **new** occurrence
#: fails and somebody has to come here and say which kind it is.
ANOTHER_SUBJECT: dict[str, tuple[str, ...]] = {
    "CHANGELOG.md": (
        "as widening, expired and revoked authority, token forgery, cross-JWT confusion, and signing",  # noqa: E501
        "token from the same issuer, signed with the same key, carrying the configured `aud`, passes",  # noqa: E501
        "fetch its signing keys in cleartext from wherever it pointed, cache them for the life of",
        "the process, and verify every token the attacker then signed.",
        "- **`Control.evaluate` returns the combined decision**, not the policy axis alone. Its signature",  # noqa: E501
        "one `Control` each. `SPEC-v0.1.md` §8's frozen signature is amended in the same change, as the",  # noqa: E501
        "- **`WebhookApprovalProvider`** — core, over stdlib `urllib.request`. One signed POST on",
        "`APPROVAL_REQUESTED`; the gateway serves the signed inbound grant/deny at",
        # v0.7 item 3: "the executor signature is unchanged" is a function's parameters, not a receipt.
        "re-derives it and a `reconcile` hook reads the attempt off the record. The executor signature is",  # noqa: E501
    ),
    "docs/THREAT_MODEL.md": (
        "| A forged or tampered token | `JWTIdentityProvider` verifies the signature against a JWKS or a pinned key, with the algorithm taken from its own allow-list and never from the token (RFC 8725 §3.1) |",  # noqa: E501
        "| Signing keys fetched from somewhere else | JWKS over HTTPS only, redirects refused outright, a duplicate `kid` refused rather than resolved, a failed fetch never emptying the cache |",  # noqa: E501
        "- **A compromised identity provider.** CTRLRun *consumes* identities: it verifies a token somebody else issued and maps the verified claims onto a `Principal`. It issues nothing, and an issuer that signs a token for the wrong subject has told CTRLRun the truth as far as CTRLRun can tell. Everything downstream — grants, delegation, receipts — is then wrong, correctly and consistently.",  # noqa: E501
    ),
}


#: The two groups, merged. Both are allow-listed; the split is what keeps the reason for each
#: entry visible instead of averaging them into one undifferentiated list.
ALLOWED: dict[str, tuple[str, ...]] = {
    name: DISCLAIMS.get(name, ()) + ANOTHER_SUBJECT.get(name, ())
    for name in set(DISCLAIMS) | set(ANOTHER_SUBJECT)
}


def test_T180_the_release_documents_do_not_blur_alteration_and_authorship() -> None:
    """SPEC-v0.6 §1.2's third rule, as a test rather than an intention."""
    unexpected: list[str] = []
    for name in SCANNED:
        allowed = _load(name)
        for number, line in enumerate(_lines(name), start=1):
            if FORBIDDEN.search(line) and line.strip() not in allowed:
                unexpected.append(f"{name}:{number}  {line.strip()[:110]}")
    assert unexpected == [], (
        "a release document gained a sentence about signing, signatures or authorship that "
        "nobody allow-listed. If it disclaims one of them, add the exact line to ALLOWED with "
        "the reason. If it claims one of them, SPEC-v0.6 §6.4 says it is not true:\n"
        + "\n".join(unexpected)
    )


def test_T180_the_allow_list_is_not_stale() -> None:
    """An allow-list nobody prunes becomes a list of lines that no longer exist, and the next
    person to edit one of these sentences would find the guard silently not covering it.

    So every entry must still resolve to a line in its file **and** still contain a forbidden
    word: an entry that stopped matching is an entry doing nothing.
    """
    orphaned: list[str] = []
    for name, entries in ALLOWED.items():
        present = {line.strip() for line in _lines(name)}
        for entry in entries:
            if entry.strip() not in present:
                orphaned.append(f"{name}: no longer present — {entry.strip()[:90]}")
            elif not FORBIDDEN.search(entry):
                orphaned.append(f"{name}: allow-listed but matches nothing — {entry.strip()[:90]}")
    assert orphaned == [], orphaned


def test_T180_the_scan_would_see_a_new_claim() -> None:
    """The positive control (`v0.4 §1.3`). A guard whose pattern never matched anything would
    pass this file on any content at all, and the two tests above would both stay green."""
    assert FORBIDDEN.search("Receipts are signed, which proves authorship.")
    assert FORBIDDEN.search("The chain is tamper-proof.")
    assert FORBIDDEN.search("CTRLRun gives you non-repudiation.")
    # And the words it must not fire on, which is why it is a word-boundary pattern.
    assert not FORBIDDEN.search("the design of the store")
    assert not FORBIDDEN.search("assign the lease to the caller")
    assert not FORBIDDEN.search("a designated approver")
