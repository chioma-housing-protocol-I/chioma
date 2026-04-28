import { ContractTest } from "../src/contract-testing/core";

export interface ScreeningRequestData {
  tenantId: string;
  requestedChecks: string[];
  applicantData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    socialSecurityNumber?: string;
  };
  consentRequired: boolean;
  consentVersion: string;
}

export interface ConsentData {
  granted: boolean;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export interface WebhookData {
  provider: string;
  providerReference: string;
  status: string;
  completedAt?: string;
  reportSummary?: Record<string, any>;
  documents?: Array<{
    type: string;
    url: string;
    expiresAt: string;
  }>;
}

export interface WebhookOptions {
  skipSignature?: boolean;
  signature?: string;
}

export class TenantScreeningAPI {
  constructor(private contractTest: ContractTest) {}

  async createScreeningRequest(data: ScreeningRequestData) {
    return await this.contractTest.request
      .post("/api/tenant-screening/requests")
      .send(data)
      .expect(201);
  }

  async getScreeningRequest(id: string) {
    return await this.contractTest.request
      .get(`/api/tenant-screening/requests/${id}`)
      .expect(200);
  }

  async grantConsent(id: string, consentData: ConsentData) {
    return await this.contractTest.request
      .post(`/api/tenant-screening/requests/${id}/consent`)
      .send(consentData)
      .expect(200);
  }

  async handleProviderWebhook(data: WebhookData, options: WebhookOptions = {}) {
    const request = this.contractTest.request
      .post("/api/tenant-screening/webhooks/provider")
      .send(data);

    if (options.signature) {
      request.set("X-Webhook-Signature", options.signature);
    } else if (!options.skipSignature) {
      // Generate a test signature
      const crypto = require("crypto");
      const signature = crypto
        .createHmac("sha256", "test-webhook-secret")
        .update(JSON.stringify(data))
        .digest("hex");
      request.set("X-Webhook-Signature", `sha256=${signature}`);
    }

    return request.expect(200);
  }

  async getScreeningReport(requestId: string) {
    return await this.contractTest.request
      .get(`/api/tenant-screening/reports/${requestId}`)
      .expect(200);
  }

  async getHealthStatus() {
    return await this.contractTest.request
      .get("/api/tenant-screening/health")
      .expect(200);
  }

  async getAdminRequests(authToken: string) {
    return await this.contractTest.request
      .get("/api/tenant-screening/admin/requests")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);
  }
}
