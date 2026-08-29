import { PropertyInquiryStatus } from './entities/property-inquiry.entity';
import {
  INQUIRY_STATUS_TRANSITIONS,
  InvalidInquiryTransitionError,
  assertInquiryTransition,
  canTransitionInquiry,
} from './inquiry-state-machine';

describe('inquiry state machine', () => {
  const allStatuses = Object.values(PropertyInquiryStatus);

  it('covers every status in the transition table', () => {
    for (const status of allStatuses) {
      expect(INQUIRY_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  const legal: Array<[PropertyInquiryStatus, PropertyInquiryStatus]> = [
    [PropertyInquiryStatus.PENDING, PropertyInquiryStatus.VIEWED],
    [PropertyInquiryStatus.PENDING, PropertyInquiryStatus.RESPONDED],
    [PropertyInquiryStatus.PENDING, PropertyInquiryStatus.CLOSED],
    [PropertyInquiryStatus.VIEWED, PropertyInquiryStatus.RESPONDED],
    [PropertyInquiryStatus.VIEWED, PropertyInquiryStatus.CLOSED],
    [PropertyInquiryStatus.RESPONDED, PropertyInquiryStatus.CLOSED],
  ];

  it.each(legal)('allows %s -> %s', (from, to) => {
    expect(canTransitionInquiry(from, to)).toBe(true);
    expect(() => assertInquiryTransition(from, to)).not.toThrow();
  });

  it('rejects every transition not in the table', () => {
    const legalSet = new Set(legal.map(([from, to]) => `${from}->${to}`));
    for (const from of allStatuses) {
      for (const to of allStatuses) {
        if (legalSet.has(`${from}->${to}`)) continue;
        expect(canTransitionInquiry(from, to)).toBe(false);
        expect(() => assertInquiryTransition(from, to)).toThrow(
          InvalidInquiryTransitionError,
        );
      }
    }
  });

  it('treats CLOSED as terminal', () => {
    expect(INQUIRY_STATUS_TRANSITIONS[PropertyInquiryStatus.CLOSED]).toEqual(
      [],
    );
  });

  it('exposes a stable domain error code', () => {
    try {
      assertInquiryTransition(
        PropertyInquiryStatus.CLOSED,
        PropertyInquiryStatus.VIEWED,
      );
      fail('expected InvalidInquiryTransitionError');
    } catch (error) {
      const response = (error as InvalidInquiryTransitionError).getResponse();
      expect(response).toMatchObject({
        code: 'INQUIRY_INVALID_TRANSITION',
      });
    }
  });
});
