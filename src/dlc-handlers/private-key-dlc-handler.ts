import { bytesToHex } from '@noble/hashes/utils';
import { Transaction, p2wpkh } from '@scure/btc-signer';
import { P2Ret, P2TROut, p2tr } from '@scure/btc-signer/payment';
import { Signer } from '@scure/btc-signer/transaction';
import { BIP32Interface } from 'bip32';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedKeyPairFromRootPrivateKey,
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
  finalizeUserInputs,
  getFeeRate,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import { getBalanceByPayment } from '../functions/bitcoin/bitcoin-request-functions.js';
import { BitcoinCoreRpcConnection } from '../functions/bitcoin/bitcoincore-rpc-connection.js';
import {
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawTransaction,
} from '../functions/bitcoin/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';

interface RequiredKeyPair {
  fundingDerivedKeyPair: BIP32Interface;
  taprootDerivedKeyPair: BIP32Interface;
}

export class PrivateKeyDLCHandler {
  private derivedKeyPair: RequiredKeyPair;
  public payment: PaymentInformation | undefined;
  private fundingPaymentType: 'wpkh' | 'tr';
  private bitcoinNetwork: Network;
  private bitcoincoreRpcConnection: BitcoinCoreRpcConnection;
  // private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    bitcoinWalletPrivateKey: string,
    walletAccountIndex: number,
    fundingPaymentType: 'wpkh' | 'tr',
    bitcoinNetwork: Network,
    bitcoincoreRpcConnection: BitcoinCoreRpcConnection,
    // bitcoinBlockchainAPI?: string,
    bitcoinBlockchainFeeRecommendationAPI?: string
  ) {
    switch (bitcoinNetwork) {
      case bitcoin:
        // this.bitcoinBlockchainAPI = 'https://mempool.space/api';
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/api/v1/fees/recommended';
        break;
      case testnet:
        // this.bitcoinBlockchainAPI = 'https://mempool.space/testnet/api';
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/testnet/api/v1/fees/recommended';
        break;
      case regtest:
        if (bitcoinBlockchainFeeRecommendationAPI === undefined) {
          throw new Error('Regtest requires a Bitcoin Blockchain Fee Recommendation API');
        }
        this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
        break;
      default:
        throw new Error('Invalid Bitcoin Network');
    }
    this.fundingPaymentType = fundingPaymentType;
    this.bitcoinNetwork = bitcoinNetwork;
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

    this.derivedKeyPair = {
      taprootDerivedKeyPair,
      fundingDerivedKeyPair,
    };

    this.bitcoincoreRpcConnection = bitcoincoreRpcConnection;
  }

  private setPayment(fundingPayment: P2Ret | P2TROut, multisigPayment: P2TROut): void {
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
    const key = bytesToHex(this.derivedKeyPair.taprootDerivedKeyPair.publicKey);
    console.log('Returning TaprootDerivedPublicKey: ', key);
    return key;
  }

  getVaultRelatedAddress(paymentType: 'funding' | 'multisig'): string {
    const payment = this.payment;

    if (payment === undefined) {
      throw new Error('Payment objects have not been set');
    }

    let address: string;

    switch (paymentType) {
      case 'funding':
        if (!payment.fundingPayment.address) {
          throw new Error('Funding Address is undefined');
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

  private getPrivateKey(paymentType: 'funding' | 'taproot'): Signer {
    const privateKey =
      paymentType === 'funding'
        ? this.derivedKeyPair.fundingDerivedKeyPair.privateKey
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

      let fundingPayment: P2Ret | P2TROut;

      switch (this.fundingPaymentType) {
        case 'wpkh':
          fundingPayment = p2wpkh(
            this.derivedKeyPair.fundingDerivedKeyPair.publicKey,
            this.bitcoinNetwork
          );
          break;
        case 'tr':
          fundingPayment = p2tr(
            ecdsaPublicKeyToSchnorr(this.derivedKeyPair.taprootDerivedKeyPair.publicKey),
            undefined,
            this.bitcoinNetwork
          );
          break;
        default:
          throw new Error('Invalid Funding Payment Type');
      }

      const multisigPayment = createTaprootMultisigPayment(
        unspendableDerivedPublicKey,
        attestorDerivedPublicKey,
        this.derivedKeyPair.taprootDerivedKeyPair.publicKey,
        this.bitcoinNetwork
      );

      this.setPayment(fundingPayment, multisigPayment);

      return {
        fundingPayment,
        multisigPayment,
      };
    } catch (error: any) {
      throw new Error(`Error creating required Payment objects: ${error}`);
    }
  }

  async createFundingPSBT(
    vault: RawVault,
    bitcoinAmount: bigint,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { fundingPayment, multisigPayment } = this.createPayments(
      vault.uuid,
      attestorGroupPublicKey
    );

    const addressBalance = await getBalanceByPayment(fundingPayment, this.bitcoincoreRpcConnection);

    if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
      throw new Error('Insufficient Funds');
    }

    const feeRate =
      customFeeRate ?? BigInt(await getFeeRate(this.bitcoincoreRpcConnection, feeRateMultiplier));

    const fundingTransaction = await createFundingTransaction(
      // this.bitcoinBlockchainAPI,
      this.bitcoincoreRpcConnection,
      this.bitcoinNetwork,
      bitcoinAmount,
      multisigPayment,
      fundingPayment,
      feeRate,
      vault.btcFeeRecipient,
      vault.btcMintFeeBasisPoints.toBigInt()
    );

    return fundingTransaction;
  }

  async createWithdrawPSBT(
    vault: RawVault,
    withdrawAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      const { fundingPayment, multisigPayment } = this.createPayments(
        vault.uuid,
        attestorGroupPublicKey
      );

      const feeRate =
        customFeeRate ?? BigInt(await getFeeRate(this.bitcoincoreRpcConnection, feeRateMultiplier));

      const withdrawTransaction = await createWithdrawTransaction(
        this.bitcoincoreRpcConnection,
        this.bitcoinNetwork,
        withdrawAmount,
        fundingTransactionID,
        multisigPayment,
        fundingPayment,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcRedeemFeeBasisPoints.toBigInt()
      );
      return withdrawTransaction;
    } catch (error: any) {
      throw new Error(`Error creating Withdraw PSBT: ${error}`);
    }
  }

  signPSBT(psbt: Transaction, transactionType: 'funding' | 'deposit' | 'withdraw'): Transaction {
    switch (transactionType) {
      case 'funding':
        psbt.sign(this.getPrivateKey('funding'));
        psbt.finalize();
        break;
      case 'deposit':
        try {
          psbt.sign(this.getPrivateKey('funding'));
        } catch (error: any) {
          // this can happen if there are no tr inputs to sign
        }
        try {
          psbt.sign(this.getPrivateKey('taproot'));
        } catch (error: any) {
          // this can happen if there are no p2wpkh inputs to sign
        }
        finalizeUserInputs(psbt, this.getPayment().fundingPayment);
        break;
      case 'withdraw':
        psbt.sign(this.getPrivateKey('taproot'));
        break;
      default:
        throw new Error('Invalid Transaction Type');
    }

    return psbt;
  }

  async createDepositPSBT(
    depositAmount: bigint,
    vault: RawVault,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ) {
    const { fundingPayment, multisigPayment } = this.createPayments(
      vault.uuid,
      attestorGroupPublicKey
    );

    const feeRate =
      customFeeRate ?? BigInt(await getFeeRate(this.bitcoincoreRpcConnection, feeRateMultiplier));

    const depositTransaction = await createDepositTransaction(
      // this.bitcoinBlockchainAPI,
      this.bitcoincoreRpcConnection,
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
