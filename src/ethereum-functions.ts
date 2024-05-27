/** @format */
import chalk from 'chalk';
import { Contract, ethers } from 'ethers';
import { EthereumNetwork, ethereumArbitrum, ethereumArbitrumSepolia } from './ethereum-network.js';
import { EthereumError } from './models/errors.js';
import { DisplayVault, ExtendedDisplayVault, RawVault, VaultState } from './models/ethereum-models.js';
import { customShiftValue, shiftValue, truncateAddress, unshiftValue } from './utilities.js';
const SOLIDITY_CONTRACT_URL = 'https://raw.githubusercontent.com/DLC-link/dlc-solidity';

interface EthereumContracts {
  protocolContract: Contract;
  dlcManagerContract: Contract;
  dlcBTCContract: Contract;
}

interface EthereumInformation {
  ethereumContracts: EthereumContracts;
  ethereumNetworkName: string;
  ethereumUserAddress: string;
}

export function formatVaultToDisplay(vault: RawVault): DisplayVault {
  return {
    uuid: vault.uuid,
    truncatedUUID: truncateAddress(vault.uuid),
    state: VaultState[vault.status],
    collateral: unshiftValue(vault.valueLocked.toNumber()),
    createdAt: new Date(vault.timestamp.toNumber() * 1000).toLocaleDateString('en-US'),
  };
}

export function formatVaultDetailsToDisplay(vault: RawVault): ExtendedDisplayVault {
  return {
    uuid: vault.uuid,
    protocolContract: vault.protocolContract,
    timestamp: vault.timestamp.toNumber(),
    valueLocked: vault.valueLocked.toNumber(),
    creator: vault.creator,
    status: vault.status,
    fundingTxId: vault.fundingTxId,
    closingTxId: vault.closingTxId,
    btcFeeRecipient: vault.btcFeeRecipient,
    btcMintFeeBasisPoints: vault.btcMintFeeBasisPoints.toNumber(),
    btcRedeemFeeBasisPoints: vault.btcRedeemFeeBasisPoints.toNumber(),
    taprootPubKey: vault.taprootPubKey,
  };
}

export function formatVaultsToDisplay(vaults: RawVault[]): DisplayVault[] {
  return vaults.map(formatVaultToDisplay);
}

export async function setupEthereum(): Promise<EthereumInformation> {
  const ethereumNetworkName = process.env.ETHEREUM_NETWORK;
  if (!ethereumNetworkName) {
    throw new EthereumError(`Could not setup Ethereum: Ethereum Network not set`);
  }
  const ethereumContracts = await getEthereumContracts();
  const ethereumUserAddress = await ethereumContracts.protocolContract.signer.getAddress();
  console.log(`[Ethereum][${ethereumNetworkName}] Ethereum User Address: ${ethereumUserAddress}`);

  return { ethereumContracts, ethereumNetworkName, ethereumUserAddress };
}

async function fetchEthereumDeploymentPlan(contractName: string, ethereumNetwork: EthereumNetwork) {
  const repositoryBranchName = process.env.ETHEREUM_DEPLOYMENT_BRANCH;
  const ethereumNetworkName = ethereumNetwork.name.toLowerCase();
  const deploymentPlanURL = `${SOLIDITY_CONTRACT_URL}/${repositoryBranchName}/deploymentFiles/${ethereumNetworkName}/${contractName}.json`;

  console.log(
    `[Ethereum][${ethereumNetwork.displayName}] Fetching deployment info for ${contractName} from dlc-solidity/${repositoryBranchName}`
  );

  try {
    const response = await fetch(deploymentPlanURL);
    const contractData = await response.json();
    return contractData;
  } catch (error) {
    throw new EthereumError(`Could not fetch deployment info for ${contractName} on ${ethereumNetwork.name}`);
  }
}

export function getEthereumNetwork(): EthereumNetwork {
  const ethereumNetworkName = process.env.ETHEREUM_NETWORK;

  if (!ethereumNetworkName) {
    throw new EthereumError(`Could not get Ethereum Network: Ethereum Network not set`);
  }

  switch (ethereumNetworkName) {
    case 'Arbitrum':
      return ethereumArbitrum;
    case 'Arbitrum Sepolia':
      return ethereumArbitrumSepolia;
    default:
      throw new EthereumError(`Could not get Ethereum Network: Invalid Network ${ethereumNetworkName}`);
  }
}

async function getEthereumObserverProvider(
  type: 'websocket' | 'jsonrpc'
): Promise<ethers.providers.WebSocketProvider | ethers.providers.JsonRpcProvider> {
  switch (type) {
    case 'websocket':
      const ethereumObserverWebsocketEndpoint = process.env.ETHEREUM_OBSERVER_WEBSOCKET_ENDPOINT;

      if (!ethereumObserverWebsocketEndpoint) {
        throw new EthereumError(`Could not get Observer Provider: Ethereum Observer Node Endpoint not set`);
      }

      return new ethers.providers.WebSocketProvider(ethereumObserverWebsocketEndpoint);
    case 'jsonrpc':
      const ethereumObserverJSONRPCEndpoint = process.env.ETHEREUM_OBSERVER_JSONRPC_ENDPOINT;

      if (!ethereumObserverJSONRPCEndpoint) {
        throw new EthereumError(`Could not get Observer Provider: Ethereum Observer Node Endpoint not set`);
      }

      return new ethers.providers.JsonRpcProvider(ethereumObserverJSONRPCEndpoint);
    default:
      throw new EthereumError(`Could not get Observer Provider: Invalid type ${type}`);
  }
}

async function getEthereumWallet(): Promise<ethers.Wallet> {
  const ethereumPrivateKey = process.env.ETHEREUM_PRIVATE_KEY;
  const ethereumProvider = await getEthereumObserverProvider('jsonrpc');

  if (!ethereumPrivateKey) {
    throw new EthereumError(`Could not get Ethereum Wallet: Ethereum Private Key not set`);
  }

  return new ethers.Wallet(ethereumPrivateKey, ethereumProvider);
}

export async function getEthereumContracts(): Promise<EthereumContracts> {
  const ethereumNetwork = getEthereumNetwork();
  const ethereumWallet = await getEthereumWallet();

  const protocolContractData = await fetchEthereumDeploymentPlan('TokenManager', ethereumNetwork);
  const protocolContract = new ethers.Contract(
    protocolContractData.contract.address,
    protocolContractData.contract.abi,
    ethereumWallet
  );

  const dlcManagerContractData = await fetchEthereumDeploymentPlan('DLCManager', ethereumNetwork);
  const dlcManagerContract = new ethers.Contract(
    dlcManagerContractData.contract.address,
    dlcManagerContractData.contract.abi,
    ethereumWallet
  );

  const dlcBTCContractData = await fetchEthereumDeploymentPlan('DLCBTC', ethereumNetwork);
  const dlcBTCContract = new ethers.Contract(
    dlcBTCContractData.contract.address,
    dlcBTCContractData.contract.abi,
    ethereumWallet
  );

  return { protocolContract, dlcManagerContract, dlcBTCContract };
}

// async function getDefaultProvider(ethereumNetwork: EthereumNetwork, contractName: string): Promise<ethers.Contract> {
//   try {
//     const ethereumNetworkName = ethereumNetwork.name.toLowerCase();
//     const provider = ethers.providers.getDefaultProvider(ethereumNetwork.defaultNodeURL);

//     const deploymentBranchName = import.meta.env.VITE_ETHEREUM_DEPLOYMENT_BRANCH;

//     const deploymentPlanURL = `${SOLIDITY_CONTRACT_URL}/${deploymentBranchName}/deploymentFiles/${ethereumNetworkName}/${contractName}.json`;

//     const response = await fetch(deploymentPlanURL);
//     const contractData = await response.json();

//     const protocolContract = new ethers.Contract(contractData.contract.address, contractData.contract.abi, provider);

//     return protocolContract;
//   } catch (error) {
//     throw new EthereumError(`Could not get Default Provider: ${error}}`);
//   }
// }

export async function getLockedBTCBalance(userVaults: RawVault[]): Promise<number | undefined> {
  try {
    const fundedVaults = userVaults.filter((vault) => vault.status === VaultState.Funded);
    const totalCollateral = fundedVaults.reduce(
      (sum: number, vault: RawVault) => sum + vault.valueLocked.toNumber(),
      0
    );
    return Number(unshiftValue(totalCollateral));
  } catch (error) {
    throw new EthereumError(`Could not fetch locked BTC balance: ${error}`);
  }
}

export async function getDLCBTCBalance(
  dlcBTCContract: Contract,
  ethereumUserAddress: string
): Promise<number | undefined> {
  try {
    const dlcBTCBalance = customShiftValue(await dlcBTCContract.balanceOf(ethereumUserAddress), 8, true);
    return dlcBTCBalance;
  } catch (error) {
    throw new EthereumError(`Could not fetch dlcBTC balance: ${error}`);
  }
}

// async function getAttestorGroupPublicKey(ethereumNetwork: EthereumNetwork): Promise<string> {
//   try {
//     const dlcManagerContract = await getDefaultProvider(ethereumNetwork, 'DLCManager');
//     const attestorGroupPubKey = await dlcManagerContract.attestorGroupPubKey();
//     return attestorGroupPubKey;
//   } catch (error) {
//     throw new EthereumError(`Could not fetch Attestor Public Key: ${error}`);
//   }
// }

export async function getAllVaults(protocolContract: Contract, ethereumUserAddress: string): Promise<RawVault[]> {
  try {
    await protocolContract.callStatic.getAllVaultsForAddress(ethereumUserAddress);
    return await protocolContract.getAllVaultsForAddress(ethereumUserAddress);
  } catch (error) {
    throw new EthereumError(`Could not fetch Vaults: ${error}`);
  }
}

export async function getVault(
  observerProtocolContract: Contract,
  vaultUUID: string,
  vaultState: VaultState,
  retryInterval = 5000,
  maxRetries = 10
): Promise<RawVault> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!observerProtocolContract) throw new Error('Protocol contract not initialized');
      const vault: RawVault = await observerProtocolContract.getVault(vaultUUID);
      if (!vault) throw new Error('Vault is undefined');
      if (vault.status !== vaultState) throw new Error('Vault is not in the correct state');
      return vault;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Vault with uuid: ${vaultUUID} is not yet updated. Retrying...`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }
  throw new EthereumError(`Failed to fetch Vault ${vaultUUID} after ${maxRetries} retries`);
}

export async function getRawVault(protocolContract: Contract, vaultUUID: string): Promise<RawVault> {
  const vault: RawVault = await protocolContract.getVault(vaultUUID);
  if (!vault) throw new Error('Vault is undefined');
  return vault;
}

export async function setupVault(
  protocolContract: Contract,
  ethereumNetworkName: string,
  btcDepositAmount: number
): Promise<any | undefined> {
  try {
    const shiftedBtcDepositAmount = shiftValue(btcDepositAmount);
    await protocolContract.callStatic.setupVault(shiftedBtcDepositAmount);
    const transaction = await protocolContract.setupVault(shiftedBtcDepositAmount);
    console.log(`[Ethereum][${ethereumNetworkName}] Creating Vault...`);
    const transactionReceipt = await transaction.wait();
    return transactionReceipt;
  } catch (error: any) {
    throw new EthereumError(`Could not setup Vault: ${error}`);
  }
}

export async function closeVault(protocolContract: Contract, ethereumNetworkName: string, vaultUUID: string) {
  try {
    await protocolContract.callStatic.closeVault(vaultUUID);
    const transaction = await protocolContract.closeVault(vaultUUID);
    console.log(`[Ethereum][${ethereumNetworkName}] Closing Vault ${vaultUUID}...`);
    const transactionReceipt = await transaction.wait();
    return transactionReceipt;
  } catch (error: any) {
    throw new EthereumError(`Could not close Vault: ${error}`);
  }
}

async function getDefaultProvider(ethereumNetwork: EthereumNetwork, contractName: string): Promise<ethers.Contract> {
  try {
    const ethereumNetworkName = ethereumNetwork.name.toLowerCase();
    const provider = ethers.providers.getDefaultProvider(ethereumNetwork.defaultNodeURL);

    const repositoryBranchName = process.env.ETHEREUM_DEPLOYMENT_BRANCH;

    const deploymentPlanURL = `${SOLIDITY_CONTRACT_URL}/${repositoryBranchName}/deploymentFiles/${ethereumNetworkName}/${contractName}.json`;

    const response = await fetch(deploymentPlanURL);
    const contractData = await response.json();

    const protocolContract = new ethers.Contract(contractData.contract.address, contractData.contract.abi, provider);

    return protocolContract;
  } catch (error) {
    throw new EthereumError(`Could not get Default Provider: ${error}}`);
  }
}

export async function getAttestorGroupPublicKey(ethereumNetwork: EthereumNetwork): Promise<string> {
  try {
    const dlcManagerContract = await getDefaultProvider(ethereumNetwork, 'DLCManager');
    const attestorGroupPubKey = await dlcManagerContract.attestorGroupPubKey();
    return attestorGroupPubKey;
  } catch (error) {
    throw new EthereumError(`Could not fetch Attestor Public Key: ${error}`);
  }
}
