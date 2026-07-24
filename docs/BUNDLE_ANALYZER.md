# Next.js Bundle Analyzer & Size Budgets

This document outlines how to use `@next/bundle-analyzer`, interpret bundle treemaps, and manage JS size budgets in the Chioma frontend workspace.

---

## 1. Running the Bundle Analyzer Locally

To generate an interactive HTML treemap of client-side and server-side JS bundles:

```bash
cd frontend
pnpm run analyze
```

This sets `ANALYZE=true` and runs `next build`. Once compilation completes, `@next/bundle-analyzer` will automatically open interactive HTML reports in your browser showing the breakdown of all chunks:
- **`client.html`**: Client-side JS bundle composition.
- **`server.html`**: Server-side JS bundle composition.

---

## 2. Reading the Analyzer Report

- **Large Blocks**: Each block represents a module/package. The visual area of a block is directly proportional to its parsed size.
- **Colors**: Distinct colors group modules belonging to the same package or chunk.
- **Hover Info**: Hovering over a block displays its Stat size, Parsed size, and Gzipped size.
- **Optimization Targets**: Look out for unexpectedly large third-party libraries or duplicate packages imported across different routes.

---

## 3. Enforcing and Managing Size Budgets

Per-route bundle size budgets are defined in [`frontend/bundle-budgets.json`](../frontend/bundle-budgets.json).

### Checking Budgets Locally

After running a build (`pnpm run build`), check your chunk sizes against budgets:

```bash
pnpm run size:check
```

The script outputs a summary table with `PASS`, `WARN`, or `FAIL` statuses per route segment.

### Budget Configuration Structure

```json
{
  "routes": {
    "/": { "maxKB": 500, "warnKB": 350 },
    "/properties": { "maxKB": 550, "warnKB": 400 },
    "shared-chunks": { "maxKB": 700, "warnKB": 550 }
  }
}
```

- **`warnKB`**: Triggers a yellow `WARN` warning in local scripts and CI logs.
- **`maxKB`**: Triggers a red `FAIL` error and causes `size:check` to exit with a non-zero status code, failing CI.

---

## 4. CI/CD Integration

In `.github/workflows/frontend-ci-cd.yml`, the **`bundle-size`** job automatically:
1. Runs after the `build` job completes.
2. Executes `pnpm run size:check`.
3. Posts/updates a markdown summary comment on Pull Requests.
4. Uploads `/tmp/size-report.txt` as a workflow artifact.
5. Fails the workflow build if any route exceeds its `maxKB` budget limit.
