import { DfnsDelegatedApiClient } from '@dfns/sdk';
import { WebAuthnSigner } from '@dfns/sdk-browser';
import { GenerateSignatureBody, ListWalletsResponse } from '@dfns/sdk/generated/wallets/types.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Transaction, p2tr } from '@scure/btc-signer';
import { P2TROut } from '@scure/btc-signer/payment';
import { Network } from 'bitcoinjs-lib';

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

export class DFNSDLCHandler {
  private readonly dfnsDelegatedAPIClient: DfnsDelegatedApiClient;
  private readonly bitcoinNetwork: Network;
  private readonly bitcoinBlockchainAPI: string;
  private readonly bitcoinBlockchainFeeRecommendationAPI: string;
  private taprootDerivedPublicKey?: string;
  private dfnsWalletID?: string;
  public payment?: PaymentInformation;

  constructor(
    dfnsAppID: string,
    appBaseURL: string,
    dfnsAuthToken: string,
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI: string,
    bitcoinBlockchainFeeRecommendationAPI: string
  ) {
    this.dfnsDelegatedAPIClient = new DfnsDelegatedApiClient({
      baseUrl: appBaseURL,
      appId: dfnsAppID,
      authToken: dfnsAuthToken,
    });
    this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
    this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
    this.bitcoinNetwork = bitcoinNetwork;
  }

  private setPayment(fundingPayment: P2TROut, multisigPayment: P2TROut): void {
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

  async initializeWalletByID(dfnsWalletID: string): Promise<void> {
    try {
      const dfnsWallet = await this.dfnsDelegatedAPIClient.wallets.getWallet({
        walletId: dfnsWalletID,
      });
      this.setDFNSWalletID(dfnsWallet.id);
      this.setTaprootDerivedPublicKey(dfnsWallet.signingKey.publicKey);
    } catch (error: any) {
      throw new Error(`Error fetching wallet: ${error}`);
    }
  }

  setDFNSWalletID(dfnsWalletID: string): void {
    this.dfnsWalletID = dfnsWalletID;
  }

  getDFNSWalletID(): string {
    if (!this.dfnsWalletID) {
      throw new Error('DFNS Wallet ID not set');
    }
    return this.dfnsWalletID;
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

  getTaprootTweakedPublicKey(): string {
    if (!this.payment) {
      throw new Error('Payment Information not set');
    }
    return bytesToHex((this.payment.fundingPayment as P2TROut).tweakedPubkey);
  }

  getVaultRelatedAddress(paymentType: 'funding' | 'multisig'): string {
    const payment = this.getPayment();

    if (payment === undefined) {
      throw new Error('Payment Objects have not been set');
    }

    switch (paymentType) {
      case 'funding':
        if (!payment.fundingPayment.address) {
          throw new Error('Funding Payment Address is undefined');
        }
        return payment.fundingPayment.address;
      case 'multisig':
        if (!payment.multisigPayment.address) {
          throw new Error('Taproot Multisig Payment Address is undefined');
        }
        return payment.multisigPayment.address;
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
        Buffer.from(fundingPayment.tweakedPubkey),
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

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

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

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

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

  async signPSBT(
    transaction: Transaction,
    transactionType: 'funding' | 'deposit' | 'withdraw'
  ): Promise<Transaction> {
    try {
      const dfnsWalletID = this.getDFNSWalletID();

      const generateSignatureBody: GenerateSignatureBody = {
        kind: 'Psbt',
        psbt: bytesToHex(transaction.toPSBT()),
      };

      const generateSignatureRequest = {
        walletId: dfnsWalletID,
        body: generateSignatureBody,
      };

      const generateSignatureInitResponse =
        await this.dfnsDelegatedAPIClient.wallets.generateSignatureInit(generateSignatureRequest);

      const webAuthenticator = new WebAuthnSigner();
      const assertion = await webAuthenticator.sign(generateSignatureInitResponse);

      const generateSignatureCompleteResponse =
        await this.dfnsDelegatedAPIClient.wallets.generateSignatureComplete(
          generateSignatureRequest,
          {
            challengeIdentifier: generateSignatureInitResponse.challengeIdentifier,
            firstFactor: assertion,
          }
        );

      const signedPSBT = generateSignatureCompleteResponse.signedData;

      if (!signedPSBT) {
        throw new Error('No signed data returned');
      }

      const signedTransaction = Transaction.fromPSBT(hexToBytes(signedPSBT.slice(2)));

      const fundingPayment = this.getPayment().fundingPayment;

      this.finalizeTransaction(signedTransaction, transactionType, fundingPayment.script);

      return signedTransaction;
    } catch (error: any) {
      throw new Error(`Error signing PSBT: ${error}`);
    }
  }

  private finalizeTransaction(
    signedTransaction: Transaction,
    transactionType: 'funding' | 'deposit' | 'withdraw',
    fundingPaymentScript: Uint8Array
  ): Transaction {
    switch (transactionType) {
      case 'funding':
        // finalize all inputs in the funding transaction since we have
        // collected all required signatures at this point.
        signedTransaction.finalize();
        break;
      case 'deposit':
        // only finalize inputs that spend from the funding address,
        // multisig inputs will be finalized after attestor signatures are added.
        getInputIndicesByScript(fundingPaymentScript, signedTransaction).forEach(index =>
          signedTransaction.finalizeIdx(index)
        );
        break;
      case 'withdraw':
        // skip finalization since withdraw transaction requires additional
        // attestor signatures before it can be finalized.
        break;

      default:
        throw new Error(`Invalid Transaction Type: ${transactionType}`);
    }
    return signedTransaction;
  }
}
