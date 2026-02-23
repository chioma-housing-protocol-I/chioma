# Chioma

**Chioma** is an open‑source platform built on the **Stellar blockchain** that connects **landlords (property owners), house agents, and tenants** through transparent, low‑cost, and programmable rental payments.

Chioma focuses on what blockchains do best: **money movement, trust minimization, and verifiable agreements**, while keeping complex business logic off‑chain for usability and scale.

Our goal is to modernize rental transactions—especially in emerging markets—by reducing friction, disputes, and payment inefficiencies using Stellar’s fast settlement and low fees.

---

Telegram: https://t.me/chiomagroup

## Figma
https://www.figma.com/design/2iA2B5gmRupQtzjYv3LSx4/Chioma?node-id=0-1&t=KEwTSTGKUDT0ievI-1

## Why Chioma?

Rental systems today suffer from:

* Manual and opaque rent collection
* Delayed settlements between tenants, agents, and landlords
* Trust issues around deposits and commissions
* High transaction costs for cross‑border or multi‑currency payments

**Chioma solves this by combining Stellar’s payment rails with a clean, open‑source marketplace layer.**

---

## Why Stellar?

Chioma is designed **specifically for Stellar**, not just deployed on it.

Stellar enables:

*  **Fast finality** (seconds)
*  **Ultra‑low transaction fees**
*  **Built‑in decentralized exchange (DEX)**
*  **Anchor‑based fiat on/off‑ramps**
*  **Multi‑sig & conditional transactions** for escrow‑like flows

This makes Stellar ideal for:

* Monthly rent payments
* Security deposit escrow
* Automated agent commissions
* Multi‑currency rent settlement

---

## What Chioma Does (High Level)

Chioma is **not** a monolithic on‑chain app.

Instead, it uses a **hybrid architecture**:

### On‑Chain (Stellar)

* Rent payments
* Security deposit holding & release
* Agent commission distribution
* Tokenized rent obligations
* Immutable transaction records

### Off‑Chain

* Property listings
* User profiles (landlords, agents, tenants)
* Matching & discovery
* Messaging & notifications
* Compliance & moderation

This keeps costs low while preserving decentralization where it matters most.

---

## Core Concepts

### 1. Rent Payment Flows

* Tenants pay rent using Stellar assets (USDC, local fiat tokens via anchors, or project tokens)
* Payments settle instantly
* Funds are split automatically between landlord and agent

### 2. Security Deposits (Escrow‑Like)

* Deposits are locked using Stellar’s multi‑sig or pre‑authorized transactions
* Released on move‑out approval
* Transparent and verifiable by all parties

### 3. Agent Commissions

* Agents receive commissions automatically
* No manual tracking or disputes
* Commission logic is enforced at payment time

---

## Architecture Overview

```text
Frontend (Web / Mobile)
   │
   ├── Property Listings
   ├── User Dashboards
   ├── Payment UI
   │
Backend (API + Indexer)
   │
   ├── Business Logic
   ├── Stellar SDK Integration
   ├── Compliance Hooks
   │
Stellar Network
   │
   ├── Asset Issuance
   ├── Payments & Escrow
   ├── DEX Swaps
```

---

## Open Source First

Chioma is being built **fully open‑source** 

We welcome:

* Contributors
* Reviewers
* Anchor operators
* Protocol researchers


---

## You Should Know

Chioma is not just a rental app.

It is **open financial infrastructure for housing**, built on Stellar, and designed to scale across borders, currencies, and communities.

