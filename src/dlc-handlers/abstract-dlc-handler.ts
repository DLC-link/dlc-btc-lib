import { Transaction } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network } from 'bitcoinjs-lib';
import { regtest } from 'bitcoinjs-lib/src/networks.js';

import {
  createNativeSegwitPayment,
  createTaprootMultisigPayment,
  createTaprootPayment,
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
  finalizeUserInputs,
  getBalance,
  getFeeRate,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import {
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawTransaction,
} from '../functions/bitcoin/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import {
  DLCHandlerType,
  FundingPaymentType,
  PaymentType,
  TransactionType,
} from '../models/dlc-handler.models.js';
import {
  AddressNotFoundError,
  InsufficientFundsError,
  InvalidPaymentTypeError,
  PaymentNotSetError,
} from '../models/errors/dlc-handler.errors.models.js';
import { RawVault } from '../models/ethereum-models.js';

export abstract class AbstractDLCHandler {
  abstract readonly dlcHandlerType: DLCHandlerType;
  protected fundingPaymentType: FundingPaymentType;
  protected _payment?: PaymentInformation;
  protected readonly bitcoinNetwork: Network;
  protected readonly bitcoinBlockchainAPI: string;
  protected readonly bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    fundingPaymentType: FundingPaymentType,
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI: string,
    bitcoinBlockchainFeeRecommendationAPI: string
  ) {
    this.fundingPaymentType = fundingPaymentType;
    this.bitcoinNetwork = bitcoinNetwork;
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
  }

  protected set payment(payment: PaymentInformation) {
    this._payment = payment;
  }

  protected get payment(): PaymentInformation {
    if (!this._payment) {
      throw new PaymentNotSetError();
    }
    return this._payment;
  }

  getVaultRelatedAddress(paymentType: PaymentType): string {
    switch (paymentType) {
      case 'funding':
        if (!this.payment.fundingPayment.address) {
          throw new AddressNotFoundError('funding');
        }
        return this.payment.fundingPayment.address;
      case 'multisig':
        if (!this.payment.multisigPayment.address) {
          throw new AddressNotFoundError('multisig');
        }
        return this.payment.multisigPayment.address;
      default:
        throw new InvalidPaymentTypeError(paymentType);
    }
  }

  protected async createPaymentInformation(
    vaultUUID: string,
    attestorGroupPublicKey: string
  ): Promise<PaymentInformation> {
    let fundingPayment: P2Ret | P2TROut;

    if (this.fundingPaymentType === 'wpkh') {
      const fundingPublicKeyBuffer = Buffer.from(this.getUserFundingPublicKey(), 'hex');
      fundingPayment = createNativeSegwitPayment(fundingPublicKeyBuffer, this.bitcoinNetwork);
    } else {
      const fundingPublicKeyBuffer = Buffer.from(this.getUserFundingPublicKey(), 'hex');
      const fundingSchnorrPublicKeyBuffer = ecdsaPublicKeyToSchnorr(fundingPublicKeyBuffer);
      fundingPayment = createTaprootPayment(fundingSchnorrPublicKeyBuffer, this.bitcoinNetwork);
    }

    const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
    const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(
      unspendablePublicKey,
      this.bitcoinNetwork
    );

    const attestorDerivedPublicKey = deriveUnhardenedPublicKey(
      attestorGroupPublicKey,
      this.bitcoinNetwork
    );

    const taprootPublicKeyBuffer = Buffer.from(this.getUserTaprootPublicKey(), 'hex');

    const multisigPayment = createTaprootMultisigPayment(
      unspendableDerivedPublicKey,
      attestorDerivedPublicKey,
      taprootPublicKeyBuffer,
      this.bitcoinNetwork
    );

    const paymentInformation = { fundingPayment, multisigPayment };

    this.payment = paymentInformation;
    return paymentInformation;
  }

  private async validateFundsAvailability(
    fundingPayment: P2Ret | P2TROut,
    requiredAmount: bigint
  ): Promise<void> {
    const currentBalance = BigInt(await getBalance(fundingPayment, this.bitcoinBlockchainAPI));

    if (currentBalance < requiredAmount) {
      throw new InsufficientFundsError(currentBalance, requiredAmount);
    }
  }

  protected async getFeeRate(feeRateMultiplier?: number, customFeeRate?: bigint): Promise<bigint> {
    if (customFeeRate) {
      return customFeeRate;
    }

    if (this.bitcoinNetwork === regtest) {
      return BigInt(2);
    }

    return BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));
  }

  async createFundingPSBT(
    vault: RawVault,
    depositAmount: bigint,
    attestorGroupPublicKey: string,
    feeRecipient: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { fundingPayment, multisigPayment } = await this.createPaymentInformation(
      vault.uuid,
      attestorGroupPublicKey
    );

    const feeRate = await this.getFeeRate(feeRateMultiplier, customFeeRate);

    await this.validateFundsAvailability(fundingPayment, vault.valueLocked.toBigInt());

    return await createFundingTransaction(
      this.bitcoinBlockchainAPI,
      this.bitcoinNetwork,
      depositAmount,
      multisigPayment,
      fundingPayment,
      feeRate,
      feeRecipient,
      vault.btcMintFeeBasisPoints.toBigInt()
    );
  }

  async createWithdrawPSBT(
    vault: RawVault,
    withdrawAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRecipient: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { fundingPayment, multisigPayment } = await this.createPaymentInformation(
      vault.uuid,
      attestorGroupPublicKey
    );

    const feeRate = await this.getFeeRate(feeRateMultiplier, customFeeRate);

    return await createWithdrawTransaction(
      this.bitcoinBlockchainAPI,
      this.bitcoinNetwork,
      withdrawAmount,
      fundingTransactionID,
      multisigPayment,
      fundingPayment,
      feeRate,
      feeRecipient,
      vault.btcRedeemFeeBasisPoints.toBigInt()
    );
  }

  async createDepositPSBT(
    vault: RawVault,
    depositAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRecipient: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { fundingPayment, multisigPayment } = await this.createPaymentInformation(
      vault.uuid,
      attestorGroupPublicKey
    );

    const feeRate = await this.getFeeRate(feeRateMultiplier, customFeeRate);

    return await createDepositTransaction(
      this.bitcoinBlockchainAPI,
      this.bitcoinNetwork,
      depositAmount,
      fundingTransactionID,
      multisigPayment,
      fundingPayment,
      feeRate,
      feeRecipient,
      vault.btcMintFeeBasisPoints.toBigInt()
    );
  }

  private readonly transactionFinalizers: Record<
    TransactionType,
    (transaction: Transaction, payment: P2Ret | P2TROut) => void
  > = {
    funding: transaction => transaction.finalize(),
    deposit: (transaction, payment) => finalizeUserInputs(transaction, payment),
    withdraw: () => {},
  };

  protected finalizeTransaction(
    signedTransaction: Transaction,
    transactionType: TransactionType,
    fundingPayment: P2Ret | P2TROut
  ): void {
    this.transactionFinalizers[transactionType](signedTransaction, fundingPayment);
  }

  abstract signPSBT(
    transaction: Transaction,
    transactionType: TransactionType
  ): Promise<Transaction>;

  abstract getUserTaprootPublicKey(tweaked?: boolean): string;

  abstract getUserFundingPublicKey(): string;
}
