import { BadRequestException } from '@nestjs/common';
import { Payment } from './payment.entity';

describe('Payment.validateMetadata', () => {
  it('leaves valid metadata untouched', () => {
    const payment = new Payment();
    payment.metadata = { chargeId: 'ch_1', escrowId: 5 };

    payment.validateMetadata();

    expect(payment.metadata).toEqual({ chargeId: 'ch_1', escrowId: 5 });
  });

  it('allows null metadata', () => {
    const payment = new Payment();
    payment.metadata = null;

    payment.validateMetadata();

    expect(payment.metadata).toBeNull();
  });

  it('rejects metadata with the wrong field type', () => {
    const payment = new Payment();
    payment.metadata = { chargeId: 12345 } as unknown as Payment['metadata'];

    expect(() => payment.validateMetadata()).toThrow(BadRequestException);
  });
});
