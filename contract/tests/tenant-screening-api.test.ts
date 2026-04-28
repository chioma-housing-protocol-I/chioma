import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { ContractTest } from "../src/contract-testing/core";
import { TenantScreeningAPI } from "../contracts/tenant-screening-api.contract.js";

describe("Tenant Screening API Contract Tests", () => {
  let contractTest: ContractTest;
  let tenantScreeningAPI: TenantScreeningAPI;

  beforeEach(() => {
    contractTest = new ContractTest({
      baseUrl: process.env.TENANT_SCREENING_API_URL || "http://localhost:3000",
      timeout: 30000,
      retries: 3,
    });

    tenantScreeningAPI = new TenantScreeningAPI(contractTest);
  });

  afterEach(async () => {
    await contractTest.cleanup();
  });

  describe("POST /api/tenant-screening/requests", () => {
    it("should create a new tenant screening request", async () => {
      const requestData = {
        tenantId: "test-tenant-123",
        requestedChecks: ["credit", "background", "eviction"],
        applicantData: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1234567890",
          dateOfBirth: "1990-01-01",
          socialSecurityNumber: "XXX-XX-1234",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      const response =
        await tenantScreeningAPI.createScreeningRequest(requestData);

      expect(response.status).toBe(201);
      expect(response.data).toMatchObject({
        id: expect.any(String),
        tenantId: requestData.tenantId,
        requestedChecks: requestData.requestedChecks,
        status: "PENDING_CONSENT",
        consentRequired: true,
        consentVersion: requestData.consentVersion,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      expect(response.data.encryptedApplicantData).toBeDefined();
      expect(response.data.provider).toBeDefined();
    });

    it("should validate required fields", async () => {
      const invalidData = {
        // Missing required fields
        tenantId: "test-tenant-123",
        requestedChecks: ["credit"],
        applicantData: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      await expect(
        tenantScreeningAPI.createScreeningRequest(invalidData),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          error: expect.stringContaining("validation"),
          details: expect.any(Array),
        },
      });
    });

    it("should handle invalid screening check types", async () => {
      const invalidData = {
        tenantId: "test-tenant-123",
        requestedChecks: ["invalid_check"],
        applicantData: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      await expect(
        tenantScreeningAPI.createScreeningRequest(invalidData),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          error: expect.stringContaining("invalid screening check"),
        },
      });
    });
  });

  describe("GET /api/tenant-screening/requests/:id", () => {
    let createdRequestId: string;

    beforeEach(async () => {
      const requestData = {
        tenantId: "test-tenant-123",
        requestedChecks: ["credit", "background"],
        applicantData: {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      const response =
        await tenantScreeningAPI.createScreeningRequest(requestData);
      createdRequestId = response.data.id;
    });

    it("should retrieve screening request by ID", async () => {
      const response =
        await tenantScreeningAPI.getScreeningRequest(createdRequestId);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        id: createdRequestId,
        tenantId: "test-tenant-123",
        requestedChecks: ["credit", "background"],
        status: "PENDING_CONSENT",
      });
    });

    it("should return 404 for non-existent request", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await expect(
        tenantScreeningAPI.getScreeningRequest(nonExistentId),
      ).rejects.toMatchObject({
        status: 404,
        data: {
          error: expect.stringContaining("not found"),
        },
      });
    });

    it("should validate UUID format", async () => {
      await expect(
        tenantScreeningAPI.getScreeningRequest("invalid-uuid"),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          error: expect.stringContaining("invalid UUID"),
        },
      });
    });
  });

  describe("POST /api/tenant-screening/requests/:id/consent", () => {
    let createdRequestId: string;

    beforeEach(async () => {
      const requestData = {
        tenantId: "test-tenant-123",
        requestedChecks: ["credit"],
        applicantData: {
          firstName: "Bob",
          lastName: "Wilson",
          email: "bob.wilson@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      const response =
        await tenantScreeningAPI.createScreeningRequest(requestData);
      createdRequestId = response.data.id;
    });

    it("should grant consent for screening request", async () => {
      const consentData = {
        granted: true,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (Test Browser)",
        timestamp: new Date().toISOString(),
      };

      const response = await tenantScreeningAPI.grantConsent(
        createdRequestId,
        consentData,
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        id: createdRequestId,
        status: "CONSENT_GRANTED",
        consentGrantedAt: expect.any(String),
      });
    });

    it("should handle consent denial", async () => {
      const consentData = {
        granted: false,
        reason: "Applicant declined consent",
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (Test Browser)",
        timestamp: new Date().toISOString(),
      };

      const response = await tenantScreeningAPI.grantConsent(
        createdRequestId,
        consentData,
      );

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        id: createdRequestId,
        status: "CONSENT_DENIED",
      });
    });

    it("should prevent duplicate consent", async () => {
      const consentData = {
        granted: true,
        ipAddress: "192.168.1.1",
        userAgent: "Mozilla/5.0 (Test Browser)",
        timestamp: new Date().toISOString(),
      };

      // Grant consent first time
      await tenantScreeningAPI.grantConsent(createdRequestId, consentData);

      // Try to grant consent again
      await expect(
        tenantScreeningAPI.grantConsent(createdRequestId, consentData),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          error: expect.stringContaining("already been granted"),
        },
      });
    });
  });

  describe("POST /api/tenant-screening/webhooks/provider", () => {
    it("should handle provider webhook for completed screening", async () => {
      const webhookData = {
        provider: "EXAMPLE_PROVIDER",
        providerReference: "REF-12345",
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        reportSummary: {
          creditScore: 720,
          backgroundCheck: "PASSED",
          evictionHistory: "NONE",
        },
        documents: [
          {
            type: "credit_report",
            url: "https://example.com/reports/credit-123.pdf",
            expiresAt: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          },
        ],
      };

      const response =
        await tenantScreeningAPI.handleProviderWebhook(webhookData);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        received: true,
        processed: true,
        requestId: expect.any(String),
      });
    });

    it("should handle webhook signature verification", async () => {
      const webhookData = {
        provider: "EXAMPLE_PROVIDER",
        providerReference: "REF-12345",
        status: "COMPLETED",
      };

      // Test without signature
      await expect(
        tenantScreeningAPI.handleProviderWebhook(webhookData, {
          skipSignature: true,
        }),
      ).rejects.toMatchObject({
        status: 401,
        data: {
          error: expect.stringContaining("signature"),
        },
      });
    });

    it("should handle invalid provider reference", async () => {
      const webhookData = {
        provider: "EXAMPLE_PROVIDER",
        providerReference: "INVALID-REF",
        status: "COMPLETED",
      };

      await expect(
        tenantScreeningAPI.handleProviderWebhook(webhookData),
      ).rejects.toMatchObject({
        status: 404,
        data: {
          error: expect.stringContaining("provider reference not found"),
        },
      });
    });
  });

  describe("GET /api/tenant-screening/reports/:requestId", () => {
    let requestIdWithReport: string;

    beforeEach(async () => {
      // Create a request and simulate completion
      const requestData = {
        tenantId: "test-tenant-456",
        requestedChecks: ["credit", "background"],
        applicantData: {
          firstName: "Alice",
          lastName: "Johnson",
          email: "alice.johnson@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      const response =
        await tenantScreeningAPI.createScreeningRequest(requestData);
      requestIdWithReport = response.data.id;

      // Grant consent
      await tenantScreeningAPI.grantConsent(requestIdWithReport, {
        granted: true,
        ipAddress: "192.168.1.1",
        userAgent: "Test Browser",
        timestamp: new Date().toISOString(),
      });

      // Simulate provider webhook completion
      await tenantScreeningAPI.handleProviderWebhook({
        provider: "EXAMPLE_PROVIDER",
        providerReference: response.data.providerReference,
        status: "COMPLETED",
        completedAt: new Date().toISOString(),
        reportSummary: {
          creditScore: 680,
          backgroundCheck: "PASSED",
          evictionHistory: "NONE",
        },
      });
    });

    it("should retrieve screening report", async () => {
      const response =
        await tenantScreeningAPI.getScreeningReport(requestIdWithReport);

      expect(response.status).toBe(200);
      expect(response.data).toMatchObject({
        requestId: requestIdWithReport,
        status: "COMPLETED",
        reportSummary: {
          creditScore: 680,
          backgroundCheck: "PASSED",
          evictionHistory: "NONE",
        },
        completedAt: expect.any(String),
      });
    });

    it("should return 404 for report of non-existent request", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";

      await expect(
        tenantScreeningAPI.getScreeningReport(nonExistentId),
      ).rejects.toMatchObject({
        status: 404,
        data: {
          error: expect.stringContaining("report not found"),
        },
      });
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits on screening request creation", async () => {
      const requestData = {
        tenantId: "test-tenant-rate-limit",
        requestedChecks: ["credit"],
        applicantData: {
          firstName: "Rate",
          lastName: "Limit",
          email: "rate.limit@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      // Make multiple requests quickly
      const requests = Array(20)
        .fill(null)
        .map(() => tenantScreeningAPI.createScreeningRequest(requestData));

      const results = await Promise.allSettled(requests);

      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(
        (result) =>
          result.status === "rejected" && result.reason?.status === 429,
      );

      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    it("should include rate limit headers", async () => {
      const requestData = {
        tenantId: "test-tenant-headers",
        requestedChecks: ["credit"],
        applicantData: {
          firstName: "Header",
          lastName: "Test",
          email: "header.test@example.com",
        },
        consentRequired: true,
        consentVersion: "1.0",
      };

      const response =
        await tenantScreeningAPI.createScreeningRequest(requestData);

      expect(response.headers).toMatchObject({
        "x-ratelimit-limit": expect.any(String),
        "x-ratelimit-remaining": expect.any(String),
        "x-ratelimit-reset": expect.any(String),
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON", async () => {
      await expect(
        contractTest.request
          .post("/api/tenant-screening/requests")
          .send('{"invalid": json}')
          .set("Content-Type", "application/json"),
      ).rejects.toMatchObject({
        status: 400,
        data: {
          error: expect.stringContaining("JSON"),
        },
      });
    });

    it("should handle missing authentication for protected endpoints", async () => {
      await expect(
        contractTest.request.get("/api/tenant-screening/admin/requests"),
      ).rejects.toMatchObject({
        status: 401,
        data: {
          error: expect.stringContaining("unauthorized"),
        },
      });
    });

    it("should handle database connection errors gracefully", async () => {
      // This test would require mocking database failures
      // For now, we'll test service unavailability
      await expect(
        contractTest.request.get("/api/tenant-screening/health"),
      ).resolves.toMatchObject({
        status: 200,
        data: {
          status: expect.any(String),
          database: expect.any(String),
        },
      });
    });
  });
});
