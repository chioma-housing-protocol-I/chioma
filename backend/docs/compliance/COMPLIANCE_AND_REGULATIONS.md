# Compliance and Regulations

## Overview

This document covers the regulatory and compliance obligations that apply to
Chioma as a financial infrastructure platform handling personal data, rental
payments, and blockchain transactions. It describes requirements, current
controls, and the procedures teams must follow to maintain compliance.

Use this document alongside:

- `backend/docs/security/SECURITY_POLICIES_AND_STANDARDS.md`
- `backend/docs/security/AUDIT_LOGGING.md`
- `backend/docs/compliance/TENANT_SCREENING_COMPLIANCE.md`

---

## Table of Contents

- [GDPR](#gdpr)
- [CCPA](#ccpa)
- [SOC 2](#soc-2)
- [Industry Standards](#industry-standards)
- [Data Residency](#data-residency)
- [Audit Trails](#audit-trails)
- [Compliance Reporting](#compliance-reporting)
- [Compliance Checklist](#compliance-checklist)

---

## GDPR

The General Data Protection Regulation applies to any processing of personal
data belonging to individuals in the European Economic Area.

### Key Requirements

| Requirement         | Description                                                                           |
| ------------------- | ------------------------------------------------------------------------------------- |
| Lawful basis        | Every processing activity must have a documented lawful basis                         |
| Data minimization   | Collect only the data necessary for the stated purpose                                |
| Right of access     | Users can request a copy of their personal data                                       |
| Right to erasure    | Users can request deletion of their data where no legal obligation requires retention |
| Data portability    | Users can request their data in a machine-readable format                             |
| Breach notification | Supervisory authority must be notified within 72 hours of a qualifying breach         |
| Privacy by design   | Data protection must be considered from the start of any new feature                  |

### Current Controls

- personal data fields (email, phone, KYC payloads, wallet metadata) are
  encrypted at rest using AES-256-GCM
- consent is captured before tenant screening submission and stored with
  timestamp, IP address, and user agent
- audit logs record all access to personal data
- data retention periods are defined per data class and enforced by cleanup tasks
- `.env.example` and documentation avoid including real personal data

### Required Actions Before Production

- complete a Data Protection Impact Assessment (DPIA) for KYC and payment flows
- publish a privacy policy that accurately describes all processing activities
- implement a self-service data export endpoint for right of access requests
- implement a self-service account deletion flow for right to erasure requests
- appoint a Data Protection Officer (DPO) or designate a responsible contact
- document the lawful basis for each processing activity in a data register

---

## CCPA

The California Consumer Privacy Act grants California residents rights over
their personal information.

### Key Requirements

| Requirement        | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| Right to know      | Consumers can request disclosure of personal information collected |
| Right to delete    | Consumers can request deletion of their personal information       |
| Right to opt out   | Consumers can opt out of the sale of their personal information    |
| Non-discrimination | Consumers must not be penalized for exercising CCPA rights         |

### Current Controls

- no personal information is sold to third parties
- audit logs support disclosure requests by providing a record of data access
- consent flows are in place for tenant screening

### Required Actions Before Production

- add a "Do Not Sell My Personal Information" disclosure to the privacy policy
  (even if no sale occurs, the disclosure is required)
- implement a verifiable consumer request process for know and delete requests
- document the categories of personal information collected and their purposes

---

## SOC 2

SOC 2 defines trust service criteria across security, availability,
processing integrity, confidentiality, and privacy. Chioma targets the
Security and Confidentiality criteria as a baseline.

### Security Criteria (CC Series)

| Control area      | Current implementation                                                    |
| ----------------- | ------------------------------------------------------------------------- |
| Logical access    | JWT authentication, RBAC, `JwtAuthGuard`, `RolesGuard`                    |
| Change management | PR-based workflow, branch protection, required reviews                    |
| Risk assessment   | Threat detection middleware, vulnerability management process             |
| Incident response | Documented in `SECURITY_POLICIES_AND_STANDARDS.md`                        |
| Monitoring        | Prometheus, Grafana, Loki, Alertmanager — see `LOGGING_AND_MONITORING.md` |
| Encryption        | AES-256-GCM at rest, TLS in transit                                       |
| Vendor management | Third-party integrations documented in `API_INTEGRATION_PROCEDURES.md`    |

### Confidentiality Criteria

- sensitive data is classified and protected per the data protection policy
- access to confidential data is restricted to authorized roles
- data sharing with third parties is governed by contracts and documented

### Required Actions for SOC 2 Readiness

- engage a licensed CPA firm to conduct the audit
- produce evidence packages for each control (screenshots, log exports, policy docs)
- implement a formal access review process (quarterly minimum)
- maintain a risk register with documented mitigations
- establish a formal vendor risk assessment process

---

## Industry Standards

### Financial Services

As a platform facilitating rental payments on the Stellar blockchain:

- transaction records must be immutable and auditable
- payment flows must include fraud detection and anomaly alerting
- multi-signature controls are used for security deposit escrow
- Stellar anchor integrations must comply with the anchor's own regulatory obligations

### Housing and Rental

- tenant screening must comply with the Fair Credit Reporting Act (FCRA) in the US
- consent must be obtained before running background or credit checks
- adverse action notices must be provided when screening results affect a tenancy decision
- data from screening reports must not be retained beyond the permitted period

### Blockchain / Virtual Assets

- depending on jurisdiction, Chioma may be subject to AML/KYC obligations
- Stellar anchor partners are responsible for their own money transmission licensing
- transaction monitoring should flag unusual payment patterns for review

---

## Data Residency

| Data class               | Storage location         | Notes                                                    |
| ------------------------ | ------------------------ | -------------------------------------------------------- |
| User personal data       | Primary database region  | Region must be documented and disclosed to users         |
| Audit logs               | Separate log storage     | Must not be co-located with mutable application data     |
| Encrypted KYC payloads   | Primary database region  | Encrypted at rest; access restricted to authorized roles |
| Stellar transaction data | Stellar network (public) | Immutable on-chain; no residency control possible        |

Requirements:

- document the AWS region(s) used for each data class
- ensure data transfer agreements are in place for cross-border transfers of EEA personal data
- do not store personal data in regions that conflict with user consent or regulatory requirements

---

## Audit Trails

Audit trails are required for compliance with GDPR, SOC 2, and FCRA. They must:

- record who accessed or modified personal or financial data, and when
- be tamper-evident and stored separately from application data
- be retained for a minimum of 12 months (24 months recommended for financial data)
- be accessible to compliance officers and auditors without requiring application downtime

See `backend/docs/security/AUDIT_LOGGING.md` for the full audit logging specification.

---

## Compliance Reporting

### Internal Reporting

- compliance status is reviewed quarterly by the security and compliance leads
- findings are tracked in the issue tracker with `priority:high` or `priority:critical` labels
- unresolved critical findings block production releases

### External Reporting

- GDPR breach notifications are filed with the relevant supervisory authority within 72 hours
- SOC 2 audit reports are produced annually once the platform reaches audit readiness
- FCRA adverse action notices are sent to affected tenants within the legally required window

### Incident Reporting

Follow the incident response procedure in `SECURITY_POLICIES_AND_STANDARDS.md`.
For incidents involving personal data, additionally:

1. Assess whether the incident meets the GDPR breach notification threshold.
2. If yes, notify the supervisory authority within 72 hours.
3. Notify affected individuals if the breach is likely to result in high risk to their rights.
4. Document the breach, its scope, and the remediation steps taken.

---

## Compliance Checklist

- [ ] DPIA completed for KYC and payment processing flows
- [ ] Privacy policy published and accurate
- [ ] Lawful basis documented for each processing activity
- [ ] Right of access (data export) endpoint implemented
- [ ] Right to erasure (account deletion) flow implemented
- [ ] CCPA "Do Not Sell" disclosure in place
- [ ] Tenant screening consent flow reviewed against FCRA requirements
- [ ] Adverse action notice process documented and implemented
- [ ] SOC 2 control evidence packages maintained
- [ ] Quarterly access review process in place
- [ ] Audit log retention meets minimum 12-month requirement
- [ ] Data residency documented and disclosed to users
- [ ] Cross-border data transfer agreements in place where required
- [ ] Breach notification procedure tested and contacts confirmed
- [ ] Vendor contracts include data processing agreements where required
