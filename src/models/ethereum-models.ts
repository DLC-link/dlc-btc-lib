/** @format */

import { BigNumber } from 'ethers';

export enum VaultState {
  'Ready',
  'Funded',
  'Closing',
  'Closed',
  'Funding',
}

export interface Vault {
  uuid: string;
  timestamp: number;
  collateral: number;
  state: number;
  userPublicKey: string;
  fundingTX: string;
  closingTX: string;
  btcFeeRecipient: string;
  btcMintFeeBasisPoints: number;
  btcRedeemFeeBasisPoints: number;
  taprootPubKey: string;
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

export interface DisplayVault {
  uuid: string;
  truncatedUUID: string;
  state: string;
  collateral: number;
  createdAt: string;
}

export class EthereumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EthereumError';
  }
}
