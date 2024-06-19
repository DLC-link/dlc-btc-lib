import { Transaction, p2wpkh } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Signer } from '@scure/btc-signer/transaction';
import { BIP32Interface } from 'bip32';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedKeyPairFromRootPrivateKey,
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

interface RequiredKeyPair {
  nativeSegwitDerivedKeyPair: BIP32Interface;
  taprootDerivedKeyPair: BIP32Interface;
}

export class PrivateKeyDLCHandler {
  private derivedKeyPair: RequiredKeyPair;
  public payment: PaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    bitcoinWalletPrivateKey: string,
    walletAccountIndex: number,
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
    const nativeSegwitDerivedKeyPair = deriveUnhardenedKeyPairFromRootPrivateKey(
      bitcoinWalletPrivateKey,
      bitcoinNetwork,
      'p2wpkh',
      walletAccountIndex
    );
    const taprootDerivedKeyPair = deriveUnhardenedKeyPairFromRootPrivateKey(
      bitcoinWalletPrivateKey,
      bitcoinNetwork,
      'p2tr',
      walletAccountIndex
    );

    this.derivedKeyPair = {
      taprootDerivedKeyPair,
      nativeSegwitDerivedKeyPair,
    };
  }

  private setPayment(nativeSegwitPayment: P2Ret, taprootMultisigPayment: P2TROut): void {
    this.payment = {
      nativeSegwitPayment,
      taprootMultisigPayment,
    };
  }

  getVaultRelatedAddress(paymentType: 'p2wpkh' | 'p2tr'): string {
    const payment = this.payment;

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

  private getPrivateKey(paymentType: 'p2wpkh' | 'p2tr'): Signer {
    const privateKey =
      paymentType === 'p2wpkh'
        ? this.derivedKeyPair.nativeSegwitDerivedKeyPair.privateKey
        : this.derivedKeyPair.taprootDerivedKeyPair.privateKey;

    if (!privateKey) {
      throw new Error('Private Key is Undefined');
    }

    return privateKey;
  }

  private createPayments(vaultUUID: string, attestorGroupPublicKey: string): PaymentInformation {
    try {
      const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
      const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(
        unspendablePublicKey,
        this.bitcoinNetwork
      );

      const attestorDerivedPublicKey = deriveUnhardenedPublicKey(
        attestorGroupPublicKey,
        this.bitcoinNetwork
      );

      const nativeSegwitPayment = p2wpkh(
        this.derivedKeyPair.nativeSegwitDerivedKeyPair.publicKey,
        this.bitcoinNetwork
      );

      const taprootMultisigPayment = createTaprootMultisigPayment(
        unspendableDerivedPublicKey,
        attestorDerivedPublicKey,
        this.derivedKeyPair.taprootDerivedKeyPair.publicKey,
        this.bitcoinNetwork
      );

      this.setPayment(nativeSegwitPayment, taprootMultisigPayment);

      return {
        nativeSegwitPayment,
        taprootMultisigPayment,
      };
    } catch (error: any) {
      throw new Error(`Error creating required Payment objects: ${error}`);
    }
  }

  async createFundingPSBT(
    vault: RawVault,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { nativeSegwitPayment, taprootMultisigPayment } = this.createPayments(
      vault.uuid,
      attestorGroupPublicKey
    );

    if (nativeSegwitPayment.address === undefined || taprootMultisigPayment.address === undefined) {
      throw new Error('Could not get Addresses from Payments');
    }

    const addressBalance = await getBalance(nativeSegwitPayment.address, this.bitcoinBlockchainAPI);

    if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
      throw new Error('Insufficient Funds');
    }

    const feeRate =
      customFeeRate ??
      BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

    const fundingTransaction = await createFundingTransaction(
      vault.valueLocked.toBigInt(),
      this.bitcoinNetwork,
      taprootMultisigPayment.address,
      nativeSegwitPayment,
      feeRate,
      vault.btcFeeRecipient,
      vault.btcMintFeeBasisPoints.toBigInt(),
      this.bitcoinBlockchainAPI
    );

    return fundingTransaction;
  }

  async createClosingPSBT(
    vault: RawVault,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    if (this.payment === undefined) {
      throw new Error('Payment objects have not been set');
    }

    const { nativeSegwitPayment, taprootMultisigPayment } = this.payment;

    if (nativeSegwitPayment.address === undefined) {
      throw new Error('Could not get Addresses from Payments');
    }

    const feeRate =
      customFeeRate ??
      BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

    const closingTransaction = createClosingTransaction(
      vault.valueLocked.toBigInt(),
      this.bitcoinNetwork,
      fundingTransactionID,
      taprootMultisigPayment,
      nativeSegwitPayment.address,
      feeRate,
      vault.btcFeeRecipient,
      vault.btcRedeemFeeBasisPoints.toBigInt()
    );

    return closingTransaction;
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
      const { nativeSegwitPayment, taprootMultisigPayment } = this.createPayments(
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
      return withdrawalTransaction;
    } catch (error: any) {
      throw new Error(`Error creating Withdrawal PSBT: ${error}`);
    }
  }

  signPSBT(psbt: Transaction, transactionType: 'funding' | 'closing'): Transaction {
    psbt.sign(this.getPrivateKey(transactionType === 'funding' ? 'p2wpkh' : 'p2tr'));
    if (transactionType === 'funding') psbt.finalize();
    return psbt;
  }
}
