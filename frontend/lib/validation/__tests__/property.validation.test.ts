import {
  propertyBasicDetailsSchema,
  propertyMediaSchema,
} from '@/lib/validation/property';

describe('property validation', () => {
  it('rejects invalid basic form details', () => {
    const parsed = propertyBasicDetailsSchema.safeParse({
      title: 'A',
      rent: 0,
      address: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts valid basic form details', () => {
    const parsed = propertyBasicDetailsSchema.safeParse({
      title: 'Modern two-bedroom flat',
      rent: 1200,
      address: '12 Broad Street, Victoria Island, Lagos',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects oversized media uploads', () => {
    const oversized = new File([new Uint8Array(6 * 1024 * 1024)], 'large.png', {
      type: 'image/png',
    });
    const parsed = propertyMediaSchema.safeParse({ images: [oversized] });
    expect(parsed.success).toBe(false);
  });
});
