# Secrets Scanning

Issue #1455. Credentials committed to git stay in history even after they
are deleted from `HEAD`, so we scan **every commit**, not just the latest one.

## What runs where

| Where | What | Blocks |
| --- | --- | --- |
| `.github/workflows/secrets-scan.yml` | `gitleaks git` over the full history on push, PR, weekly (Mon 03:00 UTC) and on demand | Yes: the job fails on any new finding |
| `.husky/pre-commit` | `gitleaks git --pre-commit --staged` over staged changes | Yes, if gitleaks is installed locally |
| `.gitignore` | Ignores `.env.local`, `.env.*.local`, key/keystore files | Stops accidental `git add` |

Rules live in [`.gitleaks.toml`](../.gitleaks.toml). It extends the upstream
ruleset and adds rules for Stellar secret seeds (`S...`, 56 chars), Paystack
and Flutterwave secret keys. Findings are redacted in logs, and the SARIF report
is uploaded to GitHub code scanning (Security → Code scanning).

## Local setup

```bash
# macOS
brew install gitleaks
# Linux: download a release from https://github.com/gitleaks/gitleaks/releases

# Scan the whole history the same way CI does
gitleaks git . --config .gitleaks.toml --gitleaks-ignore-path .gitleaksignore --redact -v
```

## If the scan finds a secret

1. **Treat it as compromised.** Rotate or revoke it with the provider first
   (Stellar: move funds and replace the keypair; JWT/encryption keys: rotate
   and invalidate sessions; cloud/payment keys: revoke in the dashboard).
2. **Remove it from `HEAD`** and load it from the environment or secret
   manager instead. Commit only `*.example` templates with placeholders.
3. **Decide about history.** Once the credential is rotated, the old value
   is useless. Either:
   - add the finding's fingerprint to [`.gitleaksignore`](../.gitleaksignore)
     with a comment saying who rotated it and when, **or**
   - purge it from history with
     [`git filter-repo`](https://github.com/newren/git-filter-repo)
     (`git filter-repo --replace-text replacements.txt`), force-push, and ask
     all contributors to re-clone. Coordinate this with maintainers first,
     because it rewrites every downstream commit SHA.
4. **False positive?** Prefer a narrow `[allowlist]` regex or path in
   `.gitleaks.toml` over ignoring a real env file. Never allowlist a file
   just to make CI green.

## Rules of thumb

- Real values belong in GitHub Actions secrets, the deployment platform's
  secret store, or an untracked `.env` / `.env.local`.
- Deploy templates should reference variables (`JWT_SECRET=${JWT_SECRET}`).
  Those placeholders are allowlisted.
- Don't use funded accounts for dev or test Stellar keys. Generate throwaway
  testnet keypairs per developer.
