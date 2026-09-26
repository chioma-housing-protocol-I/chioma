/** Deployed Soroban contract IDs (testnet defaults from contract/.env.testnet). */

export interface ContractIds {
  chioma: string;
  disputeResolution: string;
  escrow: string;
  payment: string;
  agentRegistry: string;
  propertyRegistry: string;
  rentObligation: string;
  userProfile: string;
}

function env(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

const TESTNET_DEFAULTS: ContractIds = {
  chioma: 'CBFLJVOHQ2LRVUMYBZQCHCVP5JGZ6WFTOSMYYUZQHAPHX6JKSDQXF5JD',
  disputeResolution: 'CA4GNSPPX6RMHPKMJB5GSOKQU6WDPBEGMPSU3SJ5SEJWA5F7RFK2NN65',
  escrow: 'CDDUZKXCDSK3TZVFUUEEJRMSFNILCUEO5E5RORTREEH4KOALQC637DEZ',
  payment: 'CDXNI4WNAIFVVN5RIVETAENYYQ5OTT7TLFQSF2JWAHU3X3B3RT5KQBED',
  agentRegistry: 'CBJHWU7LO6QCIOBGS5P6V45FV4NT4RXCQNSGIYM5MUSP36QPAZFQRSSM',
  propertyRegistry: 'CAUHZN2FUPS7GVV2TYTUYCKG7CZX5NY7K6RA6INZ4KOGMUBRC4L4QJI7',
  rentObligation: 'CBGPDLUDTVHUR7HZPZ45CM6SYBISC2LQHMVVSEIVFA6WWZX24PIGDNOM',
  userProfile: 'CDEK2S5U36ELIGZW23EXHGYCWENGLMLHL47ZKQWPOMLO4GTK5O2YSMMH',
};

export function getContractIds(): ContractIds {
  const useDefaults =
    process.env.NODE_ENV === 'development' &&
    !env('NEXT_PUBLIC_CHIOMA_CONTRACT_ID');

  const defaults = useDefaults ? TESTNET_DEFAULTS : ({} as ContractIds);

  return {
    chioma: env('NEXT_PUBLIC_CHIOMA_CONTRACT_ID', defaults.chioma),
    disputeResolution: env(
      'NEXT_PUBLIC_DISPUTE_RESOLUTION_CONTRACT_ID',
      defaults.disputeResolution,
    ),
    escrow: env('NEXT_PUBLIC_ESCROW_CONTRACT_ID', defaults.escrow),
    payment: env('NEXT_PUBLIC_PAYMENT_CONTRACT_ID', defaults.payment),
    agentRegistry: env(
      'NEXT_PUBLIC_AGENT_REGISTRY_CONTRACT_ID',
      defaults.agentRegistry,
    ),
    propertyRegistry: env(
      'NEXT_PUBLIC_PROPERTY_REGISTRY_CONTRACT_ID',
      defaults.propertyRegistry,
    ),
    rentObligation: env(
      'NEXT_PUBLIC_RENT_OBLIGATION_CONTRACT_ID',
      defaults.rentObligation,
    ),
    userProfile: env(
      'NEXT_PUBLIC_USER_PROFILE_CONTRACT_ID',
      defaults.userProfile,
    ),
  };
}

export function getSorobanRpcUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ??
    'https://soroban-testnet.stellar.org'
  );
}

export { getNetworkPassphrase } from '@/lib/stellar-network';
