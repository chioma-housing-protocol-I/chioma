import { parseQueryPlan, redactSqlLiterals } from './query-plan.analyzer';

describe('query plan analysis (#2182)', () => {
  it('flags sequential scans and extracts the estimated cost', () => {
    const summary = parseQueryPlan('users.findAll', [
      {
        'QUERY PLAN':
          'Seq Scan on users  (cost=0.00..1250.50 rows=42 width=64)',
      },
      "  Filter: (email = 'alice@example.com')",
      '  Index Scan using users_pkey on users  (cost=0.29..8.31 rows=1 width=64)',
    ]);

    expect(summary.operation).toBe('users.findAll');
    expect(summary.hasSequentialScan).toBe(true);
    expect(summary.sequentialScanCount).toBe(1);
    expect(summary.estimatedTotalCost).toBe(1250.5);
    expect(summary.nodes.map((node) => node.nodeType)).toContain('Seq Scan');
  });

  it('does not flag plans that only use indexes', () => {
    const summary = parseQueryPlan('users.findById', [
      'Index Scan using users_pkey on users  (cost=0.29..8.31 rows=1 width=64)',
    ]);

    expect(summary.hasSequentialScan).toBe(false);
    expect(summary.sequentialScanCount).toBe(0);
  });

  it('redacts literals before a plan is logged', () => {
    const redacted = redactSqlLiterals(
      "Filter: (email = 'alice@example.com' AND id = 42)",
    );

    expect(redacted).toContain("'?'");
    expect(redacted).not.toContain('alice@example.com');
    expect(redacted).not.toContain('42');
  });
});
