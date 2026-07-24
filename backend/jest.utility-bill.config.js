module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^bcryptjs$': '<rootDir>/test/mocks/bcryptjs.ts',
    '^@nestjs/passport$': '<rootDir>/test/mocks/nestjs-passport.ts',
    '^@nestjs/terminus$': '<rootDir>/test/mocks/nestjs-terminus.ts',
    '^passport-jwt$': '<rootDir>/test/mocks/nestjs-passport.ts',
    '^passport$': '<rootDir>/test/mocks/nestjs-passport.ts',
  },
  testEnvironment: 'node',
};
