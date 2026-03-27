export const PassportStrategy = jest
  .fn()
  .mockImplementation((_strategy?: any, _name?: string) => {
    return class MockStrategy {
      constructor(..._args: any[]) {
        // Mock implementation
      }
    };
  });

export const AuthGuard = jest.fn().mockImplementation((_name?: string) => {
  return class MockAuthGuard {
    constructor(..._args: any[]) {
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
