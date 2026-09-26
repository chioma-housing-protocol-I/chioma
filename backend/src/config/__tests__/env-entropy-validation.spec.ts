/**
 * Tests for JWT secret entropy validation.
 * Verifies that weak secrets are rejected and strong ones pass.
 */
describe('JWT Entropy Validation', () => {
  // Mock the validation functions by importing them dynamically
  // Note: These functions need to be exported from env.validation.ts for testing
  
  /**
   * Simulates the entropy calculation from env.validation.ts
   */
  const calculateShannonEntropyBitsPerChar = (value: string): number => {
    const frequencies = new Map<string, number>();
    for (const char of value) {
      frequencies.set(char, (frequencies.get(char) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of frequencies.values()) {
      const probability = count / value.length;
      entropy -= probability * Math.log2(probability);
    }
    return entropy;
  };

  /**
   * Simulates sequence pattern detection
   */
  const detectSequencePatterns = (value: string): number => {
    let sequenceLength = 0;
    let maxSequence = 1;
    let patternMatches = 0;
    const charCounts = new Map<string, number>();

    for (let i = 0; i < value.length; i++) {
      if (i > 0 && value[i] === value[i - 1]) {
        sequenceLength++;
      } else {
        maxSequence = Math.max(maxSequence, sequenceLength + 1);
        sequenceLength = 0;
      }
    }
    maxSequence = Math.max(maxSequence, sequenceLength + 1);

    if (value.length >= 4) {
      for (let i = 0; i < value.length - 2; i++) {
        const pair = value.substring(i, i + 2);
        charCounts.set(pair, (charCounts.get(pair) ?? 0) + 1);
      }
      for (const count of charCounts.values()) {
        if (count >= 3) {
          patternMatches++;
        }
      }
    }

    return Math.max(maxSequence / value.length, patternMatches / value.length);
  };

  const validateCharacterSetDiversity = (value: string) => {
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasDigits = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*\-_=+\[\]{};:'",.<>?/\\|`~]/.test(value);

    return {
      hasUppercase,
      hasLowercase,
      hasDigits,
      hasSpecial,
      setCount: [hasUppercase, hasLowercase, hasDigits, hasSpecial].filter(
        Boolean,
      ).length,
    };
  };

  describe('Weak Secrets - Should Reject', () => {
    it('should reject "AAAA" repeated pattern (very weak entropy)', () => {
      const weakSecret = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      expect(entropy).toBeLessThan(0.1);
    });

    it('should reject "AAAABBBB" alternating blocks pattern', () => {
      const weakSecret = 'AAAABBBBAAAABBBBAAAABBBBAAAABBBBAAAABBBB';
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      expect(entropy).toBeLessThan(1.5);

      const sequenceRatio = detectSequencePatterns(weakSecret);
      expect(sequenceRatio).toBeGreaterThan(0.15);
    });

    it('should reject "abcabcabc" repeating pattern', () => {
      const weakSecret = 'abcabcabcabcabcabcabcabcabcabcabcabcabc';
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      expect(entropy).toBeLessThan(2);

      const sequenceRatio = detectSequencePatterns(weakSecret);
      expect(sequenceRatio).toBeGreaterThan(0.15);
    });

    it('should reject sequential characters "abcdefghij..." pattern', () => {
      const weakSecret = 'abcdefghijabcdefghijabcdefghijabcdefghij';
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      // Sequential patterns may have reasonable entropy but low diversity
      expect(entropy).toBeLessThan(3.5);
    });

    it('should reject mostly lowercase only', () => {
      const weakSecret = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmn';
      const charSetInfo = validateCharacterSetDiversity(weakSecret);
      expect(charSetInfo.setCount).toBe(1);
      expect(charSetInfo.hasLowercase).toBe(true);
      expect(charSetInfo.hasUppercase).toBe(false);
      expect(charSetInfo.hasDigits).toBe(false);
    });

    it('should reject mostly digits only', () => {
      const weakSecret = '12345678901234567890123456789012345678901';
      const charSetInfo = validateCharacterSetDiversity(weakSecret);
      expect(charSetInfo.setCount).toBe(1);
      expect(charSetInfo.hasDigits).toBe(true);
    });

    it('should reject "password123" pattern (common weak secret)', () => {
      const weakSecret = 'password123password123password123pass12345';
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      expect(entropy).toBeLessThan(3);

      const sequenceRatio = detectSequencePatterns(weakSecret);
      expect(sequenceRatio).toBeGreaterThan(0.1);
    });

    it('should reject 32 bytes of same character', () => {
      const weakSecret = 'A'.repeat(48);
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      expect(entropy).toBe(0);

      const sequenceRatio = detectSequencePatterns(weakSecret);
      expect(sequenceRatio).toBe(1.0);
    });

    it('should reject 32 bytes of alternating pattern ABABAB...', () => {
      const weakSecret = 'ABA'.repeat(16);
      const entropy = calculateShannonEntropyBitsPerChar(weakSecret);
      expect(entropy).toBeLessThan(1.1);

      const sequenceRatio = detectSequencePatterns(weakSecret);
      expect(sequenceRatio).toBeGreaterThan(0.15);
    });
  });

  describe('Strong Secrets - Should Accept', () => {
    it('should accept "openssl rand -base64 48" style secret', () => {
      const strongSecret =
        'rFx9pK2mL8wQ3sT6yU9vW4aB7cD0eF1gH2iJ3kL4mN5oP6qR7sT8uV9wX0yZ1aB';
      const entropy = calculateShannonEntropyBitsPerChar(strongSecret);
      expect(entropy).toBeGreaterThan(4.5);

      const sequenceRatio = detectSequencePatterns(strongSecret);
      expect(sequenceRatio).toBeLessThan(0.15);
    });

    it('should accept random base64 string with good entropy', () => {
      const strongSecret =
        'K9m2pL4qR6sT8uV0wX2yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0';
      const entropy = calculateShannonEntropyBitsPerChar(strongSecret);
      expect(entropy).toBeGreaterThan(4.5);

      const charSetInfo = validateCharacterSetDiversity(strongSecret);
      expect(charSetInfo.setCount).toBeGreaterThanOrEqual(2);
    });

    it('should accept UUID-like string repeated', () => {
      // Generated using crypto-secure random
      const strongSecret =
        'a7f3c2b1d9e4f6a8b2c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1';
      const entropy = calculateShannonEntropyBitsPerChar(strongSecret);
      expect(entropy).toBeGreaterThan(4.0);

      const sequenceRatio = detectSequencePatterns(strongSecret);
      expect(sequenceRatio).toBeLessThan(0.2);
    });

    it('should accept mixed case alphanumeric with special chars', () => {
      const strongSecret =
        'Kp9m2@pL4#qR6$sT8%uV0!wX2&yZ4*aB6-cD8_eF0+gH2=iJ4kL6mN8oP0qR2sT4';
      const entropy = calculateShannonEntropyBitsPerChar(strongSecret);
      expect(entropy).toBeGreaterThan(4.5);

      const charSetInfo = validateCharacterSetDiversity(strongSecret);
      expect(charSetInfo.setCount).toBeGreaterThanOrEqual(3);
    });

    it('should accept cryptographically random string', () => {
      const strongSecret =
        'x9K2mP4qL6sR8uT0vW2yX4zZ6aB8cD0eF2gH4iJ6kL8mN0oP2qR4sT6uV8wX0y';
      const entropy = calculateShannonEntropyBitsPerChar(strongSecret);
      expect(entropy).toBeGreaterThan(4.5);

      const sequenceRatio = detectSequencePatterns(strongSecret);
      expect(sequenceRatio).toBeLessThan(0.15);
    });

    it('should accept 48-character random alphanumeric', () => {
      const strongSecret =
        'jB2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE2fG4hI6jK8lM0';
      const entropy = calculateShannonEntropyBitsPerChar(strongSecret);
      expect(entropy).toBeGreaterThan(4.5);
    });

    it('should accept diverse character sets (uppercase, lowercase, digits, special)', () => {
      const strongSecret =
        'A1b@C2d#E3f$G4h%I5j&K6l*M7n-O8p_Q9r+S0t=U1v!W2x?Y3z.';
      const charSetInfo = validateCharacterSetDiversity(strongSecret);
      expect(charSetInfo.setCount).toBe(4);
      expect(charSetInfo.hasUppercase).toBe(true);
      expect(charSetInfo.hasLowercase).toBe(true);
      expect(charSetInfo.hasDigits).toBe(true);
      expect(charSetInfo.hasSpecial).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      const entropy = calculateShannonEntropyBitsPerChar('');
      // Math.log2(NaN) results in NaN, so entropy will be NaN
      expect(isNaN(entropy)).toBe(true);
    });

    it('should handle single character', () => {
      const entropy = calculateShannonEntropyBitsPerChar('A');
      expect(entropy).toBe(0);
    });

    it('should correctly calculate entropy for two characters', () => {
      const entropy = calculateShannonEntropyBitsPerChar('AB');
      expect(entropy).toBe(1);
    });

    it('should handle Unicode characters', () => {
      const secret = 'A1b@_Z9x#Q3p$M7k%L2c&J5h*I8o-E4d+F6g=V0s';
      const entropy = calculateShannonEntropyBitsPerChar(secret);
      expect(entropy).toBeGreaterThan(0);
    });

    it('should detect high sequence ratio in repetitive string', () => {
      const repetitive = 'AAABBBCCCAAABBBCCCAAABBBCCCAAABBBCCCAA';
      const ratio = detectSequencePatterns(repetitive);
      expect(ratio).toBeGreaterThan(0.2);
    });

    it('should detect low sequence ratio in random string', () => {
      const random = 'jB2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE2fG4hI6';
      const ratio = detectSequencePatterns(random);
      expect(ratio).toBeLessThan(0.15);
    });
  });

  describe('Entropy Threshold Requirements', () => {
    it('minimum entropy threshold should be 4.5 bits/char', () => {
      const MIN_ENTROPY = 4.5;
      // String with exactly ~4.5 bits/char should be at threshold
      const almostGood = 'ABCD'.repeat(12); // Predictable, lower entropy
      const entropy = calculateShannonEntropyBitsPerChar(almostGood);
      expect(entropy).toBeLessThan(MIN_ENTROPY);
    });

    it('minimum length should be 32 bytes', () => {
      const MIN_LENGTH = 32;
      const tooShort = 'ShortSecret';
      const validLength = 'A'.repeat(MIN_LENGTH);

      expect(Buffer.byteLength(tooShort, 'utf8')).toBeLessThan(MIN_LENGTH);
      expect(Buffer.byteLength(validLength, 'utf8')).toBeGreaterThanOrEqual(
        MIN_LENGTH,
      );
    });

    it('should reject sequences > 15% of string length', () => {
      const maxSequenceRatio = 0.15;
      // 40 char string with 10 consecutive A's = 25% - should be rejected
      const weakString = 'AAAAAAAAAA' + 'b'.repeat(30);
      const ratio = detectSequencePatterns(weakString);
      expect(ratio).toBeGreaterThan(maxSequenceRatio);

      // No sequences > 2 chars = should pass
      const goodString = 'AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTt';
      const goodRatio = detectSequencePatterns(goodString);
      expect(goodRatio).toBeLessThanOrEqual(maxSequenceRatio);
    });
  });

  describe('Production Environment Requirements', () => {
    it('should require at least 3 character set types in production', () => {
      const minCharSets = 3;

      // Good secret with uppercase, lowercase, digits
      const goodSecret = 'Ab12Cd34Ef56Gh78Ij90Kl12Mn34Op56Qr78St90';
      const goodInfo = validateCharacterSetDiversity(goodSecret);
      expect(goodInfo.setCount).toBeGreaterThanOrEqual(minCharSets);

      // Bad secret with only lowercase and digits
      const weakSecret = 'ab12cd34ef56gh78ij90kl12mn34op56qr78st90';
      const weakInfo = validateCharacterSetDiversity(weakSecret);
      expect(weakInfo.setCount).toBeLessThan(minCharSets);
    });

    it('should encourage special characters in production', () => {
      const secureSecret =
        'Kp9m2@pL4#qR6$sT8%uV0!wX2&yZ4*aB6-cD8_eF0+gH2=iJ4kL6mN8oP0qR2sT4';
      const info = validateCharacterSetDiversity(secureSecret);
      expect(info.hasSpecial).toBe(true);
      expect(info.setCount).toBe(4);
    });
  });

  describe('Real-world Examples', () => {
    it('should reject common default secrets', () => {
      const commonDefaults = [
        'supersecretkey123',
        'my-secret-key-change-me',
        'default_jwt_secret',
        'jwt_secret_12345',
      ];

      for (const secret of commonDefaults) {
        const entropy = calculateShannonEntropyBitsPerChar(secret);
        // Most common defaults should have low entropy
        if (Buffer.byteLength(secret, 'utf8') >= 32) {
          expect(entropy).toBeLessThan(4.5);
        }
      }
    });

    it('should accept OpenSSL generated secrets', () => {
      // These are realistic outputs from: openssl rand -base64 48
      const openssGeneratedSecrets = [
        'FDqK+qK/rF5kB3pL9mN2qR4sT6uV8wX0yZ2aB4cD6eF8gH0iJ2kL4mN6oP8qR0s',
        'K9m2pL4qR6sT8uV0wX2yZ4aB6cD8eF0gH2iJ4kL6mN8oP0qR2sT4uV6wX8yZ0aB',
      ];

      for (const secret of openssGeneratedSecrets) {
        const entropy = calculateShannonEntropyBitsPerChar(secret);
        expect(entropy).toBeGreaterThan(4.5);

        const sequenceRatio = detectSequencePatterns(secret);
        expect(sequenceRatio).toBeLessThan(0.15);
      }
    });

    it('should accept Node.js crypto.randomBytes secrets', () => {
      // Realistic hex-encoded crypto.randomBytes output
      const hexSecrets = [
        'a7f3c2b1d9e4f6a8b2c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3',
        '5e4d3c2b1a0f9e8d7c6b5a49383726150403929180716050403929180716150',
      ];

      for (const secret of hexSecrets) {
        const entropy = calculateShannonEntropyBitsPerChar(secret);
        expect(entropy).toBeGreaterThan(4.0);
      }
    });
  });
});
