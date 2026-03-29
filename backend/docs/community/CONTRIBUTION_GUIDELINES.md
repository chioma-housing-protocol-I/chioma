# Chioma Backend Contribution Guidelines

Welcome! This guide outlines the specific standards and workflows for contributing to the Chioma Backend.

## 1. Getting Started

1. Check the GitHub Issue tracker and assign yourself an available issue, or open a discussion for a new proposal.
2. Fork the repository and read the `backend/CONTRIBUTING.md` file for initial local setup requirements (installation, environment variables).
3. Check the existing Architecture documentation before planning large refactors.

## 2. Branch Naming

We use a standard branching naming convention to maintain a readable history:

*   **Feature**: `feat/<issue-number>-<short-description>` (e.g., `feat/123-add-user-cache`)
*   **Bugfix**: `fix/<issue-number>-<short-description>` (e.g., `fix/456-payment-webhook-timeout`)
*   **Documentation**: `docs/<issue-number>-<short-description>`
*   **Chore**: `chore/<issue-number>-<short-description>` (Maintenance, dependencies)

## 3. Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

*   **Format**: `type(scope): subject`
*   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`
*   **Scope** (Optional): Module name (e.g., `auth`, `property`, `stellar`)
*   **Subject**: Use the imperative, present tense ("add feature" not "added feature"). Don't capitalize the first letter. Keep it concise.
*   **Example**: `feat(auth): implement refresh token rotation`
*   **Body**: If the commit requires explanation, provide a detailed message body separated from the subject by an empty line.

## 4. Pull Requests

*   **Base Branch**: All PRs must target the `main` or specific environment branches (like `develop`) as specified by the core team.
*   **Draft PRs**: Open a Draft PR if you want early feedback on an unfinished implementation.
*   **Template**: Fill out the provided PR template comprehensively. Include the issue number (`Fixes #123`).
*   **Size**: Keep PRs small and focused. Large PRs delay reviews.

## 5. Code Review

*   **Reviewers**: Request reviews from the specific module owner or the `@chioma-housing-protocol/backend-reviewers` team.
*   **Approval**: All PRs require at least one approval from a core maintainer before merging.
*   **Feedback**: Address all review comments. Explicitly state when you have resolved a comment, or ask for clarification if needed. Avoid dismissing feedback outright.

## 6. Testing

*   **Coverage**: New features must include relevant Unit Tests (`.spec.ts`) and, where applicable, Integration/E2E Tests (`.e2e-spec.ts`).
*   **Passing CI**: The CI pipeline will automatically run all tests (`pnpm test:cov`). PRs with failing tests or reduced coverage will be blocked.

## 7. Documentation

*   **Inline Comments**: Document complex logic blocks and "why" this specific implementation was chosen over alternatives.
*   **Swagger API Docs**: All new or modified endpoints must be annotated with accurate `@ApiOperation`, `@ApiResponse`, and `@ApiProperty` decorators.
*   **README/Architecture**: Major module additions require updating the high-level architecture diagrams or `backend/README.md`.

## 8. Workflow

1. Discuss the issue conceptually in the issues tracker.
2. Create branch off `main`.
3. Implement code + tests.
4. Run formatting (`pnpm format`) and linting (`pnpm lint`).
5. Run tests locally (`pnpm test` and `pnpm test:e2e`).
6. Push and create PR.
7. Iterate based on review comments.
8. Merge!

## 9. Best Practices

*   **NestJS Standard**: Follow the official NestJS style guide.
*   **Type Safety**: Use strict typings. Avoid `any` unless absolutely necessary (which is rare).
*   **Early Returns**: Use early returns to reduce indentation and improve readability.
*   **Error Handling**: Utilize NestJS exception filters for consistent HTTP error responses. Always log errors internally contextually.

## 10. FAQ

*   *How do I handle database migrations?*
    See the specific section on TypeORM migrations in `backend/CONTRIBUTING.md`. Always test `migration:revert` before submitting!
*   *Can I use a new third-party dependency?*
    Any new dependency must be thoroughly justified due to security and bundle-size concerns. Mention it explicitly in the PR description.

---

## Contribution Checklist

- [ ] Issue discussed and assigned.
- [ ] Branch follows the `type/issue-desc` convention.
- [ ] Commit messages follow Conventional Commits.
- [ ] Code is formatted and passes the linter.
- [ ] Unit and E2E tests are written and passing.
- [ ] Swagger API docs correctly updated.
- [ ] PR template filled out completely.
