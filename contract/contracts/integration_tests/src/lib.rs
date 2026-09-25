//! Multi-contract integration test harness for the Chioma protocol (#1687).
//!
//! Every other contract crate in this workspace only tests itself in
//! isolation, registering just its own contract in a fresh `Env`. This
//! crate registers multiple real contracts (not mocks) in one `Env` and
//! drives scenarios that span them, the way an off-chain caller (backend,
//! frontend, or indexer) actually orchestrates the protocol end to end.
//!
//! This crate has no runtime code of its own -- see `tests/` for the
//! scenarios. Run with `cargo test -p integration-tests`.
