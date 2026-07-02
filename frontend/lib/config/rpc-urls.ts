import { isPlaceholder, checkAppUrls, type EnvCheckResult } from './networks';
export { checkAppUrls, checkNetworkConfig } from './networks';

function looksLikeStellarId(value: string): boolean {
  return /^[A-Z2-7]{56}$/i.test(value);
}

export function checkRpcAndContracts(): EnvCheckResult[] {
  const rawRpc =
    (process.env.NEXT_PUBLIC_SOROBAN_RPC_URL as string | undefined) ?? '';
  const isDefault = rawRpc.includes('stellar.org');
  const isMissing = !rawRpc;

  const checks: EnvCheckResult[] = [
    {
      label: 'Soroban RPC URL',
      status: isMissing ? 'fail' : isDefault ? 'warn' : 'pass',
      detail: isMissing
        ? 'NEXT_PUBLIC_SOROBAN_RPC_URL is not set.'
        : isDefault
          ? `Default Stellar RPC: ${rawRpc}`
          : `Custom RPC: ${rawRpc}`,
    },
    {
      label: 'RPC URL placeholder check',
      status: isPlaceholder(rawRpc) ? 'warn' : 'pass',
      detail: isPlaceholder(rawRpc)
        ? 'RPC URL resembles a placeholder or localhost.'
        : 'RPC URL looks valid.',
    },
  ];

  const rawHorizon =
    (process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL as string | undefined) ?? '';
  if (!rawHorizon) {
    checks.push({
      label: 'Horizon URL',
      status: 'warn',
      detail:
        'NEXT_PUBLIC_STELLAR_HORIZON_URL is not explicitly set (defaults apply).',
    });
  } else {
    checks.push({
      label: 'Horizon URL',
      status: isPlaceholder(rawHorizon) ? 'warn' : 'pass',
      detail: isPlaceholder(rawHorizon)
        ? 'Horizon URL resembles a placeholder or localhost.'
        : `Configured: ${rawHorizon}`,
    });
  }

  const network =
    (
      process.env.NEXT_PUBLIC_STELLAR_NETWORK as string | undefined
    )?.toUpperCase() || '';
  const isPublic = network === 'PUBLIC';

  if (!isPublic) {
    checks.push({
      label: 'Contract IDs',
      status: 'pass',
      detail:
        'Skipped for testnet (testnet defaults used when env vars are absent).',
    });
    return checks;
  }

  const ids: Array<{ name: string; value: string | undefined }> = [
    { name: 'chioma', value: process.env.NEXT_PUBLIC_CHIOMA_CONTRACT_ID },
    {
      name: 'disputeResolution',
      value: process.env.NEXT_PUBLIC_DISPUTE_RESOLUTION_CONTRACT_ID,
    },
    { name: 'escrow', value: process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID },
    { name: 'payment', value: process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ID },
    {
      name: 'agentRegistry',
      value: process.env.NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_ID,
    },
    {
      name: 'propertyRegistry',
      value: process.env.NEXT_PUBLIC_PROPERTY_REGISTRY_CONTRACT_ID,
    },
    {
      name: 'rentObligation',
      value: process.env.NEXT_PUBLIC_RENT_OBLIGATION_CONTRACT_ID,
    },
    {
      name: 'userProfile',
      value: process.env.NEXT_PUBLIC_USER_PROFILE_CONTRACT_ID,
    },
  ];

  for (const id of ids) {
    const valid = looksLikeStellarId(id.value || '');
    const missing = !id.value;
    const placeholder = isPlaceholder(id.value);

    let status: EnvCheckResult['status'] = 'pass';
    if (missing || placeholder) status = 'fail';
    else if (!valid) status = 'warn';

    checks.push({
      label: `Contract ${id.name}`,
      status,
      detail: missing
        ? 'Missing env var.'
        : placeholder
          ? 'Resembles a placeholder.'
          : valid
            ? `Valid ID ${id.value!.slice(0, 6)}…${id.value!.slice(-4)}`
            : `Unusual format (expected 56-char base32).`,
    });
  }

  return checks;
}
