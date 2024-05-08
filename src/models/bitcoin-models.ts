/** @format */

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

export type PaymentTypes = 'p2pkh' | 'p2sh' | 'p2wpkh-p2sh' | 'p2wpkh' | 'p2tr';

export type BitcoinNetworkName = 'Mainnet' | 'Testnet';
