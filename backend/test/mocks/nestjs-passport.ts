export const PassportStrategy = jest
  .fn()
  .mockImplementation((strategy?: any, name?: string) => {
    return class MockStrategy {
      constructor(...args: any[]) {
        // Mock implementation
      }
    };
  });

export const AuthGuard = jest.fn().mockImplementation((name?: string) => {
  return class MockAuthGuard {
    constructor(...args: any[]) {
      // Mock implementation
    }
  };
});

export const Strategy = jest.fn().mockImplementation(() => ({
  name: 'jwt',
  authenticate: jest.fn(),
}));

export const ExtractJwt = {
  fromAuthHeaderAsBearerToken: jest.fn(),
  fromExtractors: jest.fn(),
};

export default {
  PassportStrategy,
  AuthGuard,
  Strategy,
  ExtractJwt,
};
