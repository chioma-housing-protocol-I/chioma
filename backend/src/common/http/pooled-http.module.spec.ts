import { pooledHttpAgent, pooledHttpsAgent } from './pooled-http.module';

describe('pooledHttpAgent / pooledHttpsAgent (#2074)', () => {
  it('enables keep-alive for TCP connection reuse', () => {
    // http.Agent's constructor options aren't part of the public TS
    // types for the instance, but are stored on `.options` at runtime.
    expect((pooledHttpAgent as any).options.keepAlive).toBe(true);
    expect((pooledHttpsAgent as any).options.keepAlive).toBe(true);
  });

  it('bounds the number of sockets per host to avoid unbounded growth', () => {
    expect(pooledHttpAgent.maxSockets).toBeGreaterThan(0);
    expect(pooledHttpAgent.maxSockets).toBeLessThan(Infinity);
    expect(pooledHttpsAgent.maxSockets).toBeGreaterThan(0);
    expect(pooledHttpsAgent.maxSockets).toBeLessThan(Infinity);
  });

  it('bounds idle (free) sockets so the pool shrinks under light load', () => {
    expect(pooledHttpAgent.maxFreeSockets).toBeGreaterThan(0);
    expect(pooledHttpAgent.maxFreeSockets).toBeLessThan(
      pooledHttpAgent.maxSockets,
    );
    expect(pooledHttpsAgent.maxFreeSockets).toBeGreaterThan(0);
    expect(pooledHttpsAgent.maxFreeSockets).toBeLessThan(
      pooledHttpsAgent.maxSockets,
    );
  });

  it('is a single shared agent instance, not recreated per request', () => {
    const reImported = require('./pooled-http.module');
    expect(reImported.pooledHttpAgent).toBe(pooledHttpAgent);
    expect(reImported.pooledHttpsAgent).toBe(pooledHttpsAgent);
  });
});
