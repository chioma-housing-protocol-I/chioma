import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  requireEntity,
  requireNonEmptyString,
  requirePositiveAmount,
  requireValue,
} from './payment.helpers';

describe('payment null guards (#2172)', () => {
  describe('shared assertions', () => {
    it('requireValue returns a present value and rejects null or undefined', () => {
      expect(requireValue('ok', 'Value is required')).toBe('ok');
      expect(() => requireValue(null, 'Value is required')).toThrow(
        BadRequestException,
      );
      expect(() => requireValue(undefined, 'Value is required')).toThrow(
        'Value is required',
      );
    });

    it('requireNonEmptyString rejects empty and whitespace-only strings', () => {
      expect(requireNonEmptyString(' user ', 'User ID')).toBe(' user ');
      expect(() => requireNonEmptyString('', 'Payment ID')).toThrow(
        'Payment ID is required',
      );
      expect(() => requireNonEmptyString('   ', 'Payment ID')).toThrow(
        BadRequestException,
      );
    });

    it('requirePositiveAmount rejects invalid currency amounts', () => {
      expect(requirePositiveAmount(10.25)).toBe(10.25);
      expect(() => requirePositiveAmount(undefined)).toThrow(
        'Payment amount is required',
      );
      expect(() => requirePositiveAmount(Number.NaN)).toThrow(
        'Payment amount must be a valid number',
      );
      expect(() => requirePositiveAmount(0)).toThrow(
        'Payment amount must be greater than 0',
      );
      expect(() => requirePositiveAmount(1_000_000_000)).toThrow(
        'Payment amount cannot exceed 999,999,999.99',
      );
      expect(() => requirePositiveAmount(1.005)).toThrow(
        'Payment amount can have at most 2 decimal places',
      );
    });

    it('requireEntity raises a not-found error for a missing record', () => {
      expect(requireEntity({ id: 1 }, 'Payment not found')).toEqual({ id: 1 });
      expect(() => requireEntity(null, 'Payment not found')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('service method entry guards', () => {
    const service = Object.create(PaymentService.prototype) as PaymentService;

    it('getPaymentById rejects an empty payment id before querying', async () => {
      await expect(service.getPaymentById('', 'user_1')).rejects.toThrow(
        'Payment ID is required',
      );
    });

    it('generateReceipt rejects an empty payment id', async () => {
      await expect(service.generateReceipt('  ', 'user_1')).rejects.toThrow(
        'Payment ID is required',
      );
    });

    it('listPayments rejects missing filters', async () => {
      await expect(
        service.listPayments(undefined as never, 'user_1'),
      ).rejects.toThrow('Payment filters are required');
    });

    it('completePaymentForBooking rejects a missing booking id', async () => {
      await expect(
        service.completePaymentForBooking(undefined as never),
      ).rejects.toThrow('Booking ID is required');
    });

    it('removePaymentMethod rejects a missing payment method id', async () => {
      await expect(
        service.removePaymentMethod(undefined as never, 'user_1'),
      ).rejects.toThrow('Payment method ID is required');
    });
  });
});
