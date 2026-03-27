import type { AnchorTransaction, AnchorTransactionStats } from '@/types';

export const STELLAR_EXPLORER_TX_BASE =
  'https://stellar.expert/explorer/public/tx';

function parseNumericValue(value: number | string): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function getAnchorMetadataString(
  transaction: Pick<AnchorTransaction, 'metadata'>,
  key: string,
): string | null {
  const value = transaction.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

export function getAnchorProofReference(
  transaction: Pick<AnchorTransaction, 'anchorTransactionId' | 'metadata'>,
): string | null {
  return (
    transaction.anchorTransactionId ??
    getAnchorMetadataString(transaction, 'external_transaction_id')
  );
}

export function getAnchorTransactionExplorerUrl(
  transaction: Pick<AnchorTransaction, 'stellarTransactionId'>,
): string | null {
  return transaction.stellarTransactionId
    ? `${STELLAR_EXPLORER_TX_BASE}/${transaction.stellarTransactionId}`
    : null;
}

export function getAnchorVerificationState(
  transaction: Pick<
    AnchorTransaction,
    'status' | 'stellarTransactionId' | 'anchorTransactionId'
  >,
): 'verified' | 'processing' | 'failed' | 'pending' {
  if (transaction.stellarTransactionId) {
    return 'verified';
  }

  if (transaction.status === 'failed' || transaction.status === 'refunded') {
    return 'failed';
  }

  if (
    transaction.status === 'processing' ||
    Boolean(transaction.anchorTransactionId)
  ) {
    return 'processing';
  }

  return 'pending';
}

export function formatAnchorAmount(
  transaction: Pick<AnchorTransaction, 'amount' | 'currency'>,
): string {
  const amount = parseNumericValue(transaction.amount);

  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  })} ${transaction.currency}`;
}

export function formatAnchorDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
}

export function deriveAnchorStatsFromTransactions(
  transactions: AnchorTransaction[],
): AnchorTransactionStats {
  const stats: AnchorTransactionStats = {
    total: transactions.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
    verified: 0,
    averageTimeToAnchorSeconds: 0,
  };

  const terminalDurations: number[] = [];

  transactions.forEach((transaction) => {
    stats[transaction.status] += 1;

    if (transaction.stellarTransactionId) {
      stats.verified += 1;
    }

    if (
      transaction.status === 'completed' ||
      transaction.status === 'failed' ||
      transaction.status === 'refunded'
    ) {
      const createdAt = new Date(transaction.createdAt).getTime();
      const updatedAt = new Date(transaction.updatedAt).getTime();
      const durationSeconds = Math.max(
        0,
        Math.round((updatedAt - createdAt) / 1000),
      );

      terminalDurations.push(durationSeconds);
    }
  });

  if (terminalDurations.length > 0) {
    stats.averageTimeToAnchorSeconds = Math.round(
      terminalDurations.reduce((sum, value) => sum + value, 0) /
        terminalDurations.length,
    );
  }

  return stats;
}

export function buildAnchorTransactionsCsv(
  transactions: AnchorTransaction[],
): string {
  const headers = [
    'ID',
    'Anchor ID',
    'Type',
    'Status',
    'Amount',
    'Currency',
    'Wallet Address',
    'Destination',
    'Stellar Transaction ID',
    'Memo',
    'Created At',
    'Updated At',
  ];

  const rows = transactions.map((transaction) =>
    [
      transaction.id,
      transaction.anchorTransactionId ?? '',
      transaction.type,
      transaction.status,
      parseNumericValue(transaction.amount),
      transaction.currency,
      transaction.walletAddress,
      transaction.destination ?? '',
      transaction.stellarTransactionId ?? '',
      transaction.memo ?? '',
      transaction.createdAt,
      transaction.updatedAt,
    ]
      .map(escapeCsvValue)
      .join(','),
  );

  return [headers.map(escapeCsvValue).join(','), ...rows].join('\n');
}
