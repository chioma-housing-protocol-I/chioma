/**
 * Pure helpers for turning PostgreSQL EXPLAIN output into a small, redacted
 * summary. Keeping parsing separate from the monitor service makes the
 * behavior deterministic to test and prevents raw plan text, which can embed
 * literal parameter values, from reaching logs or the dashboard.
 */

export interface QueryPlanNode {
  nodeType: string;
  relation: string | null;
}

export interface QueryPlanSummary {
  operation: string;
  nodes: QueryPlanNode[];
  hasSequentialScan: boolean;
  sequentialScanCount: number;
  estimatedTotalCost: number | null;
  redactedLines: string[];
  analyzedAt: string;
}

/** Removes literal values from a plan line before it is stored or logged. */
export function redactSqlLiterals(line: string): string {
  return line
    .replace(/'(?:[^']|'')*'/g, "'?'")
    .replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, '<uuid>')
    .replace(/\b\d+(?:\.\d+)?\b/g, '?');
}

function planLines(rows: unknown[]): string[] {
  return rows
    .map((row) => {
      if (typeof row === 'string') return row;
      if (!row || typeof row !== 'object') return null;
      const values = Object.values(row as Record<string, unknown>);
      const first = values.find((value) => typeof value === 'string');
      return typeof first === 'string' ? first : null;
    })
    .filter((line): line is string => line !== null);
}

const NODE_PATTERN =
  /^\s*(?:->\s*)?([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*)\s+(?:on|using)\s+([^\s]+)/;
const COST_PATTERN = /cost=[\d.]+\.\.([\d.]+)/;

/**
 * Parses EXPLAIN rows into a redacted summary. Only structural information
 * (node types, relations and estimated cost) is retained.
 */
export function parseQueryPlan(
  operation: string,
  rows: unknown[],
): QueryPlanSummary {
  const nodes: QueryPlanNode[] = [];
  const redactedLines: string[] = [];
  let estimatedTotalCost: number | null = null;

  for (const line of planLines(rows)) {
    const match = NODE_PATTERN.exec(line);
    if (match) {
      nodes.push({ nodeType: match[1], relation: match[2] ?? null });
    }

    const cost = COST_PATTERN.exec(line);
    if (cost) {
      const value = Number(cost[1]);
      if (Number.isFinite(value)) {
        estimatedTotalCost = Math.max(estimatedTotalCost ?? value, value);
      }
    }

    redactedLines.push(redactSqlLiterals(line.trim()));
  }

  const sequentialScanCount = nodes.filter(
    (node) => node.nodeType === 'Seq Scan',
  ).length;

  return {
    operation,
    nodes,
    hasSequentialScan: sequentialScanCount > 0,
    sequentialScanCount,
    estimatedTotalCost,
    redactedLines,
    analyzedAt: new Date().toISOString(),
  };
}
