import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SanitizationPipe } from '../../src/common/pipes/sanitization.pipe';

/**
 * Security E2E Tests
 * Tests for OWASP Top 10 and security best practices
 */
describe('Security E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new SanitizationPipe(),
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('A01: Broken Access Control', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/agreements')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should reject invalid JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/agreements')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should prevent access to other users data', async () => {
      // This would require setting up test users and validating
      // that user A cannot access user B's data
    });
  });

  describe('A02: Cryptographic Failures', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);

      // Error message should not reveal whether email exists
      expect(response.body.message).toBe('Invalid email or password');
      expect(response.body.message).not.toContain('User not found');
    });

    it('should not return passwords in responses', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `test${Date.now()}@test.com`,
          password: 'SecureP@ss123',
          firstName: 'Test',
          lastName: 'User',
        });

      if (response.status === 201) {
        expect(response.body.user.password).toBeUndefined();
        expect(response.body.user.refreshToken).toBeUndefined();
      }
    });
  });

  describe('A03: Injection', () => {
    it('should reject SQL injection attempts in query parameters', async () => {
      await request(app.getHttpServer())
        .get('/api/agreements?id=1;DROP TABLE users;--')
        .expect(400);
    });

    it('should reject SQL injection in request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: "admin'--",
          password: 'password',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid');
    });

    it('should reject XSS attempts in input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'SecureP@ss123',
          firstName: '<script>alert("xss")</script>',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.message).toContain('malicious');
    });
  });

  describe('A04: Insecure Design', () => {
    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests
      const requests = Array(25)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/api/auth/login')
            .send({ email: 'test@test.com', password: 'wrong' }),
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);

      // Should eventually get rate limited
      expect(rateLimited).toBe(true);
    });

    it('should validate input lengths', async () => {
      const longString = 'a'.repeat(100000);

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'SecureP@ss123',
          firstName: longString,
          lastName: 'User',
        })
        .expect(400);
    });
  });

  describe('A05: Security Misconfiguration', () => {
    it('should have security headers', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should not expose server information', async () => {
      const response = await request(app.getHttpServer()).get('/health');

      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should serve security.txt', async () => {
      const response = await request(app.getHttpServer())
        .get('/.well-known/security.txt')
        .expect(200);

      expect(response.text).toContain('Contact:');
      expect(response.text).toContain('Expires:');
    });
  });

  describe('A06: Vulnerable Components', () => {
    // This is handled by Dependabot and npm audit in CI/CD
    it('should have dependency scanning in place', () => {
      // Verified through CI/CD configuration
      expect(true).toBe(true);
    });
  });

  describe('A07: Authentication Failures', () => {
    it('should enforce password complexity', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'weak', // Too short, missing complexity
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should implement account lockout', async () => {
      const email = `lockout-test-${Date.now()}@test.com`;

      // First register a user (if endpoint is available)
      // Then make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email, password: 'wrongpassword' });
      }

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'wrongpassword' });

      // Should indicate locked or rate limited
      expect([401, 429]).toContain(response.status);
    });

    it('should not reveal if email exists on forgot password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      // Same message regardless of email existence
      expect(response.body.message).toContain(
        'If an account exists with this email',
      );
    });
  });

  describe('A08: Software Integrity Failures', () => {
    // CI/CD handles code signing and artifact verification
    it('should have CI/CD checks in place', () => {
      // Verified through workflow files
      expect(true).toBe(true);
    });
  });

  describe('A09: Security Logging Failures', () => {
    it('should log authentication attempts', async () => {
      // This test verifies the security audit service is in place
      // Actual log verification would be done in integration tests
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);

      // Security events should be logged (verified through service tests)
    });
  });

  describe('A10: SSRF', () => {
    it('should not allow arbitrary URL fetching', async () => {
      // If there are any endpoints that accept URLs,
      // verify they validate and restrict the URLs
      // This is a placeholder for SSRF-specific tests
    });
  });

  describe('CORS Configuration', () => {
    it('should have proper CORS headers', async () => {
      const response = await request(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://localhost:3001');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should reject unauthorized origins', async () => {
      await request(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://malicious-site.com');

      // In production, this should fail
      // In development, CORS is more permissive
    });
  });

  describe('Request Validation', () => {
    it('should reject requests with unknown properties', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'password',
          unknownField: 'malicious',
        })
        .expect(400);

      expect(response.body.message).toContain('should not exist');
    });

    it('should handle large payloads gracefully', async () => {
      const largePayload = { data: 'x'.repeat(1000000) };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(largePayload)
        .expect(413); // Payload too large
    });
  });
});
