# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Monitoring, maintenance SLA, KYC retention, and fraud threshold fixes
- Refresh-token reuse detection, cleanup dry-run/cap, evidence content validation, and feature-flag TTL cache
- Shared upgrade registry and coordinated upgrade tooling for smart contracts
- Property search filter state reflected in the URL
- Document signing coverage, favorites pagination, queue metrics, and review booking verification
- Web vitals regression alerting
- Soft delete functionality across multiple entities and services
- Storybook documentation and variants for UI components
- Offline page distinguishes network loss from server failure

### Fixed

- Phone number validation and formatting
- Webhook signature verification logging
- CORS preflight response caching for /api routes
- Booking race condition, non-transactional audit logs, notification retries, and messaging validation
- Maintenance stream and web vitals endpoint hardening
- Payment dispute metadata

### Changed

- Toast notifications consolidated to a single library

## [0.12.0] - 2026-07-29

### Added

- Rate limiting tests
- Response time tracking and performance monitoring documentation
- Database migration standards and performance optimization guides
- Data archival implementation and data protection/privacy documentation
- Feature flags documentation
- Infrastructure as code documentation
- KYC and verification guides
- Troubleshooting guide

### Fixed

- Various backend and frontend stability improvements

## [0.11.0] - 2026-07-01

### Added

- API key scoping, feedback rate limiting, inquiry state machine, and partial escrow refunds
- Transactions/AI/i18n test coverage and record transactions-controller decisions
- DTO validation to security/search/rent controllers and rent unit tests

### Changed

- Improved security and search controller validation

## [0.10.0] - 2026-06-01

### Added

- Backend hardening: monitoring rule split, maintenance SLA enforcement, KYC document retention, configurable fraud thresholds

### Fixed

- Booking race conditions and notification retry logic

## [0.9.0] - 2026-05-03

### Added

- Document signing coverage and favorites pagination
- Queue metrics and review booking verification

## [0.8.0] - 2026-04-21

### Added

- Property search filter state reflected in URL
- Web vitals regression alerting

### Fixed

- Hardened maintenance stream and web vitals endpoint

## [0.7.0] - 2026-03-21

### Added

- Partial escrow release and damage deduction with multi-sig authorization
- AI property matching v2
- Deployment environments and release operations documentation
- Monitoring, release contracts, and upgrade documentation

### Changed

- Refactored smart contract CI/CD workflow
- Improved JWT and CSRF secret handling
- Enhanced CSRF middleware and type safety
- Refactored navbar to use constants/navigation.ts

## [0.6.0] - 2026-02-19

### Added

- Landlord dashboard with KPIs, charts, and property portfolio
- Rent agreement module implementation
- Security features section
- Properties listing page
- Footer component
- Dashboard redesign and implementation
- View functions on rent agreement
- Health check system with Terminus
- HTTP request/response logging middleware
- TypeORM setup, core entities, and Docker infrastructure
- Swagger documentation infrastructure
- CI/CD pipeline for the contract directory

### Fixed

- Lint errors and pure function calls in dashboard components
- Cargo fmt formatting issues in escrow module
- Clippy warnings and empty line issues

## [0.5.0] - 2026-01-28

### Added

- Rent payment processing system with commission splitting
- Card component
- Rent agreement creation and storage
- Base contract structure
- Deposit security function with error types and unit tests
- Tailwind CSS design system with brand colors and typography

### Fixed

- Design issues
- Test issues and status formatting

## [0.1.0] - 2026-01-18

### Added

- Initial project setup
- Frontend and backend initialization
- Smart contract initialization
- Shared types

---

[Unreleased]: https://github.com/chizmah/chioma/compare/v0.12.0...HEAD
[0.12.0]: https://github.com/chizmah/chioma/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/chizmah/chioma/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/chizmah/chioma/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/chizmah/chioma/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/chizmah/chioma/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/chizmah/chioma/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/chizmah/chioma/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/chizmah/chioma/compare/v0.1.0...v0.5.0
[0.1.0]: https://github.com/chizmah/chioma/releases/tag/v0.1.0
