import { ValidationUtils } from '../validation.utils';

describe('ValidationUtils', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(ValidationUtils.validateEmail('test@example.com')).toBe(true);
      expect(ValidationUtils.validateEmail('user.name+tag@domain.co.uk')).toBe(
        true,
      );
    });

    it('should return false for invalid emails', () => {
      expect(ValidationUtils.validateEmail('invalid-email')).toBe(false);
      expect(ValidationUtils.validateEmail('user@')).toBe(false);
      expect(ValidationUtils.validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should return true for valid international phones', () => {
      expect(ValidationUtils.validatePhone('+1234567890')).toBe(true);
      expect(ValidationUtils.validatePhone('1234567890')).toBe(true);
    });

    it('should return false for invalid phones', () => {
      expect(ValidationUtils.validatePhone('abc')).toBe(false);
      expect(ValidationUtils.validatePhone('+')).toBe(false);
    });
  });

  describe('validateWalletAddress', () => {
    it('should return true for valid Stellar addresses', () => {
      const validAddress =
        'GDH7I6L2L5QO5XUXW7Y7G7Z7A7B7C7D7E7F7G7H7I7J7K7L7M7N7O7P7';
      expect(ValidationUtils.validateWalletAddress(validAddress)).toBe(true);
    });

    it('should return false for invalid Stellar addresses', () => {
      expect(ValidationUtils.validateWalletAddress('G123')).toBe(false);
      expect(ValidationUtils.validateWalletAddress('abc')).toBe(false);
    });
  });
});
