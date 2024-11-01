import { Contract, Wallet, providers } from 'ethers';

import {
  GITHUB_SOLIDITY_URL,
  dlcContractNames,
  ethereumArbitrum,
  ethereumArbitrumSepolia,
} from '../../constants/ethereum-constants.js';
import { EthereumError } from '../../models/errors.js';
import {
  DLCEthereumContractName,
  DLCEthereumContracts,
  DLCSolidityBranchName,
  EthereumDeploymentPlan,
  EthereumNetwork,
  RawVault,
  SupportedNetwork,
  VaultState,
} from '../../models/ethereum-models.js';

export async function fetchEthereumDeploymentPlan(
  contractName: string,
  ethereumNetwork: EthereumNetwork,
  deploymentBranch: string,
  deploymentPlanRootURL: string
): Promise<EthereumDeploymentPlan> {
  const deploymentPlanURL = `${deploymentPlanRootURL}/${deploymentBranch}/deploymentFiles/${ethereumNetwork.name.toLowerCase()}/${contractName}.json`;

  try {
    const response = await fetch(deploymentPlanURL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch deployment. Received a non-OK response. Status: ${response.status} ${response.statusText}`
      );
    }
    const contractData: EthereumDeploymentPlan = await response.json();
    return contractData;
  } catch (error) {
    throw new EthereumError(`Could not fetch deployment info for ${contractName}`);
  }
}

export async function fetchEthereumDeploymentPlansByNetwork(
  network: SupportedNetwork
): Promise<EthereumDeploymentPlan[]> {
  try {
    let ethereumNetwork: EthereumNetwork;
    let deploymentBranch: DLCSolidityBranchName;
    switch (network) {
      case 'arbitrum':
        ethereumNetwork = ethereumArbitrum;
        deploymentBranch = 'dev';
        break;
      case 'arbitrum-sepolia-testnet':
        ethereumNetwork = ethereumArbitrumSepolia;
        deploymentBranch = 'testnet-rolling';
        break;
      case 'arbitrum-sepolia-devnet':
        ethereumNetwork = ethereumArbitrumSepolia;
        deploymentBranch = 'dev';
        break;
      default:
        throw new Error('Unsupported Network');
    }
    return Promise.all(
      dlcContractNames.map(async contractName => {
        return await fetchEthereumDeploymentPlan(
          contractName,
          ethereumNetwork,
          deploymentBranch,
          GITHUB_SOLIDITY_URL
        );
      })
    );
  } catch (error) {
    throw new EthereumError(`Could not fetch Ethereum Deployment Plans: ${error}`);
  }
}

export function getProvider(
  rpcEndpoint: string
): providers.JsonRpcProvider | providers.WebSocketProvider {
  if (rpcEndpoint.startsWith('http') || rpcEndpoint.startsWith('https')) {
    return new providers.JsonRpcProvider(rpcEndpoint);
  } else if (rpcEndpoint.startsWith('ws') || rpcEndpoint.startsWith('wss')) {
    return new providers.WebSocketProvider(rpcEndpoint);
  } else {
    throw new Error('Invalid RPC endpoint. It should start with either http, https, ws, or wss.');
  }
}

export function getEthereumContract(
  ethereumDeploymentPlans: EthereumDeploymentPlan[],
  contractName: string,
  signerOrProvider:
    | Wallet
    | providers.JsonRpcSigner
    | providers.JsonRpcProvider
    | providers.WebSocketProvider
): Contract {
  try {
    const contractDeploymentPlan = ethereumDeploymentPlans.find(
      plan => plan.contract.name === contractName
    );

    if (!contractDeploymentPlan) {
      throw new Error(`${contractName} Contract not found in Deployment Plans`);
    }

    return new Contract(
      contractDeploymentPlan.contract.address,
      contractDeploymentPlan.contract.abi,
      signerOrProvider
    );
  } catch (error: any) {
    throw new EthereumError(
      `Could not find ${contractName} Contract in Deployment Plans: ${error}`
    );
  }
}

export function getEthereumContracts(
  ethereumDeploymentPlans: EthereumDeploymentPlan[],
  signer: Wallet | providers.JsonRpcSigner
): DLCEthereumContracts {
  const dlcManagerContract = getEthereumContract(ethereumDeploymentPlans, 'DLCManager', signer);
  const dlcBTCContract = getEthereumContract(ethereumDeploymentPlans, 'DLCBTC', signer);

  return { dlcManagerContract, dlcBTCContract };
}

export async function getLockedBTCBalance(userVaults: RawVault[]): Promise<number> {
  try {
    const fundedVaults = userVaults.filter(vault => vault.status === VaultState.FUNDED);
    const totalCollateral = fundedVaults.reduce(
      (sum: number, vault: RawVault) => sum + vault.valueLocked.toNumber(),
      0
    );
    return totalCollateral;
  } catch (error) {
    throw new EthereumError(`Could not fetch locked BTC balance: ${error}`);
  }
}

export async function getReadOnlyContract(
  contractName: DLCEthereumContractName,
  ethereumNetwork: EthereumNetwork,
  ethereumContractBranch: DLCSolidityBranchName,
  rpcEndpoint?: string
): Promise<Contract> {
  try {
    const dlcManagerContractDeploymentPlan = await fetchEthereumDeploymentPlan(
      contractName,
      ethereumNetwork,
      ethereumContractBranch,
      GITHUB_SOLIDITY_URL
    );

    const provider = getProvider(rpcEndpoint ?? ethereumNetwork.defaultNodeURL);

    return new Contract(
      dlcManagerContractDeploymentPlan.contract.address,
      dlcManagerContractDeploymentPlan.contract.abi,
      provider
    );
  } catch (error) {
    throw new EthereumError(`Could not fetch DLCManager Contract: ${error}`);
  }
}

export async function isUserWhitelisted(
  dlcManagerContract: Contract,
  userAddress: string
): Promise<boolean> {
  try {
    return await dlcManagerContract.isWhitelisted(userAddress);
  } catch (error) {
    throw new EthereumError(`Could not check if User is whitelisted: ${error}`);
  }
}

export async function isWhitelistingEnabled(dlcManagerContract: Contract): Promise<boolean> {
  return await dlcManagerContract.whitelistingEnabled();
}

export async function getAttestorGroupPublicKey(dlcManagerContract: Contract): Promise<string> {
  try {
    const attestorGroupPubKey = await dlcManagerContract.attestorGroupPubKey();
    if (!attestorGroupPubKey)
      throw new Error('Attestor Group Public key is not set on DLCManager Contract');
    return attestorGroupPubKey;
  } catch (error) {
    throw new EthereumError(`Could not fetch Attestor Public Key: ${error}`);
  }
}

export async function getContractVaults(
  dlcManagerContract: Contract,
  amount: number = 50
): Promise<RawVault[]> {
  try {
    let totalFetched = 0;
    const allVaults: RawVault[] = [];

    let shouldContinue = true;
    while (shouldContinue) {
      const fetchedVaults: RawVault[] = await dlcManagerContract.getAllDLCs(
        totalFetched,
        totalFetched + amount
      );

      allVaults.push(...fetchedVaults);

      totalFetched += amount;
      shouldContinue = fetchedVaults.length === amount;
    }

    return allVaults;
  } catch (error) {
    throw new EthereumError(`Could not fetch All Vaults: ${error}`);
  }
}

export async function getAllAddressVaults(
  dlcManagerContract: Contract,
  ethereumAddress: string
): Promise<RawVault[]> {
  try {
    return await dlcManagerContract.getAllVaultsForAddress(ethereumAddress);
  } catch (error) {
    throw new EthereumError(`Could not fetch User Vaults: ${error}`);
  }
}

export async function getRawVault(
  dlcManagerContract: Contract,
  vaultUUID: string
): Promise<RawVault> {
  try {
    const vault: RawVault = await dlcManagerContract.getVault(vaultUUID);
    if (!vault) throw new EthereumError('Vault not found');
    return vault;
  } catch (error) {
    throw new EthereumError(`Could not fetch Vault: ${error}`);
  }
}

export async function setupVault(dlcManagerContract: Contract): Promise<any | undefined> {
  try {
    await dlcManagerContract.callStatic.setupVault();
    const transaction = await dlcManagerContract.setupVault();
    return await transaction.wait();
  } catch (error) {
    throw new EthereumError(`Could not Setup Vault: ${error}`);
  }
}

export async function withdraw(
  dlcManagerContract: Contract,
  vaultUUID: string,
  withdrawAmount: bigint
) {
  try {
    await dlcManagerContract.callStatic.withdraw(vaultUUID, withdrawAmount);
    const transaction = await dlcManagerContract.withdraw(vaultUUID, withdrawAmount);
    return await transaction.wait();
  } catch (error) {
    const errorMessage = JSON.stringify(error);
    throw new EthereumError(`Could not Withdraw: ${errorMessage}`);
  }
}

export async function getAddressDLCBTCBalance(
  dlcBTCContract: Contract,
  ethereumAddress: string
): Promise<number | undefined> {
  try {
    const ethereumAddressBalance = await dlcBTCContract.balanceOf(ethereumAddress);
    return ethereumAddressBalance.toNumber();
  } catch (error) {
    throw new EthereumError(`Could not fetch dlcBTC balance: ${error}`);
  }
}

export async function getDLCBTCTotalSupply(dlcBTCContract: Contract): Promise<number> {
  try {
    const totalSupply = await dlcBTCContract.totalSupply();
    return totalSupply.toNumber();
  } catch (error: any) {
    throw new EthereumError(`Could not fetch Total Supply: ${error}`);
  }
}
