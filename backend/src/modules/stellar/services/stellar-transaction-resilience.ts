import { BadRequestException } from '@nestjs/common';
import * as StellarSdk from '@stellar/stellar-sdk';
import { AssetType } from '../entities/stellar-transaction.entity';

export function assertSufficientBalance(
  account: StellarSdk.Horizon.AccountResponse,
  requestedAmount: string,
  assetType: AssetType,
  baseFee: string,
): void {
  if (assetType !== AssetType.NATIVE) {
    return;
  }
  const nativeBalance = account.balances.find(
    (b): b is StellarSdk.Horizon.HorizonApi.BalanceLineNative =>
      b.asset_type === 'native',
  );
  const spendable = parseFloat(nativeBalance?.balance || '0');
  const requested = parseFloat(requestedAmount);
  const estimatedFee = parseFloat(baseFee) / 10_000_000;
  if (Number.isNaN(spendable) || Number.isNaN(requested)) {
    throw new BadRequestException('Invalid payment amount or account balance');
  }
  if (requested + estimatedFee >= spendable) {
    throw new BadRequestException(
      'Insufficient XLM balance to cover amount and fees',
    );
  }
}

export function isTransientStellarError(error: any): boolean {
  const status = error?.response?.status;
  const txCode = error?.response?.data?.extras?.result_codes?.transaction;
  const message = String(error?.message || '').toLowerCase();

  return (
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    txCode === 'tx_too_late' ||
    txCode === 'tx_internal_error' ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('fetch failed')
  );
}

export function extractStellarErrorMessage(error: any): string {
  if (error.response?.data?.extras?.result_codes) {
    const codes = error.response.data.extras.result_codes;
    const opCodes = codes.operations || [];
    if (opCodes.includes('op_underfunded')) {
      return 'Insufficient balance for this payment';
    }
    if (opCodes.includes('op_no_destination')) {
      return 'Destination account does not exist or was merged';
    }
    if (codes.operations) {
      return `Operation failed: ${codes.operations.join(', ')}`;
    }
    if (codes.transaction === 'tx_bad_seq') {
      return 'Sequence number conflict detected. Please retry.';
    }
    if (codes.transaction) {
      return `Transaction failed: ${codes.transaction}`;
    }
  }
  if (
    String(error?.message || '')
      .toLowerCase()
      .includes('timeout')
  ) {
    return 'Transaction submission timed out';
  }
  return error.message || 'Unknown error';
}
