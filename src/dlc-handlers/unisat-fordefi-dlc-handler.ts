import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { getInputIndicesByScript } from 'src/functions/bitcoin/bitcoin-functions.js';

import { PaymentInformation } from '../models/bitcoin-models.js';
import {
  AbstractDLCHandler,
  FundingPaymentType,
  PaymentNotSetError,
  TransactionType,
} from './abstract-dlc-handler.js';

export interface UnisatToSignInput {
  index: number;
  address?: string;
  publicKey?: string;
  sighashTypes?: number[];
  disableTweakSigner?: boolean;
}

export interface UnisatSignPsbtRequestOptions {
  autoFinalized?: boolean;
  toSignInputs?: UnisatToSignInput[];
}

export class UnisatFordefiDLCHandler extends AbstractDLCHandler {
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

  private getInputsToSign(transaction: Transaction): UnisatToSignInput[] {
    const { multisigPayment, fundingPayment } = this.payment;

    const multisigInputIndices = getInputIndicesByScript(multisigPayment.script, transaction);
    const fundingInputIndices = getInputIndicesByScript(fundingPayment.script, transaction);

    const multisigInputsToSign: UnisatToSignInput[] = multisigInputIndices.map(index => ({
      index,
      publicKey: this.getUserTaprootPublicKey(),
      disableTweakSigner: true,
    }));

    const fundingInputsToSign: UnisatToSignInput[] = fundingInputIndices.map(index => ({
      index,
      address: fundingPayment.address,
    }));

    return multisigInputsToSign.concat(fundingInputsToSign);
  }

  async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
    const inputsToSign = this.getInputsToSign(transaction);

    const options: UnisatSignPsbtRequestOptions = {
      autoFinalized: false,
      toSignInputs: inputsToSign,
    };
    const signedTransactionHex = await (window as any).unisat.signPsbt(
      bytesToHex(transaction.toPSBT()),
      options
    );

    const signedTransaction = Transaction.fromPSBT(hexToBytes(signedTransactionHex));

    this.finalizeTransaction(signedTransaction, transactionType, this.payment.fundingPayment);

    return signedTransaction;
  }
}
