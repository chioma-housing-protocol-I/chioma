import supertest from "supertest";

export interface ContractTestConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export class ContractTest {
  private config: ContractTestConfig;
  public request: any; // Using any to avoid complex type issues with supertest

  constructor(config: ContractTestConfig) {
    this.config = config;
    this.request = (supertest as any)(config.baseUrl);
  }

  async cleanup(): Promise<void> {
    // Cleanup logic if needed
  }
}
