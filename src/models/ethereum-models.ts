import { BigNumber, Contract } from 'ethers';

export interface EthereumNetwork {
  id: EthereumNetworkID;
  name: string;
  displayName: string;
  defaultNodeURL: string;
}

export enum EthereumNetworkID {
  ArbitrumSepolia = '421614',
  Arbitrum = '42161',
}

export enum VaultState {
  'Ready',
  'Funded',
  'Closing',
  'Closed',
  'Funding',
}

export interface RawVault {
  uuid: string;
  protocolContract: string;
  timestamp: BigNumber;
  valueLocked: BigNumber;
  creator: string;
  status: number;
  fundingTxId: string;
  closingTxId: string;
  btcFeeRecipient: string;
  btcMintFeeBasisPoints: BigNumber;
  btcRedeemFeeBasisPoints: BigNumber;
  taprootPubKey: string;
}

interface EthereumContract {
  name: string;
  address: string;
  signerAddress: string;
  abi: string[];
}

export interface EthereumDeploymentPlan {
  network: string;
  updatedAt: string;
  gitSHA: string;
  contract: EthereumContract;
}

export interface DLCEthereumContracts {
  protocolContract: Contract;
  dlcManagerContract: Contract;
  dlcBTCContract: Contract;
}

export type SupportedNetwork = 'arbitrum' | 'arbitrum-sepolia-testnet' | 'arbitrum-sepolia-devnet';
export type DLCEthereumContractName = 'TokenManager' | 'DLCManager' | 'DLCBTC';
export type DLCSolidityBranchName = 'dev' | 'testnet-rolling';
