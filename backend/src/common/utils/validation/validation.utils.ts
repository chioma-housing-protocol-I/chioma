export class ValidationUtils {
  /**
   * Validates an email address format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static normalizePhoneNumber(value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (trimmed === '') return null;

    // Remove ONLY legitimate formatting characters.
    const stripped = trimmed.replace(/[\s\-().]/g, '');

    // If anything besides digits and an optional leading '+' remains, the
    // input is malformed — return it unchanged so validation rejects it.
    if (!/^\+?\d+$/.test(stripped)) return trimmed;

    let digits = stripped;
    if (digits.startsWith('00')) {
      digits = digits.slice(2); // international prefix (00…)
    } else if (digits.startsWith('+')) {
      digits = digits.slice(1);
    }

    if (digits.startsWith('0')) {
      // National number with trunk prefix: 08012345678 → 2348012345678
      digits = `234${digits.slice(1)}`;
    } else if (digits.startsWith('234') && digits.length >= 12) {
      // Already contains the +234 country code (e.g. 2348012345678)
    } else if (digits.length === 10) {
      // National number without trunk prefix: 8012345678 → 2348012345678
      digits = `234${digits}`;
    }

    return `+${digits}`;
  }

  /**
   * Validates if a value is a valid Date object or date string
   */
  static validateDate(date: any): boolean {
    if (date instanceof Date) {
      return !isNaN(date.getTime());
    }
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  /**
   * Validates a URL format
   */
  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates a Stellar wallet address (G... format)
   */
  static validateWalletAddress(address: string): boolean {
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    return stellarAddressRegex.test(address);
  }

  /**
   * Validates that a decoded JWT payload's `type` claim matches the
   * expected token type (e.g. an access token used where a refresh
   * token is required, or vice versa)
   */
  static validateTokenType(
    payload: { type?: string } | null | undefined,
    expectedType: 'access' | 'refresh',
  ): boolean {
    return payload?.type === expectedType;
  }
}
