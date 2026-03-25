import { RequestContext } from '../request-context';

describe('RequestContext', () => {
  it('should store and retrieve values in context', () => {
    RequestContext.run({ requestId: 'test-req' }, () => {
      expect(RequestContext.requestId).toBe('test-req');
      expect(RequestContext.current()).toEqual({ requestId: 'test-req' });
    });
  });

  it('should be empty outside of a run block', () => {
    expect(RequestContext.requestId).toBeUndefined();
    expect(RequestContext.current()).toEqual({});
  });

  it('should maintain independent contexts for concurrent calls', async () => {
    const p1 = new Promise<void>((resolve) => {
      RequestContext.run({ correlationId: 'id-1' }, async () => {
        await new Promise((r) => setTimeout(r, 10));
        expect(RequestContext.correlationId).toBe('id-1');
        resolve();
      });
    });

    const p2 = new Promise<void>((resolve) => {
      RequestContext.run({ correlationId: 'id-2' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        expect(RequestContext.correlationId).toBe('id-2');
        resolve();
      });
    });

    await Promise.all([p1, p2]);
  });

  it('should allow partial updates to current context', () => {
    RequestContext.run({ requestId: '1' }, () => {
      RequestContext.set({ userId: 'u1' });
      expect(RequestContext.requestId).toBe('1');
      expect(RequestContext.userId).toBe('u1');
    });
  });
});
