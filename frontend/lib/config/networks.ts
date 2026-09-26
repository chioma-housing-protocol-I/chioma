export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface EnvCheckResult {
  label: string;
  status: CheckStatus;
  detail: string;
}

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('example.com') ||
    lower.includes('placeholder') ||
    lower.includes('change-me') ||
    lower.includes('todo') ||
    lower.includes('your-') ||
    lower.includes('replace-me') ||
    lower.includes('xxx')
  );
}

export function checkNetworkConfig(): EnvCheckResult[] {
  const raw =
    (process.env.NEXT_PUBLIC_STELLAR_NETWORK as string | undefined) ?? '';
  const network = raw.toUpperCase();
  const isPublic = network === 'PUBLIC';
  const isTestnet = network === 'TESTNET';
  const isUnknown = !!raw && !isPublic && !isTestnet;

  return [
    {
      label: 'Stellar network',
      status: isPublic ? 'pass' : isTestnet ? 'warn' : 'fail',
      detail: isPublic
        ? 'Configured for PUBLIC mainnet.'
        : isTestnet
          ? 'Running on TESTNET.'
          : isUnknown
            ? `Unknown network value: "${network}"`
            : 'Not configured — defaults to TESTNET.',
    },
    {
      label: 'Mainnet flag',
      status: isPublic ? 'warn' : 'pass',
      detail: isPublic
        ? 'FLAGGED for mainnet — verify production readiness before deployment.'
        : 'Testnet mode active.',
    },
    {
      label: 'Explorer base URL',
      status: isPublic || isTestnet ? 'pass' : 'fail',
      detail: isPublic
        ? 'Public Stellar Expert explorer configured.'
        : isTestnet
          ? 'Testnet Stellar Expert explorer configured.'
          : 'Explorer configuration unavailable for unknown network.',
    },
  ];
}

export function checkAppUrls(): EnvCheckResult[] {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL as string | undefined) ?? '';
  const backendUrl =
    (process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL as string | undefined) ?? '';

  const coordinator = backendUrl || apiUrl;
  const coordinatorConfigured = coordinator.length > 0;

  return [
    {
      label: 'Coordinator URL',
      status: coordinatorConfigured ? 'pass' : 'fail',
      detail: coordinatorConfigured
        ? coordinator
        : 'No API coordinator URL configured.',
    },
    {
      label: 'API URL',
      status:
        apiUrl === '/api' ? 'pass' : isPlaceholder(apiUrl) ? 'warn' : 'pass',
      detail:
        apiUrl === '/api'
          ? 'Browser requests use Next.js same-origin proxy.'
          : apiUrl
            ? `Browser API base: ${apiUrl}`
            : 'NEXT_PUBLIC_API_URL is not set.',
    },
    {
      label: 'Backend proxy URL',
      status: isPlaceholder(backendUrl) ? 'warn' : 'pass',
      detail: isPlaceholder(backendUrl)
        ? 'Backend proxy URL resembles localhost or placeholder.'
        : backendUrl
          ? `SSR backend: ${backendUrl}`
          : 'NEXT_PUBLIC_BACKEND_API_BASE_URL is not set.',
    },
  ];
}
