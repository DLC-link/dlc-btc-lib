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
  ArbitrumSepolia = '421614',
  Base = '8453',
  BaseSepolia = '84532',
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

export class JSONFriendlyRawVault {
  uuid: string;
  protocolContract: string;
  timestamp: string;
  valueLocked: string;
  valueMinted: string;
  creator: string;
  status: number;
  fundingTxId: string;
  closingTxId: string;
  wdTxId: string;
  btcFeeRecipient: string;
  btcMintFeeBasisPoints: string;
  btcRedeemFeeBasisPoints: string;
  taprootPubKey: string;

  constructor(vault: RawVault) {
    this.uuid = vault.uuid.toString();
    this.protocolContract = vault.protocolContract.toString();
    this.creator = vault.creator.toString();
    this.status = vault.status;
    this.fundingTxId = vault.fundingTxId;
    this.closingTxId = vault.closingTxId;
    this.btcFeeRecipient = vault.btcFeeRecipient;
    this.taprootPubKey = vault.taprootPubKey;
    this.wdTxId = vault.wdTxId;
    this.timestamp = vault.timestamp.toJSON();
    this.valueLocked = vault.valueLocked.toJSON();
    this.valueMinted = vault.valueMinted.toJSON();
    this.btcMintFeeBasisPoints = vault.btcMintFeeBasisPoints.toJSON();
    this.btcRedeemFeeBasisPoints = vault.btcRedeemFeeBasisPoints.toJSON();
  }

  static rawVaultFromJSON(jsonVault: any): RawVault {
    console.log('[rawVaultFromJSON]: json string: ' + jsonVault);
    const jsonVaultObj = JSON.parse(jsonVault);
    console.log('jsonVault.uuid: ' + jsonVaultObj.uuid);
    console.log('timestamp from JSON: ' + jsonVaultObj.timestamp);
    console.log('timestamp hex from JSON: ' + jsonVaultObj.timestamp.hex);
    return {
      uuid: jsonVaultObj.uuid,
      protocolContract: jsonVaultObj.protocolContract,
      timestamp: BigNumber.from(jsonVaultObj.timestamp.hex),
      valueLocked: BigNumber.from(jsonVaultObj.valueLocked.hex),
      valueMinted: BigNumber.from(jsonVaultObj.valueMinted.hex),
      creator: jsonVaultObj.creator,
      status: jsonVaultObj.status,
      fundingTxId: jsonVaultObj.fundingTxId,
      closingTxId: jsonVaultObj.closingTxId,
      wdTxId: jsonVaultObj.wdTxId,
      btcFeeRecipient: jsonVaultObj.btcFeeRecipient,
      btcMintFeeBasisPoints: BigNumber.from(jsonVaultObj.btcMintFeeBasisPoints.hex),
      btcRedeemFeeBasisPoints: BigNumber.from(jsonVaultObj.btcRedeemFeeBasisPoints.hex),
      taprootPubKey: jsonVaultObj.taprootPubKey,
    };
  }
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
export type DLCEthereumContractName = 'DLCManager' | 'DLCBTC';
export type DLCSolidityBranchName = 'dev' | 'testnet-rolling';
