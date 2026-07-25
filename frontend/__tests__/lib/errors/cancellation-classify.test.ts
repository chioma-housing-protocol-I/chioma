import { describe, it, expect } from 'vitest';
import { classifyUnknownError } from '@/lib/errors/classify';

describe('classifyUnknownError with cancellation', () => {
  it('classifies AbortError with user cancellation reason as REQUEST_CANCELLED', () => {
    const error = new DOMException('The user aborted a request.', 'AbortError');
    const result = classifyUnknownError(error, {
      source: 'test',
      action: 'cancel:user',
      metadata: { cancellationReason: 'user' },
    });
    expect(result.code).toBe('REQUEST_CANCELLED');
    expect(result.severity).toBe('info');
  });

  it('classifies AbortError without cancellation reason as NETWORK_TIMEOUT', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    const result = classifyUnknownError(error, {
      source: 'test',
      action: 'fetch:properties',
    });
    expect(result.code).toBe('NETWORK_TIMEOUT');
    expect(result.severity).toBe('warning');
  });

  it('classifies AbortError with timeout reason as NETWORK_TIMEOUT', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    const result = classifyUnknownError(error, {
      source: 'test',
      action: 'fetch:properties',
      metadata: { cancellationReason: 'timeout' },
    });
    expect(result.code).toBe('NETWORK_TIMEOUT');
  });
});
