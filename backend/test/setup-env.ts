process.env.RATE_LIMIT_TTL = '60000';
process.env.RATE_LIMIT_MAX = '100';
process.env.RATE_LIMIT_AUTH_TTL = '60000';
process.env.RATE_LIMIT_AUTH_MAX = '5';
process.env.RATE_LIMIT_STRICT_TTL = '60000';
process.env.RATE_LIMIT_STRICT_MAX = '10';

process.env.DB_TYPE = 'sqlite';
process.env.DB_DATABASE = ':memory:';
process.env.NODE_ENV = 'test';
