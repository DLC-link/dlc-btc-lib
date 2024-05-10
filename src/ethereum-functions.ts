/** @format */
import { Contract, ethers } from 'ethers';
import { DisplayVault, EthereumError, RawVault, Vault, VaultState } from './models/ethereum-models.js';
import { customShiftValue, delay, shiftValue, truncateAddress, unshiftValue } from './utilities.js';
import { Logger } from 'ethers/lib/utils.js';
import { EthereumNetwork, ethereumArbitrumSepolia, ethereumArbitrum } from './ethereum-network.js';
import { fetchVault } from './prompt-functions.js';

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

function formatVault(vault: RawVault): Vault {
  return {
    uuid: vault.uuid,
    timestamp: vault.timestamp.toNumber(),
    collateral: unshiftValue(vault.valueLocked.toNumber()),
    state: vault.status,
    userPublicKey: vault.taprootPubKey,
    fundingTX: vault.fundingTxId,
    closingTX: vault.closingTxId,
    btcFeeRecipient: vault.btcFeeRecipient,
    btcMintFeeBasisPoints: customShiftValue(vault.btcMintFeeBasisPoints.toNumber(), 4, true),
    btcRedeemFeeBasisPoints: customShiftValue(vault.btcRedeemFeeBasisPoints.toNumber(), 4, true),
    taprootPubKey: vault.taprootPubKey,
  };
}

export function formatVaultToDisplay(vault: Vault): DisplayVault {
  return {
    uuid: vault.uuid,
    truncatedUUID: truncateAddress(vault.uuid),
    state: VaultState[vault.state],
    collateral: vault.collateral,
    createdAt: new Date(vault.timestamp * 1000).toLocaleDateString('en-US'),
  };
}

export function formatVaultsToDisplay(vaults: Vault[]): DisplayVault[] {
  return vaults.map(formatVaultToDisplay);
}

// @ts-ignore
export function throwEthereumError(message: string, error: Error): void {
  throw new EthereumError(`ETHEREUMERROROCSKA`);
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

// async function getLockedBTCBalance(): Promise<number | undefined> {
//   try {
//     const totalCollateral = vaults.fundedVaults.reduce((sum: number, vault: Vault) => sum + vault.collateral, 0);
//     return Number(totalCollateral.toFixed(5));
//   } catch (error) {
//     throwEthereumError(`Could not fetch locked BTC balance: `, error);
//   }
// }

// async function getDLCBTCBalance(): Promise<number | undefined> {
//   try {
//     if (!dlcBTCContract) throw new Error('Protocol contract not initialized');
//     await dlcBTCContract.callStatic.balanceOf(address);
//     const dlcBTCBalance = customShiftValue(await dlcBTCContract.balanceOf(address), 8, true);
//     return dlcBTCBalance;
//   } catch (error) {
//     throwEthereumError(`Could not fetch dlcBTC balance: `, error);
//   }
// }

// async function getAttestorGroupPublicKey(ethereumNetwork: EthereumNetwork): Promise<string> {
//   try {
//     const dlcManagerContract = await getDefaultProvider(ethereumNetwork, 'DLCManager');
//     const attestorGroupPubKey = await dlcManagerContract.attestorGroupPubKey();
//     return attestorGroupPubKey;
//   } catch (error) {
//     throw new EthereumError(`Could not fetch Attestor Public Key: ${error}`);
//   }
// }

export async function getAllVaults(protocolContract: Contract, ethereumUserAddress: string): Promise<Vault[]> {
  try {
    await protocolContract.callStatic.getAllVaultsForAddress(ethereumUserAddress);
    const vaults: RawVault[] = await protocolContract.getAllVaultsForAddress(ethereumUserAddress);
    const formattedVaults: Vault[] = vaults.map(formatVault);
    return formattedVaults;
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
): Promise<Vault> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!observerProtocolContract) throw new Error('Protocol contract not initialized');
      const vault: RawVault = await observerProtocolContract.getVault(vaultUUID);
      if (!vault) throw new Error('Vault is undefined');
      if (vault.status !== vaultState) throw new Error('Vault is not in the correct state');
      const formattedVault: Vault = formatVault(vault);
      return formattedVault;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Vault with uuid: ${vaultUUID} is not yet updated. Retrying...`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryInterval));
  }
  throw new EthereumError(`Failed to fetch Vault ${vaultUUID} after ${maxRetries} retries`);
}

// async function getAllFundedVaults(ethereumNetwork: EthereumNetwork): Promise<RawVault[]> {
//   try {
//     const dlcManagerContract = await getDefaultProvider(ethereumNetwork, 'DLCManager');
//     const vaults: RawVault[] = await dlcManagerContract.getFundedDLCs(0, 10000);
//     const filteredVaults = vaults.filter(
//       (vault) => vault.uuid != '0x0000000000000000000000000000000000000000000000000000000000000000'
//     );
//     return filteredVaults;
//   } catch (error) {
//     throw new EthereumError(`Could not fetch Funded Vaults: ${error}`);
//   }
// }

export async function setupVault(
  protocolContract: Contract,
  ethereumNetworkName: string,
  btcDepositAmount: number
): Promise<string | undefined> {
  try {
    const shiftedBtcDepositAmount = shiftValue(btcDepositAmount);
    await protocolContract.callStatic.setupVault(shiftedBtcDepositAmount);
    const transaction = await protocolContract.setupVault(shiftedBtcDepositAmount);
    console.log(`[Ethereum][${ethereumNetworkName}] Creating Vault...`);
    const transactionReceipt = await transaction.wait();
    return transactionReceipt;
  } catch (error: any) {
    throwEthereumError(`Could not setup Vault: `, error);
  }
}

export async function closeVault(protocolContract: Contract, ethereumNetworkName: string, vaultUUID: string) {
  try {
    await protocolContract.callStatic.closeVault(vaultUUID);
    const transaction = await protocolContract.closeVault(vaultUUID);
    const transactionReceipt = await transaction.wait();
    console.log(`[Ethereum][${ethereumNetworkName}] Closing Vault ${vaultUUID}...`);
    return transactionReceipt;
  } catch (error: any) {
    throwEthereumError(`Could not close Vault: `, error);
  }
}
