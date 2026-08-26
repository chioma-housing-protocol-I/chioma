import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserProfileDto } from './update-user.dto';

describe('UpdateUserProfileDto phoneNumber', () => {
  async function normalizeAndValidate(
    input: unknown,
  ): Promise<{ value: unknown; errorCount: number }> {
    const dto = plainToInstance(UpdateUserProfileDto, { phoneNumber: input });
    const errors = await validate(dto);
    return { value: dto.phoneNumber, errorCount: errors.length };
  }

  it('accepts a valid  format and normalizes it to E.164', async () => {
    const { value, errorCount } = await normalizeAndValidate('08012345678');
    expect(errorCount).toBe(0);
    expect(value).toBe('+2348012345678');
  });

  it('accepts a valid +234 format and keeps it canonical', async () => {
    const { value, errorCount } = await normalizeAndValidate('+2348012345678');
    expect(errorCount).toBe(0);
    expect(value).toBe('+2348012345678');
  });

  it('normalizes formatted +234 input', async () => {
    const { value, errorCount } =
      await normalizeAndValidate('+234 801 234 5678');
    expect(errorCount).toBe(0);
    expect(value).toBe('+2348012345678');
  });

  it('normalizes 00-prefixed international input', async () => {
    const { value, errorCount } =
      await normalizeAndValidate('00234 801 234 5678');
    expect(errorCount).toBe(0);
    expect(value).toBe('+2348012345678');
  });

  it('produces the same canonical value for equivalent representations', async () => {
    const inputs = [
      '08012345678',
      '8012345678',
      '2348012345678',
      '+2348012345678',
      '+234 801 234 5678',
      '+234-801-234-5678',
      '00234 801 234 5678',
    ];
    for (const input of inputs) {
      const { value, errorCount } = await normalizeAndValidate(input);
      expect(errorCount).toBe(0);
      expect(value).toBe('+2348012345678');
    }
  });

  it('rejects malformed values such as abc, +, and invalid numbers', async () => {
    for (const input of ['abc', 'abc8012345678', '+', 'not a phone', '123']) {
      const { errorCount } = await normalizeAndValidate(input);
      expect(errorCount).toBeGreaterThan(0);
    }
  });

  it('rejects non-Nigerian numbers', async () => {
    const { value, errorCount } = await normalizeAndValidate('+15551234567');
    expect(errorCount).toBeGreaterThan(0);
    expect(value).toBe('+15551234567');
  });

  it('treats an empty string as a clear (null) and is not an error', async () => {
    const { value, errorCount } = await normalizeAndValidate('');
    expect(errorCount).toBe(0);
    expect(value).toBeNull();
  });

  it('treats null as a clear (null) and is not an error', async () => {
    const { value, errorCount } = await normalizeAndValidate(null);
    expect(errorCount).toBe(0);
    expect(value).toBeNull();
  });

  it('leaves the field undefined when omitted', async () => {
    const dto = plainToInstance(UpdateUserProfileDto, { firstName: 'Ada' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.phoneNumber).toBeUndefined();
  });
});
