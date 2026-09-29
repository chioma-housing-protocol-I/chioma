# Security Policy

## Supported Versions

We actively maintain and patch security vulnerabilities in the following branches:

| Branch / Version | Supported            |
| ---------------- | -------------------- |
| `main`           | ✅ Yes               |
| `develop`        | ✅ Yes (pre-release) |
| Older branches   | ❌ No                |

If you are running a fork or a pinned version that is no longer on a supported branch, please
upgrade to `main` before reporting.

---

## Scope

The following components are in scope for security reports:

| Component              | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| **Smart Contracts**    | Soroban contracts in `contract/` (escrow, payments, etc.) |
| **Backend API**        | NestJS application in `backend/`                          |
| **Frontend**           | Next.js application in `frontend/`                        |
| **Authentication**     | Stellar-based auth, JWT handling, KYC flows               |
| **Payment flows**      | Rent payments, deposit escrow, agent commissions          |
| **PII / data storage** | Encrypted fields, database access controls                |

Out of scope: third-party services (Stellar network itself, anchor operators, GitHub
infrastructure), social engineering, physical attacks.

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.** Public disclosure
before a fix is available puts all users at risk.

### Option 1 — GitHub Private Vulnerability Reporting (preferred)

Use GitHub's built-in private reporting:

1. Go to the **Security** tab of this repository.
2. Click **"Report a vulnerability"**.
3. Fill in the details. Only maintainers can see the report.

GitHub documentation:
[Privately reporting a security vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)

### Option 2 — Email

Send a report to **security@chioma.dev** with:

- A clear description of the vulnerability
- Affected component and version/branch
- Step-by-step reproduction instructions
- Potential impact and severity (Low / Medium / High / Critical)
- Any proof-of-concept code (optional but helpful)
- Your suggested fix, if you have one

PGP encryption is not required but is welcome if you need it — reach out first and we will
exchange keys.

---

## What to Expect

| Timeline        | Action                                                       |
| --------------- | ------------------------------------------------------------ |
| **Within 48 h** | Acknowledgement of your report                               |
| **Within 7 d**  | Initial triage: confirmed, needs-info, or out-of-scope       |
| **Within 30 d** | Patch available for confirmed High/Critical issues           |
| **Within 90 d** | Patch available for confirmed Medium/Low issues              |
| After patch     | Coordinated public disclosure and CVE filing (if applicable) |

We will keep you updated at each stage. If you do not hear back within 48 hours, please follow
up — your email may have been caught by spam filters.

---

## Responsible Disclosure

We follow a **coordinated disclosure** model:

- We ask that you give us a reasonable amount of time (see timelines above) to fix the issue
  before publishing your findings.
- We will credit you in the security advisory unless you prefer to remain anonymous.
- We will not pursue legal action against researchers who act in good faith and follow this
  policy.

---

## Bug Bounty

We do not currently operate a formal bug bounty programme. We are deeply grateful for
responsible disclosures and will credit all reporters publicly in our security advisories.

---

## Security Contacts

| Channel                  | Address / Link                          |
| ------------------------ | --------------------------------------- |
| GitHub private reporting | Security tab → "Report a vulnerability" |
| Email                    | security@chioma.dev                     |
| Telegram (community)     | https://t.me/chiomagroup                |

---

## Previous Security Advisories

Security advisories will be published under the
[Security Advisories](../../security/advisories) tab of this repository after coordinated
disclosure.
