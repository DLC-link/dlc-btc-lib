import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';

import { PaymentInformation } from '../models/bitcoin-models.js';
import {
  AbstractDLCHandler,
  FundingPaymentType,
  PaymentNotSetError,
  TransactionType,
} from './abstract-dlc-handler.js';

const networkModes = ['mainnet', 'testnet', 'regtest'] as const;

type NetworkModes = (typeof networkModes)[number];

declare enum SignatureHash {
  ALL = 1,
  NONE = 2,
  SINGLE = 3,
  ALL_ANYONECANPAY = 129,
  NONE_ANYONECANPAY = 130,
  SINGLE_ANYONECANPAY = 131,
}

interface SignPsbtRequestParams {
  hex: string;
  allowedSighash?: SignatureHash[];
  signAtIndex?: number | number[];
  network?: NetworkModes;
  account?: number;
  broadcast?: boolean;
}

export class LeatherDLCHandler extends AbstractDLCHandler {
  readonly _dlcHandlerType = 'browser' as const;
  protected _payment?: PaymentInformation;
  private taprootDerivedPublicKey: string;
  private fundingDerivedPublicKey: string;

  constructor(
    fundingPaymentType: FundingPaymentType,
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI: string,
    bitcoinBlockchainFeeRecommendationAPI: string,
    fundingDerivedPublicKey: string,
    taprootDerivedPublicKey: string
  ) {
    super(
      fundingPaymentType,
      bitcoinNetwork,
      bitcoinBlockchainAPI,
      bitcoinBlockchainFeeRecommendationAPI
    );
    this.fundingDerivedPublicKey = fundingDerivedPublicKey;
    this.taprootDerivedPublicKey = taprootDerivedPublicKey;
  }

  getUserTaprootPublicKey(tweaked: boolean = false): string {
    if (!tweaked) {
      return this.taprootDerivedPublicKey;
    }

    if (!this.payment) {
      throw new PaymentNotSetError();
    }

    return bytesToHex(this.payment.multisigPayment.tweakedPubkey);
  }

  getUserFundingPublicKey(): string {
    return this.fundingDerivedPublicKey;
  }

  async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
    const requestParams: SignPsbtRequestParams = {
      hex: bytesToHex(transaction.toPSBT()),
    };
    const response = await (window as any).btc.request('signPsbt', requestParams);

    const signedTransactionHex = response.result.hex;

    const signedTransaction = Transaction.fromPSBT(hexToBytes(signedTransactionHex));

    this.finalizeTransaction(signedTransaction, transactionType, this.payment.fundingPayment);

    return signedTransaction;
  }
}
