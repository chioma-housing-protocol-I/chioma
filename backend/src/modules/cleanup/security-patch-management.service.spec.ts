import { SecurityPatchManagementService } from './security-patch-management.service';

type VulnerabilityCounts = {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  total: number;
};

describe('SecurityPatchManagementService', () => {
  it('classifies high severity audit results as urgent patches', () => {
    const service = new SecurityPatchManagementService();
    const extract = service as unknown as {
      extractVulnerabilityCounts(auditJson: unknown): VulnerabilityCounts;
      getRecommendedAction(vulnerabilities: VulnerabilityCounts): string;
    };

    const counts = extract.extractVulnerabilityCounts({
      metadata: {
        vulnerabilities: {
          critical: 0,
          high: 1,
          moderate: 2,
          low: 0,
          info: 0,
          total: 3,
        },
      },
    });

    expect(counts.high).toBe(1);
    expect(extract.getRecommendedAction(counts)).toBe('urgent_patch');
  });

  it('classifies clean audit results as no action', () => {
    const service = new SecurityPatchManagementService();
    const extract = service as unknown as {
      extractVulnerabilityCounts(auditJson: unknown): VulnerabilityCounts;
      getRecommendedAction(vulnerabilities: VulnerabilityCounts): string;
    };

    const counts = extract.extractVulnerabilityCounts({
      metadata: { vulnerabilities: { total: 0 } },
    });

    expect(counts.total).toBe(0);
    expect(extract.getRecommendedAction(counts)).toBe('none');
  });
});
