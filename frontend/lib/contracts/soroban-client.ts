import {
  Account,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import {
  getContractIds,
  getNetworkPassphrase,
  getSorobanRpcUrl,
} from './config';

const DUMMY_SOURCE = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

let rpcServer: rpc.Server | null = null;

function getRpcServer(): rpc.Server {
  if (!rpcServer) {
    rpcServer = new rpc.Server(getSorobanRpcUrl(), { allowHttp: true });
  }
  return rpcServer;
}

async function simulateContractCall(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<unknown> {
  const contract = new Contract(contractId);
  const account = new Account(DUMMY_SOURCE, '0');
  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(180)
    .build();

  const simulation = await getRpcServer().simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulation)) {
    throw new Error(simulation.error ?? `Simulation failed for ${method}`);
  }

  const retval = simulation.result?.retval;
  return retval ? scValToNative(retval) : null;
}

export interface ChiomaContractState {
  admin?: string;
  config?: {
    fee_bps?: number;
    fee_collector?: string;
    paused?: boolean;
  };
  initialized?: boolean;
}

export async function readChiomaState(): Promise<ChiomaContractState | null> {
  const { chioma } = getContractIds();
  if (!chioma) return null;
  return (await simulateContractCall(
    chioma,
    'get_state',
  )) as ChiomaContractState;
}

export async function readContractMethod<T>(
  contractKey: keyof ReturnType<typeof getContractIds>,
  method: string,
): Promise<T | null> {
  const ids = getContractIds();
  const contractId = ids[contractKey];
  if (!contractId) return null;
  return (await simulateContractCall(contractId, method)) as T;
}

/** Process rent via backend (server submits Soroban transaction). */
export async function processStellarRentPayment(payload: {
  agreementId: string;
  amount: number;
  memo?: string;
}): Promise<unknown> {
  const { apiClient } = await import('@/lib/api-client');
  const response = await apiClient.post('/payments/stellar/rent', payload);
  return response.data;
}

/** Create escrow deposit via backend Stellar module. */
export async function createStellarEscrow(payload: {
  agreementId: string;
  amount: number;
}): Promise<unknown> {
  const { apiClient } = await import('@/lib/api-client');
  const response = await apiClient.post('/payments/stellar/escrow', payload);
  return response.data;
}
