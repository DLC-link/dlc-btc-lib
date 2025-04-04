import { bytesToHex } from '@noble/hashes/utils';
import { Transaction } from '@scure/btc-signer';
import { Signer } from '@scure/btc-signer/transaction';
import { BIP32Interface } from 'bip32';
import { Network } from 'bitcoinjs-lib';

import {
  deriveUnhardenedKeyPairFromRootPrivateKey,
  getInputIndicesByScript,
} from '../functions/bitcoin/bitcoin-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { FundingPaymentType, PaymentType, TransactionType } from '../models/dlc-handler.models.js';
import {
  InvalidTransactionTypeError,
  PaymentNotSetError,
} from '../models/errors/dlc-handler.errors.models.js';
import { AbstractDLCHandler } from './abstract-dlc-handler.js';

export class KeyPairDLCHandler extends AbstractDLCHandler {
  readonly dlcHandlerType = 'keypair' as const;
  private fundingDerivedKeyPair: BIP32Interface;
  private taprootDerivedKeyPair: BIP32Interface;

  constructor(
    bitcoinWalletPrivateKey: string,
    walletAccountIndex: number,
    fundingPaymentType: FundingPaymentType,
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI: string,
    bitcoinBlockchainFeeRecommendationAPI: string
  ) {
    super(
      fundingPaymentType,
      bitcoinNetwork,
      bitcoinBlockchainAPI,
      bitcoinBlockchainFeeRecommendationAPI
    );
    const fundingDerivedKeyPair = deriveUnhardenedKeyPairFromRootPrivateKey(
      bitcoinWalletPrivateKey,
      bitcoinNetwork,
      fundingPaymentType === 'wpkh' ? 'p2wpkh' : 'p2tr',
      walletAccountIndex
    );
    const taprootDerivedKeyPair = deriveUnhardenedKeyPairFromRootPrivateKey(
      bitcoinWalletPrivateKey,
      bitcoinNetwork,
      'p2tr',
      walletAccountIndex
    );

    this.fundingDerivedKeyPair = fundingDerivedKeyPair;
    this.taprootDerivedKeyPair = taprootDerivedKeyPair;
  }

  getUserTaprootPublicKey(tweaked: boolean = false): string {
    if (!tweaked) {
      return bytesToHex(this.taprootDerivedKeyPair.publicKey);
    }

    if (!this.payment) {
      throw new PaymentNotSetError();
    }

    return bytesToHex(this.payment.multisigPayment.tweakedPubkey);
  }

  getUserFundingPublicKey(): string {
    return bytesToHex(this.fundingDerivedKeyPair.publicKey);
  }

  getPayment(): PaymentInformation {
    if (!this._payment) {
      throw new PaymentNotSetError();
    }

    return this._payment;
  }

  private getPrivateKey(paymentType: PaymentType): Signer {
    const keyPairMap: Record<PaymentType, BIP32Interface> = {
      funding: this.fundingDerivedKeyPair,
      multisig: this.taprootDerivedKeyPair,
    };

    const keyPair = keyPairMap[paymentType];

    if (!keyPair?.privateKey) {
      throw new Error(`Private key not found for payment type: ${paymentType}`);
    }

    return keyPair.privateKey;
  }

  async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
    switch (transactionType) {
      case 'funding':
        transaction.sign(this.getPrivateKey('funding'));
        break;
      case 'deposit':
        getInputIndicesByScript(this.payment.fundingPayment.script, transaction).forEach(index => {
          transaction.signIdx(this.getPrivateKey('funding'), index);
        });
        getInputIndicesByScript(this.payment.multisigPayment.script, transaction).forEach(index => {
          transaction.signIdx(this.getPrivateKey('multisig'), index);
        });
        break;
      case 'withdraw':
        transaction.sign(this.getPrivateKey('multisig'));
        break;
      default:
        throw new InvalidTransactionTypeError(transactionType);
    }

    this.finalizeTransaction(transaction, transactionType, this.payment.fundingPayment);

    return transaction;
  }
}
