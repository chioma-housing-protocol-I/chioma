# Security Audit Notes

## Current Status

As of the latest audit, there are 33 vulnerabilities found in the frontend dependencies:

- 2 low severity
- 20 moderate severity
- 10 high severity
- 1 critical severity

## Root Cause Analysis

The vulnerabilities are primarily in transitive dependencies that are difficult to patch:

### 1. **protobufjs** (Critical & High)

- **Issue**: Multiple vulnerabilities in protobufjs versions < 7.5.6
- **Root Cause**: `@trezor/protobuf` (v1.5.1-1.5.2) depends on protobufjs 7.4.0
- **Affected Packages**:
  - `@trezor/connect` → `@trezor/blockchain-link` → `@trezor/protobuf` → protobufjs
  - `@jsr/creit-tech__stellar-wallets-kit` → `@trezor/connect-plugin-stellar` → protobufjs
- **Status**: Requires upstream updates to `@trezor/protobuf` and related packages

### 2. **axios** (High)

- **Issue**: Multiple prototype pollution and NO_PROXY bypass vulnerabilities in axios < 1.15.1
- **Root Cause**: `@coinbase/cdp-sdk` depends on axios 1.15.0
- **Affected Packages**:
  - `@jsr/creit-tech__stellar-wallets-kit` → `@reown/appkit` → `@coinbase/cdp-sdk` → axios
- **Status**: Requires upstream updates to `@coinbase/cdp-sdk`

### 3. **fast-uri** (High)

- **Issue**: Path traversal and host confusion vulnerabilities in fast-uri <= 3.1.1
- **Root Cause**: `ajv` depends on fast-uri 3.1.0
- **Affected Packages**:
  - `ajv` → fast-uri
  - `ajv-keywords` → `ajv` → fast-uri
  - `schema-utils` → `ajv` → fast-uri
- **Status**: Requires upstream updates to `ajv`

## Mitigation Attempts

The following mitigation strategies were attempted:

1. **pnpm Overrides**: Added overrides in package.json for protobufjs (^7.5.6), axios (^1.15.2), and fast-uri (^3.1.2)
   - **Result**: Limited effectiveness due to lockfile constraints

2. **Dependency Updates**: Updated `@jsr/creit-tech__stellar-wallets-kit` from 2.0.0 to 2.2.0
   - **Result**: Reduced vulnerabilities slightly but core issues remain

3. **Clean Reinstall**: Removed node_modules and reinstalled with overrides
   - **Result**: Overrides not applied due to locked transitive dependencies

## Recommendations

1. **Monitor Upstream**: Keep track of updates to:
   - `@trezor/protobuf` (for protobufjs fix)
   - `@coinbase/cdp-sdk` (for axios fix)
   - `ajv` (for fast-uri fix)

2. **Alternative Packages**: Consider evaluating alternative packages if upstream updates are delayed:
   - For Trezor integration: Check if newer versions of `@trezor/connect` are available
   - For Coinbase integration: Check if newer versions of `@coinbase/cdp-sdk` are available

3. **Risk Assessment**: While these vulnerabilities are concerning, they primarily affect:
   - Prototype pollution attacks (requires specific attack vectors)
   - NO_PROXY bypass (affects proxy configurations)
   - Path traversal in URI parsing (affects specific use cases)

   The actual risk depends on how these libraries are used in the application.

4. **Future Action**: Once upstream packages are updated, regenerate the lockfile with:
   ```bash
   pnpm install --no-frozen-lockfile
   ```

## Testing

To verify the current state:

```bash
pnpm audit --audit-level=high
```

To check specific package versions:

```bash
pnpm why protobufjs
pnpm why axios
pnpm why fast-uri
```
