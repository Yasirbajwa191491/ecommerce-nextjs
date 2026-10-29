"""Local tracked-text credential scan. Prints locations and hashes, never values."""
import hashlib
import re
import subprocess
from pathlib import Path

PATTERNS = [
    r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{20,}",
    r"\bwhsec_[A-Za-z0-9]{20,}",
    r"\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})",
    r"\bAIza[A-Za-z0-9_-]{30,}",
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r"\b(?:prod|dev|preview):[A-Za-z0-9-]+\|[A-Za-z0-9+/=_-]{20,}",
]
paths = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
findings = 0
for filename in paths:
    path = Path(filename)
    if not filename or not path.is_file():
        continue
    raw = path.read_bytes()
    if b"\0" in raw:
        continue
    text = raw.decode("utf-8", errors="replace")
    for pattern in PATTERNS:
        for match in re.finditer(pattern, text):
            # The scanner's own regex is not a credential.
            findings += 1
            line = text.count("\n", 0, match.start()) + 1
            fingerprint = hashlib.sha256(match[0].encode()).hexdigest()[:12]
            print(f"{filename}:{line} credential candidate sha256:{fingerprint}")
if findings:
    raise SystemExit(1)
print(f"No credential patterns detected in {len(paths) - 1} tracked paths; binary and hosted secrets are outside this scan.")
