import { BigNumber, Contract } from 'ethers';

export interface EthereumNetwork {
  id: EthereumNetworkID;
  name: string;
  displayName: string;
  defaultNodeURL: string;
}

export enum EthereumNetworkID {
  Mainnet = '1',
  Sepolia = '11155111',
  Arbitrum = '42161',
  Avalanche = '43114',
  BSC = '56',
  ArbitrumSepolia = '421614',
  Base = '8453',
  BaseSepolia = '84532',
  Holesky = '17000',
  Hardhat = '31337',
}

export enum VaultState {
  READY = 0,
  FUNDED = 1,
  CLOSING = 2,
  CLOSED = 3,
  PENDING = 4,
}

export interface RawVault {
  uuid: string;
  protocolContract: string;
  timestamp: BigNumber;
  valueLocked: BigNumber;
  valueMinted: BigNumber;
  creator: string;
  status: number;
  fundingTxId: string;
  closingTxId: string;
  wdTxId: string;
  btcFeeRecipient: string;
  btcMintFeeBasisPoints: BigNumber;
  btcRedeemFeeBasisPoints: BigNumber;
  taprootPubKey: string;
  icyIntegrationAddress: string;
}

export interface SSPVaultUpdate {
  status: number;
  wdTxId: string;
  taprootPubKey: string;
}

export interface SSFVaultUpdate {
  status: number;
  fundingTxId: string;
  wdTxId: string;
  valueMinted: bigint;
  valueLocked: bigint;
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

export interface DetailedEvent {
  from: string;
  to: string;
  value: number;
  timestamp: number;
  txHash: string;
}

export interface DLCEthereumContracts {
  dlcManagerContract: Contract;
  dlcBTCContract: Contract;
}

export type SupportedNetwork = 'arbitrum' | 'arbitrum-sepolia-testnet' | 'arbitrum-sepolia-devnet';
export type DLCEthereumContractName = 'DLCManager' | 'IBTC';
export type DLCSolidityBranchName = 'dev' | 'testnet-rolling';
