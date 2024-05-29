/** @format */
import { Contract, Wallet, providers } from 'ethers';
import { EthereumError } from '../models/errors.js';
import {
  DLCEthereumContracts,
  EthereumDeploymentPlan,
  EthereumNetwork,
  RawVault,
  VaultState,
} from '../models/ethereum-models.js';

export async function fetchEthereumDeploymentPlan(
  contractName: string,
  ethereumNetwork: EthereumNetwork,
  deploymentBranch: string,
  deploymentPlanRootURL: string
) {
  const deploymentPlanURL = `${deploymentPlanRootURL}/${deploymentBranch}/deploymentFiles/${ethereumNetwork.name.toLowerCase()}/${contractName}.json`;

  try {
    const response = await fetch(deploymentPlanURL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch deployment. Received a non-OK response. Status: ${response.status} ${response.statusText}`
      );
    }
    const contractData = await response.json();
    return contractData;
  } catch (error) {
    throw new EthereumError(`Could not fetch deployment info for ${contractName}`);
  }
}

export function getProvider(rpcEndpoint: string): providers.JsonRpcProvider | providers.WebSocketProvider {
  if (rpcEndpoint.startsWith('http') || rpcEndpoint.startsWith('https')) {
    return new providers.JsonRpcProvider(rpcEndpoint);
  } else if (rpcEndpoint.startsWith('ws') || rpcEndpoint.startsWith('wss')) {
    return new providers.WebSocketProvider(rpcEndpoint);
  } else {
    throw new Error('Invalid RPC endpoint. It should start with either http, https, ws, or wss.');
  }
}

export function getEthereumontract(
  ethereumDeploymentPlans: EthereumDeploymentPlan[],
  contractName: string,
  signerOrProvider: Wallet | providers.JsonRpcSigner | providers.JsonRpcProvider
): Contract {
  try {
    const contractDeploymentPlan = ethereumDeploymentPlans.find((plan) => plan.contract.name === contractName);

    if (!contractDeploymentPlan) {
      throw new Error(`${contractName} Contract not found in Deployment Plans`);
    }

    return new Contract(contractDeploymentPlan.contract.address, contractDeploymentPlan.contract.abi, signerOrProvider);
  } catch (error: any) {
    throw new EthereumError(`Could not find ${contractName} Contract in Deployment Plans: ${error}`);
  }
}

export function getEthereumContracts(
  ethereumDeploymentPlans: EthereumDeploymentPlan[],
  signer: Wallet | providers.JsonRpcSigner,
  readOnlyProvider: providers.JsonRpcProvider
): DLCEthereumContracts {
  const protocolContract = getEthereumontract(ethereumDeploymentPlans, 'TokenManager', signer);
  const readOnlyProtocolContract = getEthereumontract(ethereumDeploymentPlans, 'TokenManager', readOnlyProvider);
  const dlcManagerContract = getEthereumontract(ethereumDeploymentPlans, 'DLCManager', signer);
  const dlcBTCContract = getEthereumontract(ethereumDeploymentPlans, 'DLCBTC', signer);

  return { protocolContract, readOnlyProtocolContract, dlcManagerContract, dlcBTCContract };
}

export function getReadOnlyEthereumContracts(
  ethereumDeploymentPlans: EthereumDeploymentPlan[],
  readOnlyProvider: providers.JsonRpcProvider
): { protocolContract: Contract; dlcManagerContract: Contract; dlcBTCContract: Contract } {
  const protocolContract = getEthereumontract(ethereumDeploymentPlans, 'TokenManager', readOnlyProvider);
  const dlcManagerContract = getEthereumontract(ethereumDeploymentPlans, 'DLCManager', readOnlyProvider);
  const dlcBTCContract = getEthereumontract(ethereumDeploymentPlans, 'DLCBTC', readOnlyProvider);

  return { protocolContract, dlcManagerContract, dlcBTCContract };
}

export async function getLockedBTCBalance(userVaults: RawVault[]): Promise<number> {
  try {
    const fundedVaults = userVaults.filter((vault) => vault.status === VaultState.Funded);
    const totalCollateral = fundedVaults.reduce(
      (sum: number, vault: RawVault) => sum + vault.valueLocked.toNumber(),
      0
    );
    return totalCollateral;
  } catch (error) {
    throw new EthereumError(`Could not fetch locked BTC balance: ${error}`);
  }
}
