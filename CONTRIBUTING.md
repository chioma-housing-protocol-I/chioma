# Contributing

Thanks for contributing to this project.

## Setup

1. Fork and clone this repository.
2. Install dependencies from the project toolchain files.
3. Run the test suite (or build) before opening a pull request.

## Pull requests

- Keep changes focused and clearly described.
- Link related issues (for example `Fixes #123`).
- Include a short test plan.
- Match existing code style.

## Commit and branch conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), enforced locally by commitlint via a husky `commit-msg` hook (installed by `pnpm install`):

```
<type>(<optional scope>): <subject>
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Examples: `feat(feedback): add admin inbox`, `fix(contract): check auth on withdraw`.

Branches use `<type>/<short-description>`, e.g. `feat/admin-feedback-inbox` or `fix/1234-rate-limit`.

Pull requests touching `contract/` must complete the [contract review checklist](contract/docs/deployment/READINESS_CHECKLIST.md) (use `?template=contract.md`; a bot comment also adds it).

## Frontend components

Before adding or moving a component under `frontend/components/`, read the [Component Authoring Conventions](frontend/README.md#component-authoring-conventions) in the frontend README (placement, naming, prop typing, server/client boundary). The full guide, with examples, lives in [frontend/CONTRIBUTING.md](frontend/CONTRIBUTING.md#component-architecture).

## Conduct

Be respectful and constructive in reviews and discussions.
