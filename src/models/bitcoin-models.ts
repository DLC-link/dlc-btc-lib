/** @format */
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';

interface TransactionStatus {
  confirmed: boolean;
  block_height: number;
  block_hash: string;
  block_time: number;
}

export interface UTXO {
  txid: string;
  vout: number;
  status: TransactionStatus;
  value: number;
}

export interface BitcoinInputSigningConfig {
  derivationPath: string;
  index: number;
}

export interface FeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface RequiredPayment {
  nativeSegwitPayment: P2Ret;
  taprootMultisigPayment: P2TROut;
}

export interface PaymentInformation {
  nativeSegwitPayment: P2Ret;
  nativeSegwitDerivedPublicKey: Buffer;
  taprootMultisigPayment: P2TROut;
  taprootDerivedPublicKey: Buffer;
}

export type PaymentTypes = 'p2pkh' | 'p2sh' | 'p2wpkh-p2sh' | 'p2wpkh' | 'p2tr';

export type BitcoinNetworkName = 'Mainnet' | 'Testnet' | 'Regtest';
