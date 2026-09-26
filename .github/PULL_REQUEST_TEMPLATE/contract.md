## 📝 Description

<!-- Brief description of the contract change -->

Closes #

## 🔐 Contract Review Checklist

Items map to [contract/docs/deployment/READINESS_CHECKLIST.md](../../contract/docs/deployment/READINESS_CHECKLIST.md).

- [ ] **R1 Upgradeability** — storage layout compatible; upgrade path tested
- [ ] **R2 Storage growth** — new entries bounded; TTL/extend strategy defined
- [ ] **R3 Event schema** — existing events unchanged or versioned; indexers updated
- [ ] **R4 Authorization** — `require_auth`/role checks on all state changes; negative tests added
- [ ] **R5 Testing** — `contract/check-all.sh` passes; success and failure paths covered
- [ ] **R6 Cost** — resource/fee impact measured
- [ ] **R7 Docs & deployment** — docs and deployment notes updated
