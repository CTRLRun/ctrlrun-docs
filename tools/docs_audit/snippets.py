"""Run every fenced block marked `runnable`, offline, and fail on the first sentence that lies.

A code sample a reader pastes and watches fail is the most expensive sentence in the
documentation, so a sample is either runnable and run here, or it carries no marker and makes
no promise. The marker is a word on the fence's info string:

    ```python runnable
    ```bash runnable
    ```yaml runnable

Rules, stated once here and in `STYLE.md`:

- Every runnable block in one document runs in **one temporary directory**, in document order,
  so a `yaml runnable` policy written early is the `ctrlrun.yaml` a later block reads.
- A `python runnable` block is its own script. `python runnable continue` is appended to the
  previous runnable Python blocks of the same document and the whole is run again, which is
  how a page defines a function in one block and calls it in the next without repeating it.
- A `bash runnable` block runs under `bash -euo pipefail`, with this interpreter's `bin/` on
  `PATH` so `ctrlrun …` is the checkout's CLI.
- A `yaml runnable` block is loaded with `Policy.from_yaml`, and with `Authority.from_yaml`
  when it carries an `authority:` section, and is then written to `ctrlrun.yaml` — or to the
  name given by a `file=<name>` token, which any block may carry.
- **No network.** Every subprocess gets a `sitecustomize` that refuses every connection except
  one to a loopback listener the process bound itself, which is the library's own
  `tests/conftest.py` guard character for character. A snippet that reaches for the network
  fails here rather than in a reader's terminal, where it would fail differently. The one
  exception is what `ctrlrun verify`'s G12 needs: a peer on `127.0.0.1` at a port this process
  bound, which is not a network and never leaves the host (SPEC-v0.7 §12.2.7).

Exit status is the number of failures, capped at 1.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from pathlib import Path

from _files import DOCUMENT_PATTERNS, Fence, documents, fences, relative

RUNNABLE = "runnable"
LANGUAGES = frozenset({"python", "bash", "yaml"})
TIMEOUT_SECONDS = 120

#: Installed as `sitecustomize` on the subprocess's `PYTHONPATH`. Replacing the socket *type*
#: with a function breaks anything that subclasses it — `ssl` does — so the refusal goes on
#: the operations. **This is `tests/conftest.py`'s `_NO_NETWORK_GUARD` in the library,
#: verbatim.** It refused every connect until v0.7, and `ctrlrun verify` then needed a
#: loopback peer for G12, so a snippet running verify exited 3 on a correct kernel. Two
#: guards of different widths is the drift the library's own fixture exists to prevent, so
#: this is a copy of that one rather than a second rule: IPv4 to the literal `127.0.0.1`, at
#: a port this process bound through a stream socket that is still open, and nothing else.
NO_NETWORK = '''\
"""Imported by `site` at startup: no connection except to a loopback listener bound here."""

import socket
import weakref

_real = socket.socket
_real_create_connection = socket.create_connection
_real_getaddrinfo = socket.getaddrinfo
_LOOPBACK = "127.0.0.1"
#: (host, port) -> the ids of the open *stream* sockets that bound it, taken from getsockname()
#: after the bind, so a bind to port 0 is recorded at the port the kernel chose. A datagram bind
#: is never recorded, because TCP and UDP ports are separate spaces: a UDP bind to a port another
#: process's TCP listener holds must admit nothing there. And a pair is forgotten when the last
#: socket holding it closes, detaches or is collected, because the kernel may hand a released
#: port to another process at once.
_bound = {}


def _forget(pair, holder):
    holders = _bound.get(pair)
    if holders is not None:
        holders.discard(holder)
        if not holders:
            del _bound[pair]


def _refuse(what):
    raise RuntimeError(f"tried to {what}; this process runs with no network")


def _literal(address):
    """The one address admitted: a two-element tuple whose host is the string "127.0.0.1".

    Every `AF_UNIX` address is a path and every IPv6 address a four-element tuple or another
    string, so neither is ever this, and both are refused by this check alone. There is no
    separate family check: it would refuse exactly what this refuses, with the same message.
    """
    return (
        isinstance(address, tuple)
        and len(address) == 2
        and type(address[0]) is str
        and address[0] == _LOOPBACK
    )


def _admitted(address):
    return _literal(address) and bool(_bound.get((address[0], address[1])))


class _Guarded(_real):
    """A socket that binds only to 127.0.0.1 and connects only to what the process bound.

    Replacing the *type* with a function breaks anything that subclasses it, and `ssl` does, so
    the refusal goes on the operations instead.
    """

    def bind(self, address):
        if not _literal(address):
            _refuse(f"bind {address!r}")
        super().bind(address)
        if self.type == socket.SOCK_STREAM:
            pair = tuple(self.getsockname()[:2])
            _bound.setdefault(pair, set()).add(id(self))
            self._guard_release = weakref.finalize(self, _forget, pair, id(self))

    def _release(self):
        release = getattr(self, "_guard_release", None)
        if release is not None:
            release()

    def close(self):
        self._release()
        super().close()

    def detach(self):
        self._release()
        return super().detach()

    def connect(self, address):
        if self.type != socket.SOCK_STREAM or not _admitted(address):
            _refuse(f"connect to {address!r}")
        return super().connect(address)

    def connect_ex(self, address):
        if self.type != socket.SOCK_STREAM or not _admitted(address):
            _refuse(f"connect to {address!r}")
        return super().connect_ex(address)

    def sendto(self, *args):
        if self.type != socket.SOCK_STREAM:
            _refuse(f"send a datagram {args[-1]!r}")
        return super().sendto(*args)

    def sendmsg(self, *args):
        if self.type != socket.SOCK_STREAM:
            _refuse("send a datagram")
        return super().sendmsg(*args)


def _create_connection(address, *args, **kwargs):
    if not _admitted(address):
        _refuse(f"connect to {address!r}")
    return _real_create_connection(address, *args, **kwargs)


def _getaddrinfo(host, *args, **kwargs):
    if type(host) is not str or host != _LOOPBACK:
        _refuse(f"resolve {host!r}")
    return _real_getaddrinfo(host, *args, **kwargs)


socket.socket = _Guarded
socket.create_connection = _create_connection
socket.getaddrinfo = _getaddrinfo
'''


@dataclass(frozen=True)
class Failure:
    location: str
    language: str
    message: str

    def __str__(self) -> str:
        return f"{self.location} ({self.language}): {self.message}"


@dataclass(frozen=True)
class Outcome:
    ran: int
    failures: tuple[Failure, ...]

    @property
    def ok(self) -> bool:
        return not self.failures


def runnable_fences(path: Path) -> list[Fence]:
    text = path.read_text(encoding="utf-8")
    return [
        fence
        for fence in fences(text, path)
        if RUNNABLE in fence.tokens and fence.language in LANGUAGES
    ]


def run_document(path: Path, *, guard: Path | None = None) -> Outcome:
    """Run every runnable block of one document, in order, in one temporary directory."""
    blocks = runnable_fences(path)
    if not blocks:
        return Outcome(0, ())
    with tempfile.TemporaryDirectory(prefix="docs-snippet-") as scratch:
        workdir = Path(scratch) / "work"
        workdir.mkdir()
        if guard is None:
            guard = Path(scratch) / "guard"
            guard.mkdir()
            (guard / "sitecustomize.py").write_text(NO_NETWORK, encoding="utf-8")
        environment = _environment(guard)
        failures: list[Failure] = []
        python_so_far: list[str] = []
        for fence in blocks:
            if fence.language == "python":
                if "continue" in fence.tokens:
                    source = "\n".join([*python_so_far, fence.body])
                else:
                    python_so_far = []
                    source = fence.body
                python_so_far.append(fence.body)
                failure = _run_python(fence, source, workdir, environment)
            elif fence.language == "bash":
                failure = _run_bash(fence, workdir, environment)
            else:
                failure = _load_yaml(fence, workdir)
            if failure is not None:
                failures.append(failure)
        return Outcome(len(blocks), tuple(failures))


def run_documents(paths: Iterable[Path]) -> Outcome:
    ran = 0
    failures: list[Failure] = []
    with tempfile.TemporaryDirectory(prefix="docs-snippet-guard-") as scratch:
        guard = Path(scratch)
        (guard / "sitecustomize.py").write_text(NO_NETWORK, encoding="utf-8")
        for path in paths:
            outcome = run_document(path, guard=guard)
            ran += outcome.ran
            failures.extend(outcome.failures)
    return Outcome(ran, tuple(failures))


def _environment(guard: Path) -> dict[str, str]:
    environment = dict(os.environ)
    environment["PYTHONPATH"] = os.pathsep.join(
        part for part in (str(guard), environment.get("PYTHONPATH", "")) if part
    )
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    environment["PATH"] = os.pathsep.join(
        [str(Path(sys.executable).parent), environment.get("PATH", "")]
    )
    # A snippet decides its own policy and store; the operator's must not leak in.
    for name in ("CTRLRUN_CONFIG", "CTRLRUN_STATE", "CTRLRUN_STORE_URL"):
        environment.pop(name, None)
    return environment


def _file_token(fence: Fence, default: str) -> str:
    for token in fence.tokens:
        if token.startswith("file="):
            return token[len("file=") :]
    return default


def _run_python(
    fence: Fence, source: str, workdir: Path, environment: Mapping[str, str]
) -> Failure | None:
    script = workdir / _file_token(fence, f"snippet_{fence.line}.py")
    script.write_text(source, encoding="utf-8")
    return _run([sys.executable, str(script)], fence, workdir, environment)


def _run_bash(fence: Fence, workdir: Path, environment: Mapping[str, str]) -> Failure | None:
    script = workdir / _file_token(fence, f"snippet_{fence.line}.sh")
    script.write_text(fence.body, encoding="utf-8")
    return _run(["bash", "-euo", "pipefail", str(script)], fence, workdir, environment)


def _run(
    command: list[str], fence: Fence, workdir: Path, environment: Mapping[str, str]
) -> Failure | None:
    try:
        completed = subprocess.run(
            command,
            cwd=workdir,
            env=dict(environment),
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECONDS,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return Failure(fence.location, fence.language, f"did not finish in {TIMEOUT_SECONDS}s")
    except OSError as exc:
        return Failure(fence.location, fence.language, f"could not start: {exc}")
    if completed.returncode != 0:
        tail = (completed.stderr or completed.stdout).strip().splitlines()[-8:]
        return Failure(
            fence.location,
            fence.language,
            f"exit {completed.returncode}\n    " + "\n    ".join(tail),
        )
    return None


def _load_yaml(fence: Fence, workdir: Path) -> Failure | None:
    import yaml
    from ctrlrun import Authority, Policy
    from ctrlrun.errors import CTRLRunError

    try:
        document = yaml.safe_load(fence.body)
    except yaml.YAMLError as exc:
        return Failure(fence.location, fence.language, f"not valid YAML: {exc}")
    if not isinstance(document, Mapping):
        return Failure(fence.location, fence.language, "a runnable YAML block is a document")
    try:
        if "actions" in document:
            Policy.from_yaml(fence.body, source=fence.location)
        if "authority" in document:
            Authority.from_yaml(
                fence.body, source=fence.location, standalone="actions" not in document
            )
        if "actions" not in document and "authority" not in document:
            return Failure(
                fence.location,
                fence.language,
                "neither a policy (`actions:`) nor an authority document (`authority:`)",
            )
    except CTRLRunError as exc:
        return Failure(fence.location, fence.language, f"{type(exc).__name__}: {exc}")
    (workdir / _file_token(fence, "ctrlrun.yaml")).write_text(fence.body, encoding="utf-8")
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("paths", nargs="*", type=Path, help="documents to run; default: all")
    parser.add_argument("--list", action="store_true", help="list runnable blocks and exit")
    arguments = parser.parse_args(argv)
    paths = [p.resolve() for p in arguments.paths] or documents(patterns=DOCUMENT_PATTERNS)
    if arguments.list:
        for path in paths:
            for fence in runnable_fences(path):
                print(f"{fence.location} {fence.language} {' '.join(fence.tokens)}")
        return 0
    outcome = run_documents(paths)
    for failure in outcome.failures:
        print(f"FAIL {failure}")
    scope = ", ".join(relative(p) for p in paths) if len(paths) <= 3 else f"{len(paths)} documents"
    print(f"snippets: {outcome.ran} runnable block(s) in {scope}, {len(outcome.failures)} failed")
    return 0 if outcome.ok else 1


if __name__ == "__main__":
    sys.exit(main())
