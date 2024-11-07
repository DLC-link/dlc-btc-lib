import { DfnsDelegatedApiClient } from '@dfns/sdk';
import { WebAuthnSigner } from '@dfns/sdk-browser';
import { GenerateSignatureBody, ListWalletsResponse } from '@dfns/sdk/generated/wallets/types.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Transaction, p2tr } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
  getBalance,
  getFeeRate,
  getInputIndicesByScript,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import {
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawTransaction,
} from '../functions/bitcoin/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';
import { createRangeFromLength } from '../utilities/index.js';

export class DFNSDLCHandler {
  private dfnsDelegatedAPIClient: DfnsDelegatedApiClient;
  private taprootDerivedPublicKey: string | undefined;
  public walletID: string | undefined;
  public payment: PaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    dfnsAppID: string,
    appBaseURL: string,
    dfnsAuthToken: string,
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI: string,
    bitcoinBlockchainFeeRecommendationAPI: string
  ) {
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
    this.bitcoinNetwork = bitcoinNetwork;
    this.dfnsDelegatedAPIClient = new DfnsDelegatedApiClient({
      baseUrl: appBaseURL,
      appId: dfnsAppID,
      authToken: dfnsAuthToken,
    });
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

  async getWallets(): Promise<ListWalletsResponse> {
    try {
      return await this.dfnsDelegatedAPIClient.wallets.listWallets();
    } catch (error: any) {
      throw new Error(`Error fetching wallets: ${error}`);
    }
  }

  async getWalletByID(walletID: string): Promise<void> {
    try {
      const wallet = await this.dfnsDelegatedAPIClient.wallets.getWallet({ walletId: walletID });
      this.setWalletID(wallet.id);
      this.setTaprootDerivedPublicKey(wallet.signingKey.publicKey);
    } catch (error: any) {
      throw new Error(`Error fetching wallet: ${error}`);
    }
  }

  setWalletID(walletID: string): void {
    this.walletID = walletID;
  }

  setTaprootDerivedPublicKey(taprootDerivedPublicKey: string): void {
    this.taprootDerivedPublicKey = taprootDerivedPublicKey;
  }

  getTaprootDerivedPublicKey(): string {
    if (!this.taprootDerivedPublicKey) {
      throw new Error('Taproot Derived Public Key not set');
    }
    return this.taprootDerivedPublicKey;
  }

  getVaultRelatedAddress(paymentType: 'funding' | 'multisig'): string {
    const payment = this.getPayment();

    if (payment === undefined) {
      throw new Error('Payment Objects have not been set');
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
      if (!this.taprootDerivedPublicKey) {
        throw new Error('Taproot Derived Public Key not set');
      }
      const fundingPayment = p2tr(
        ecdsaPublicKeyToSchnorr(Buffer.from(this.taprootDerivedPublicKey, 'hex')),
        undefined,
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

      const feeRate = 200n;
      // customFeeRate ??
      // BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const addressBalance = await getBalance(fundingPayment, this.bitcoinBlockchainAPI);

      if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
        throw new Error('Insufficient Funds');
      }

      const fundingTransaction = await createFundingTransaction(
        this.bitcoinBlockchainAPI,
        this.bitcoinNetwork,
        bitcoinAmount,
        multisigPayment,
        fundingPayment,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcMintFeeBasisPoints.toBigInt()
      );

      return fundingTransaction;
    } catch (error: any) {
      throw new Error(`Error creating Funding PSBT: ${error}`);
    }
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
      const { fundingPayment, multisigPayment } = await this.createPayments(
        vault.uuid,
        attestorGroupPublicKey
      );

      const feeRate = 200n;
      // customFeeRate ??
      // BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const withdrawTransaction = await createWithdrawTransaction(
        this.bitcoinBlockchainAPI,
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

  async createDepositPSBT(
    depositAmount: bigint,
    vault: RawVault,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { fundingPayment, multisigPayment } = await this.createPayments(
      vault.uuid,
      attestorGroupPublicKey
    );

    const feeRate = 200n;
    // customFeeRate ??
    // BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

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

  async signPSBT(
    transaction: Transaction,
    transactionType: 'funding' | 'deposit' | 'withdraw'
  ): Promise<Transaction> {
    try {
      const walletId = this.walletID;
      if (!walletId) {
        throw new Error('Wallet ID not set');
      }
      const generateSignatureBody: GenerateSignatureBody = {
        kind: 'Psbt',
        psbt: bytesToHex(transaction.toPSBT()),
      };

      const generateSignatureInitResponse =
        await this.dfnsDelegatedAPIClient.wallets.generateSignatureInit({
          walletId,
          body: generateSignatureBody,
        });

      const webAuthenticator = new WebAuthnSigner();
      const assertion = await webAuthenticator.sign(generateSignatureInitResponse);

      const generateSignatureCompleteResponse =
        await this.dfnsDelegatedAPIClient.wallets.generateSignatureComplete(
          {
            walletId,
            body: generateSignatureBody,
          },
          {
            challengeIdentifier: generateSignatureInitResponse.challengeIdentifier,
            firstFactor: assertion,
          }
        );

      console.log('generateSignatureCompleteResponse', generateSignatureCompleteResponse);

      const signedPSBT = generateSignatureCompleteResponse.signedData;

      if (!signedPSBT) {
        throw new Error('No signed data returned');
      }

      // ==> Finalize Funding Transaction
      const signedTransaction = Transaction.fromPSBT(hexToBytes(signedPSBT.slice(2)!));

      switch (transactionType) {
        case 'funding':
          signedTransaction.finalize();
          break;
        case 'deposit':
          getInputIndicesByScript(
            this.getPayment().fundingPayment.script,
            signedTransaction
          ).forEach(index => {
            signedTransaction.finalizeIdx(index);
          });
          break;
        case 'withdraw':
          break;
        default:
          throw new Error('Invalid Transaction Type');
      }
      return signedTransaction;
    } catch (error: any) {
      throw new Error(`Error signing PSBT: ${error}`);
    }
  }
}
