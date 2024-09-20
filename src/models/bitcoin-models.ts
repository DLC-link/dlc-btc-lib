import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Bytes } from '@scure/btc-signer/utils';
import { UTXO } from 'bitcoin-core';

export class ModifiedUTXO {
  payment: P2Ret | P2TROut;
  txid: string;
  index: number;
  value: number;
  witnessUtxo: WitnessUTXO;
  redeemScript?: Uint8Array;

  constructor(payment: P2Ret | P2TROut, utxo: UTXO) {
    this.payment = payment;
    this.txid = utxo.txid;
    this.index = utxo.vout;
    this.value = Math.round(utxo.amount * 100_000_000);
    this.witnessUtxo = new WitnessUTXO(payment.script, BigInt(this.value));
    this.redeemScript = payment.redeemScript;
  }
}

export class WitnessUTXO {
  script: Bytes;
  amount: bigint;

  constructor(script: Bytes, amount: bigint) {
    this.script = script;
    this.amount = amount;
  }
}

export interface BitcoinInputSigningConfig {
  isMultisigInput: boolean;
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

export interface PaymentInformation {
  fundingPayment: P2Ret | P2TROut;
  multisigPayment: P2TROut;
}

export interface ExtendedPaymentInformation extends PaymentInformation {
  fundingDerivedPublicKey: Buffer;
  taprootDerivedPublicKey: Buffer;
}

interface BitcoinTransactionIssuance {
  asset_id: string;
  is_reissuance: boolean;
  asset_blinding_nonce: number;
  asset_entropy: number;
  contract_hash: string;
  assetamount?: number;
  assetamountcommitment?: number;
  tokenamount?: number;
  tokenamountcommitment?: number;
}

interface BitcoinTransactionPegOut {
  genesis_hash: string;
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_address: string;
}

interface BitcoinTransactionStatus {
  confirmed: boolean;
  block_height?: number | null;
  block_hash?: string | null;
  block_time?: number | null;
}

export interface BitcoinTransactionVectorOutput {
  scriptpubkey: string;
  scriptpubkey_asm: string;
  scriptpubkey_type: string;
  scriptpubkey_address: string;
  value: number;
  valuecommitment?: number;
  asset?: string;
  assetcommitment?: number;
  pegout?: BitcoinTransactionPegOut | null;
}

interface BitcoinTransactionVectorInput {
  inner_redeemscript_asm?: string;
  inner_witnessscript_asm?: string;
  is_coinbase: boolean;
  is_pegin?: boolean;
  issuance?: BitcoinTransactionIssuance | null;
  prevout: BitcoinTransactionVectorOutput;
  scriptsig: string;
  scriptsig_asm: string;
  sequence: number;
  txid: string;
  vout: number;
  witness: string[];
}

export interface BitcoinTransaction {
  fee: number;
  locktime: number;
  size: number;
  status: BitcoinTransactionStatus;
  tx_type?: string;
  txid: string;
  version: number;
  vin: BitcoinTransactionVectorInput[];
  vout: BitcoinTransactionVectorOutput[];
  weight: number;
}

export type PaymentTypes = 'p2pkh' | 'p2sh' | 'p2wpkh-p2sh' | 'p2wpkh' | 'p2tr';

export type BitcoinNetworkName = 'Mainnet' | 'Testnet' | 'Regtest';
