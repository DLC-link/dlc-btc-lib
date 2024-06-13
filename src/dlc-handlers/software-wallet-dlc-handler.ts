import { Transaction, p2wpkh } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  getBalance,
  getFeeRate,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import {
  createClosingTransaction,
  createFundingTransaction,
  createWithdrawalTransaction,
} from '../functions/bitcoin/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';

export class SoftwareWalletDLCHandler {
  private nativeSegwitDerivedPublicKey: string;
  private taprootDerivedPublicKey: string;
  public payment: PaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    nativeSegwitDerivedPublicKey: string,
    taprootDerivedPublicKey: string,
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI?: string,
    bitcoinBlockchainFeeRecommendationAPI?: string
  ) {
    switch (bitcoinNetwork) {
      case bitcoin:
        this.bitcoinBlockchainAPI = 'https://mempool.space/api';
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/api/v1/fees/recommended';
        break;
      case testnet:
        this.bitcoinBlockchainAPI = 'https://mempool.space/testnet/api';
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/testnet/api/v1/fees/recommended';
        break;
      case regtest:
        if (
          bitcoinBlockchainAPI === undefined ||
          bitcoinBlockchainFeeRecommendationAPI === undefined
        ) {
          throw new Error(
            'Regtest requires a Bitcoin Blockchain API and a Bitcoin Blockchain Fee Recommendation API'
          );
        }
        this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
        this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
        break;
      default:
        throw new Error('Invalid Bitcoin Network');
    }
    this.bitcoinNetwork = bitcoinNetwork;
    this.nativeSegwitDerivedPublicKey = nativeSegwitDerivedPublicKey;
    this.taprootDerivedPublicKey = taprootDerivedPublicKey;
  }

  private setPayment(nativeSegwitPayment: P2Ret, taprootMultisigPayment: P2TROut): void {
    this.payment = {
      nativeSegwitPayment,
      taprootMultisigPayment,
    };
  }

  private getPayment(): PaymentInformation {
    if (!this.payment) {
      throw new Error('Payment Information not set');
    }
    return this.payment;
  }

  getVaultRelatedAddress(paymentType: 'p2wpkh' | 'p2tr'): string {
    const payment = this.getPayment();

    if (payment === undefined) {
      throw new Error('Payment objects have not been set');
    }

    let address: string;

    switch (paymentType) {
      case 'p2wpkh':
        if (!payment.nativeSegwitPayment.address) {
          throw new Error('Native Segwit Payment Address is undefined');
        }
        address = payment.nativeSegwitPayment.address;
        return address;
      case 'p2tr':
        if (!payment.taprootMultisigPayment.address) {
          throw new Error('Taproot Multisig Payment Address is undefined');
        }
        address = payment.taprootMultisigPayment.address;
        return address;
      default:
        throw new Error('Invalid Payment Type');
    }
  }

  private async createPayments(
    vaultUUID: string,
    attestorGroupPublicKey: string
  ): Promise<PaymentInformation> {
    try {
      const nativeSegwitPayment = p2wpkh(
        Buffer.from(this.nativeSegwitDerivedPublicKey, 'hex'),
        this.bitcoinNetwork
      );

      const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
      const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(
        unspendablePublicKey,
        this.bitcoinNetwork
      );

      const attestorDerivedPublicKey = deriveUnhardenedPublicKey(
        attestorGroupPublicKey,
        this.bitcoinNetwork
      );

      const taprootMultisigPayment = createTaprootMultisigPayment(
        unspendableDerivedPublicKey,
        attestorDerivedPublicKey,
        Buffer.from(this.taprootDerivedPublicKey, 'hex'),
        this.bitcoinNetwork
      );

      this.setPayment(nativeSegwitPayment, taprootMultisigPayment);

      return {
        nativeSegwitPayment,
        taprootMultisigPayment,
      };
    } catch (error: any) {
      throw new Error(`Error creating required wallet information: ${error}`);
    }
  }

  async createFundingPSBT(
    vault: RawVault,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      const { nativeSegwitPayment, taprootMultisigPayment } = await this.createPayments(
        vault.uuid,
        attestorGroupPublicKey
      );

      if (
        taprootMultisigPayment.address === undefined ||
        nativeSegwitPayment.address === undefined
      ) {
        throw new Error('Payment Address is undefined');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const addressBalance = await getBalance(
        nativeSegwitPayment.address,
        this.bitcoinBlockchainAPI
      );

      if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
        throw new Error('Insufficient Funds');
      }

      const fundingPSBT = await createFundingTransaction(
        vault.valueLocked.toBigInt(),
        this.bitcoinNetwork,
        taprootMultisigPayment.address,
        nativeSegwitPayment,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcMintFeeBasisPoints.toBigInt(),
        this.bitcoinBlockchainAPI
      );
      return Transaction.fromPSBT(fundingPSBT);
    } catch (error: any) {
      throw new Error(`Error creating Funding PSBT: ${error}`);
    }
  }

  async createClosingPSBT(
    vault: RawVault,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      const { nativeSegwitPayment, taprootMultisigPayment } = this.getPayment();

      if (
        taprootMultisigPayment.address === undefined ||
        nativeSegwitPayment.address === undefined
      ) {
        throw new Error('Payment Address is undefined');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const closingTransaction = createClosingTransaction(
        vault.valueLocked.toBigInt(),
        this.bitcoinNetwork,
        fundingTransactionID,
        taprootMultisigPayment,
        nativeSegwitPayment.address!,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcRedeemFeeBasisPoints.toBigInt()
      );
      return Transaction.fromPSBT(closingTransaction);
    } catch (error: any) {
      throw new Error(`Error creating Closing PSBT: ${error}`);
    }
  }

  async createWithdrawalPSBT(
    vault: RawVault,
    withdrawAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      const { nativeSegwitPayment, taprootMultisigPayment } = await this.createPayments(
        vault.uuid,
        attestorGroupPublicKey
      );

      if (
        taprootMultisigPayment.address === undefined ||
        nativeSegwitPayment.address === undefined
      ) {
        throw new Error('Payment Address is undefined');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const withdrawalTransaction = await createWithdrawalTransaction(
        this.bitcoinBlockchainAPI,
        withdrawAmount,
        this.bitcoinNetwork,
        fundingTransactionID,
        taprootMultisigPayment,
        nativeSegwitPayment.address!,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcRedeemFeeBasisPoints.toBigInt()
      );
      return Transaction.fromPSBT(withdrawalTransaction);
    } catch (error: any) {
      throw new Error(`Error creating Withdrawal PSBT: ${error}`);
    }
  }
}
