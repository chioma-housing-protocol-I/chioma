export class ValidationUtils {
  /**
   * Validates an email address format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates a phone number format (Basic international format)
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
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
}
