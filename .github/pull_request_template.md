## 📝 Description

<!-- Brief description of the changes -->

## 🎯 Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to change)
- [ ] 📚 Documentation update
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security fix
- [ ] 🧹 Code cleanup/refactoring

## 🔗 Related Issues

<!-- Link to related issues -->

Closes #

## 📋 Changes Made

<!-- List the specific changes -->

-
-
-

## 🧪 Testing

<!-- How was this tested? -->

- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass locally

### Test Coverage

<!-- Describe what was tested -->

## 📊 Checklist

### Code Quality

- [ ] Code follows project style guidelines
- [ ] No console errors or warnings
- [ ] TypeScript/Rust types are correct
- [ ] No unused variables or imports
- [ ] Comments added for complex logic

### Testing

- [ ] All tests pass (`make check` / `cargo test`)
- [ ] New tests added for new functionality
- [ ] Edge cases considered
- [ ] Error scenarios tested

### Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated (if needed)
- [ ] Code comments added (if needed)
- [ ] CONTRIBUTING.md updated (if needed)

### Database (Backend only)

- [ ] Migrations created (if needed)
- [ ] Migrations tested locally
- [ ] Rollback tested
- [ ] Seed data updated (if needed)

### Security

- [ ] No hardcoded secrets
- [ ] Input validation added
- [ ] Authorization checks in place
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

### Performance

- [ ] No performance regressions
- [ ] Database queries optimized
- [ ] Bundle size impact assessed
- [ ] Caching considered

### Smart Contracts (Soroban / Rust only)

- [ ] Authorization checks () enforced on all state-mutating invocations
- [ ] Upgradeability & storage layout backward compatibility verified (no schema drift or type collisions)
- [ ] Storage footprint and TTL bump strategies accounted for (instance, temporary, persistent)
- [ ] Contract events conform to stable schemas with documented topics and data payloads
- [ ] Error enums use explicit numeric codes and match interface expectations
- [ ] Hermetic tests verify unauthorized invocations, invariant boundaries, and edge cases

### Breaking Changes

- [ ] No breaking changes to APIs
- [ ] No breaking changes to contracts
- [ ] Backward compatibility maintained
- [ ] Migration guide provided (if needed)

## 📸 Screenshots/Demo

<!-- Add screenshots or demo links for UI changes -->

## 🚀 Deployment Notes

<!-- Any special deployment considerations? -->

## 📖 Additional Context

<!-- Any additional information that reviewers should know -->

## 🔄 Reviewer Checklist

<!-- For reviewers to verify -->

- [ ] Code changes are clear and understandable
- [ ] Tests are comprehensive
- [ ] Documentation is accurate
- [ ] No security concerns
- [ ] No performance issues
- [ ] Follows project conventions
