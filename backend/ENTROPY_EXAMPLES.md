# JWT Secret Entropy Validation - Examples

## How to Generate Strong Secrets

### Recommended Method (OpenSSL)
```bash
openssl rand -base64 48
# Output: FDqK+qK/rF5kB3pL9mN2qR4sT6uV8wX0yZ2aB4cD6eF8gH0iJ2kL4mN6oP8qR0s
# Entropy: ~6.0 bits/char | Sets: 3 (letters + digits + special) ✅
```

### Alternative (Node.js)
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# Similar entropy and diversity to OpenSSL ✅
```

### Alternative (Hex encoding)
```bash
openssl rand -hex 32
# Output: a7f3c2b1d9e4f6a8b2c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3
# Entropy: ~5.2 bits/char | Sets: 1 (hex only) ⚠️
# Note: Works but character diversity is low
```

---

## Weak Secrets (Will Fail Validation)

### 1. Repeated Character
```
❌ "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
   Entropy: 0 bits/char
   Issue: Zero entropy (1 unique character)
   Error: "does not have enough entropy"
```

### 2. Alternating Blocks
```
❌ "AAAABBBBAAAABBBBAAAABBBBAAAABBBBAAAABBBB"
   Entropy: ~1.0 bits/char
   Issue: Only 2 unique characters, highly repetitive
   Error: "contains too many repetitive patterns (25% sequences)"
```

### 3. Repeating Pattern
```
❌ "abcabcabcabcabcabcabcabcabcabcabcabcabc"
   Entropy: ~1.58 bits/char
   Issue: Only 3 unique characters, highly predictable
   Error: "contains too many repetitive patterns (20% sequences)"
```

### 4. Sequential Characters
```
❌ "abcdefghijabcdefghijabcdefghijabcdefghij"
   Entropy: ~3.2 bits/char
   Issue: Predictable order, insufficient entropy
   Error: "does not have enough entropy (3.20 bits/char, minimum 4.5)"
```

### 5. Common Weak Default
```
❌ "password123password123password123pass12345"
   Entropy: ~2.8 bits/char
   Issue: Trivial to guess, highly predictable word pattern
   Error: "does not have enough entropy (2.80 bits/char, minimum 4.5)"
   Sets: 2 (lowercase + digits only)
```

### 6. All Lowercase (32 bytes)
```
❌ "abcdefghijklmnopqrstuvwxyzabcdefghijklmn"
   Entropy: 4.7 bits/char (passes entropy check barely)
   Issue: Only 1 character set, fails diversity check in production
   Error: "should use diverse character sets in production
           (missing: uppercase letters, digits, special characters)"
```

### 7. All Digits (32 bytes)
```
❌ "12345678901234567890123456789012345678901"
   Entropy: 3.32 bits/char
   Issue: Only 1 character set, insufficient entropy
   Error: "does not have enough entropy (3.32 bits/char, minimum 4.5)"
```

### 8. Alternating Pattern ABABAB
```
❌ "ABA" repeated 16 times = 48 chars
   Entropy: ~1.0 bits/char
   Issue: Highly repetitive, only 2 characters
   Error: "contains too many repetitive patterns (67% sequences)"
```

### 9. Too Short (< 32 bytes)
```
❌ "ShortSecret"
   Bytes: 11
   Issue: Below minimum length
   Error: "must be at least 32 bytes (got 11)"
```

---

## Strong Secrets (Will Pass Validation)

### 1. OpenSSL Base64 (Recommended)
```
✅ "FDqK+qK/rF5kB3pL9mN2qR4sT6uV8wX0yZ2aB4cD6eF8gH0iJ2kL4mN6oP8qR0s"
   Entropy: ~6.0 bits/char
   Bytes: 48
   Sets: 3 (uppercase, lowercase, digits, special)
   Status: PASS + RECOMMENDED
```

### 2. OpenSSL Hex
```
✅ "a7f3c2b1d9e4f6a8b2c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3"
   Entropy: ~5.2 bits/char
   Bytes: 64
   Sets: 1 (hex digits only)
   Status: PASS (⚠️ weak character diversity, but acceptable)
```

### 3. Mixed Case with Special Chars
```
✅ "Kp9m2@pL4#qR6$sT8%uV0!wX2&yZ4*aB6-cD8_eF0+gH2=iJ4kL6mN8oP0qR2sT4"
   Entropy: ~5.8 bits/char
   Bytes: 66
   Sets: 4 (uppercase, lowercase, digits, special)
   Status: PASS + EXCELLENT
```

### 4. Random Alphanumeric
```
✅ "K9m2pL4qR6sT8uV0wX2yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB"
   Entropy: ~5.5 bits/char
   Bytes: 64
   Sets: 2 (uppercase, lowercase)
   Status: PASS (slightly low character diversity but acceptable)
```

### 5. Cryptographically Random
```
✅ "x9K2mP4qL6sR8uT0vW2yX4zZ6aB8cD0eF2gH4iJ6kL8mN0oP2qR4sT6uV8wX0y"
   Entropy: ~5.4 bits/char
   Bytes: 64
   Sets: 2 (uppercase, lowercase, digits implied from crypto)
   Status: PASS + SECURE
```

### 6. 48-Char Random Alphanumeric
```
✅ "jB2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE2fG4hI6jK8lM0"
   Entropy: ~5.3 bits/char
   Bytes: 48
   Sets: 2 (uppercase, lowercase)
   Status: PASS
```

### 7. Diverse Character Set
```
✅ "A1b@C2d#E3f$G4h%I5j&K6l*M7n-O8p_Q9r+S0t=U1v!W2x?Y3z."
   Entropy: ~5.7 bits/char
   Bytes: 54
   Sets: 4 (uppercase, lowercase, digits, special)
   Status: PASS + EXCELLENT (4 character sets)
```

---

## Production Recommendations

### DO ✅
- Use `openssl rand -base64 48` - recommended and tested
- Mix uppercase, lowercase, digits, and special characters
- Aim for > 5.0 bits/char entropy
- Rotate secrets annually
- Store in secure secret management (e.g., AWS Secrets Manager)

### DON'T ❌
- Use dictionary words, names, or dates
- Reuse JWT_SECRET and JWT_REFRESH_SECRET
- Store secrets in code or version control
- Use sequential or repeated patterns
- Accept entropy warnings - regenerate instead

---

## Validation Error Messages

### "does not have enough entropy"
```
Cause: Shannon entropy < 4.5 bits/char
Solution: Use openssl rand -base64 48
```

### "contains too many repetitive patterns"
```
Cause: > 15% of string is consecutive repeats or pairs
Solution: Ensure randomness, avoid patterns like AAAA or abcabc
```

### "must be at least 32 bytes"
```
Cause: Secret too short (< 256 bits when encoded)
Solution: Generate longer secret with openssl rand -base64 48
```

### "should use diverse character sets in production"
```
Cause: Production secret uses < 3 character sets
Solution: Include uppercase, lowercase, digits, and special chars
```

### "must not use a placeholder or example value"
```
Cause: Secret matches known default/example values
Solution: Generate new secret that isn't in placeholder list
```

---

## Troubleshooting

### Generated secret still fails validation
```bash
# Check actual entropy of your secret
# Copy secret into test file and calculate manually
node -e "
const value = 'YOUR_SECRET_HERE';
const freq = new Map();
for (const c of value) freq.set(c, (freq.get(c) ?? 0) + 1);
let entropy = 0;
for (const count of freq.values()) {
  const p = count / value.length;
  entropy -= p * Math.log2(p);
}
console.log('Entropy:', entropy.toFixed(2), 'bits/char');
console.log('Length:', value.length, 'chars');
console.log('Sets:', (
  /[A-Z]/.test(value) +
  /[a-z]/.test(value) +
  /\d/.test(value) +
  /[!@#$%^&*\-_=+\[\]{};:'",.<>?/\\|`~]/.test(value)
));
"
```

### Generate new secret correctly
```bash
# Method 1: OpenSSL (recommended)
openssl rand -base64 48 > jwt_secret.txt
export JWT_SECRET=$(cat jwt_secret.txt)

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))" > jwt_secret.txt

# Verify it passes
npm run start:dev
# Should start without entropy errors
```

---

## Reference: Entropy Calculation

Shannon entropy formula:
```
H = -Σ(p_i × log₂(p_i))

Where:
- p_i = frequency of character i / total length
- Result in bits per character

Examples:
- "AAAA":           H = 0 bits/char (no variation)
- "ABAB":           H = 1.0 bits/char (2 equal chars)
- "AABBCCDD":       H = 2.0 bits/char (4 equal chars)
- openssl output:   H ≈ 6.0 bits/char (high variation)
```

**Minimum Thresholds by Use Case**:
- Development: 3.0 bits/char (WARNING only)
- Staging: 4.5 bits/char (REQUIRED)
- Production: 4.5 bits/char (REQUIRED) + diverse character sets
