import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IpAccessControlGuard } from './ip-access-control.guard';

describe('IpAccessControlGuard', () => {
  let guard: IpAccessControlGuard;
  let config: Record<string, string | undefined>;

  const mockConfigService = {
    get: jest.fn((key: string) => config[key]),
  };

  beforeEach(async () => {
    config = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpAccessControlGuard,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<IpAccessControlGuard>(IpAccessControlGuard);
    jest.clearAllMocks();
  });

  function createContext(ip: string, forwardedFor?: string): ExecutionContext {
    const request = {
      ip,
      headers: forwardedFor ? { 'x-forwarded-for': forwardedFor } : {},
      socket: { remoteAddress: ip },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access when no whitelist/blacklist is configured', () => {
    expect(guard.canActivate(createContext('203.0.113.5'))).toBe(true);
  });

  it('allows an IP that is on the whitelist', () => {
    config.ADMIN_IP_WHITELIST = '203.0.113.5,10.0.0.0/8';
    expect(guard.canActivate(createContext('203.0.113.5'))).toBe(true);
  });

  it('allows an IP inside a whitelisted CIDR range', () => {
    config.ADMIN_IP_WHITELIST = '10.0.0.0/8';
    expect(guard.canActivate(createContext('10.20.30.40'))).toBe(true);
  });

  it('blocks an IP not on the whitelist', () => {
    config.ADMIN_IP_WHITELIST = '203.0.113.5';
    expect(() => guard.canActivate(createContext('198.51.100.9'))).toThrow(
      ForbiddenException,
    );
  });

  it('blocks a blacklisted IP even if whitelisted', () => {
    config.ADMIN_IP_WHITELIST = '203.0.113.5';
    config.ADMIN_IP_BLACKLIST = '203.0.113.5';
    expect(() => guard.canActivate(createContext('203.0.113.5'))).toThrow(
      ForbiddenException,
    );
  });

  it('blocks an IP inside a blacklisted CIDR range', () => {
    config.ADMIN_IP_BLACKLIST = '198.51.100.0/24';
    expect(() => guard.canActivate(createContext('198.51.100.42'))).toThrow(
      ForbiddenException,
    );
  });

  it('uses the first x-forwarded-for entry when present', () => {
    config.ADMIN_IP_WHITELIST = '203.0.113.5';
    expect(
      guard.canActivate(createContext('10.0.0.1', '203.0.113.5, 10.0.0.1')),
    ).toBe(true);
  });

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    config.ADMIN_IP_WHITELIST = '203.0.113.5';
    expect(guard.canActivate(createContext('::ffff:203.0.113.5'))).toBe(true);
  });
});
