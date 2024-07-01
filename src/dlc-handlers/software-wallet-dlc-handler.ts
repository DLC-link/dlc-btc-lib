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
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawalTransaction,
} from '../functions/bitcoin/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';

export class SoftwareWalletDLCHandler {
  private fundingDerivedPublicKey: string;
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
    this.fundingDerivedPublicKey = nativeSegwitDerivedPublicKey;
    this.taprootDerivedPublicKey = taprootDerivedPublicKey;
  }

  private setPayment(fundingPayment: P2Ret, multisigPayment: P2TROut): void {
    this.payment = {
      fundingPayment,
      multisigPayment,
    };
  }

  private getPayment(): PaymentInformation {
    if (!this.payment) {
      throw new Error('Payment Information not set');
    }
    return this.payment;
  }

  getTaprootDerivedPublicKey(): string {
    return this.taprootDerivedPublicKey;
  }

  getVaultRelatedAddress(paymentType: 'funding' | 'multisig'): string {
    const payment = this.getPayment();

    if (payment === undefined) {
      throw new Error('Payment objects have not been set');
    }

    let address: string;

    switch (paymentType) {
      case 'funding':
        if (!payment.fundingPayment.address) {
          throw new Error('Funding Payment Address is undefined');
        }
        address = payment.fundingPayment.address;
        return address;
      case 'multisig':
        if (!payment.multisigPayment.address) {
          throw new Error('Taproot Multisig Payment Address is undefined');
        }
        address = payment.multisigPayment.address;
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
      const fundingPayment = p2wpkh(
        Buffer.from(this.fundingDerivedPublicKey, 'hex'),
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

      const multisigPayment = createTaprootMultisigPayment(
        unspendableDerivedPublicKey,
        attestorDerivedPublicKey,
        Buffer.from(this.taprootDerivedPublicKey, 'hex'),
        this.bitcoinNetwork
      );

      this.setPayment(fundingPayment, multisigPayment);

      return {
        fundingPayment,
        multisigPayment,
      };
    } catch (error: any) {
      throw new Error(`Error creating required wallet information: ${error}`);
    }
  }

  async createFundingPSBT(
    vault: RawVault,
    bitcoinAmount: bigint,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      const { fundingPayment, multisigPayment } = await this.createPayments(
        vault.uuid,
        attestorGroupPublicKey
      );

      if (fundingPayment.address === undefined || multisigPayment.address === undefined) {
        throw new Error('Payment Address is undefined');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const addressBalance = await getBalance(fundingPayment.address, this.bitcoinBlockchainAPI);

      if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
        throw new Error('Insufficient Funds');
      }

      const fundingTransaction = await createFundingTransaction(
        bitcoinAmount,
        this.bitcoinNetwork,
        multisigPayment.address,
        fundingPayment,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcMintFeeBasisPoints.toBigInt(),
        this.bitcoinBlockchainAPI
      );
      return fundingTransaction;
    } catch (error: any) {
      throw new Error(`Error creating Funding PSBT: ${error}`);
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
      const { fundingPayment, multisigPayment } = this.getPayment();

      if (multisigPayment.address === undefined || fundingPayment.address === undefined) {
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
        multisigPayment,
        fundingPayment.address!,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcRedeemFeeBasisPoints.toBigInt()
      );
      return withdrawalTransaction;
    } catch (error: any) {
      throw new Error(`Error creating Withdrawal PSBT: ${error}`);
    }
  }

  async createDepositPSBT(
    depositAmount: bigint,
    vault: RawVault,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ) {
    const { fundingPayment, multisigPayment } = await this.createPayments(
      vault.uuid,
      attestorGroupPublicKey
    );

    if (multisigPayment.address === undefined || fundingPayment.address === undefined) {
      throw new Error('Payment Address is undefined');
    }

    const feeRate =
      customFeeRate ??
      BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

    const depositTransaction = await createDepositTransaction(
      this.bitcoinBlockchainAPI,
      this.bitcoinNetwork,
      depositAmount,
      fundingTransactionID,
      multisigPayment,
      fundingPayment,
      feeRate,
      vault.btcFeeRecipient,
      vault.btcMintFeeBasisPoints.toBigInt()
    );

    return depositTransaction;
  }
}
