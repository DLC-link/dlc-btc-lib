import { DfnsDelegatedApiClient } from '@dfns/sdk';
import { WebAuthnSigner } from '@dfns/sdk-browser';
import { GenerateSignatureBody, ListWalletsResponse } from '@dfns/sdk/generated/wallets/types.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';

import { PaymentInformation } from '../models/bitcoin-models.js';
import {
  AbstractDLCHandler,
  DLCHandlerError,
  FundingPaymentType,
  PaymentNotSetError,
  TransactionType,
} from './abstract-dlc-handler.js';

export class DFNSWalletIDNotSetError extends DLCHandlerError {
  constructor(
    message: string = 'DFNS Wallet ID not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'DFNSWalletIDNotSetError';
  }
}

export class TaprootDerivedPublicKeyNotSet extends DLCHandlerError {
  constructor(
    message: string = 'Taproot Derived Public Key not set. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'TaprootDerivedPublicKeyNotSet';
  }
}

export class SignatureGenerationFailed extends DLCHandlerError {
  constructor(
    message: string = 'Signature generation failed. Make sure to initialize the wallet before attempting to access it.'
  ) {
    super(message);
    this.name = 'SignatureGenerationFailed';
  }
}

export class DFNSDLCHandler extends AbstractDLCHandler {
  readonly _dlcHandlerType = 'dfns' as const;
  protected _payment?: PaymentInformation;
  private readonly dfnsDelegatedAPIClient: DfnsDelegatedApiClient;
  private _taprootDerivedPublicKey?: string;
  private _dfnsWalletID?: string;

  constructor(
    fundingPaymentType: FundingPaymentType = 'tr',
    bitcoinNetwork: Network,
    bitcoinBlockchainAPI: string,
    bitcoinBlockchainFeeRecommendationAPI: string,
    dfnsAppID: string,
    appBaseURL: string,
    dfnsAuthToken: string
  ) {
    super(
      fundingPaymentType,
      bitcoinNetwork,
      bitcoinBlockchainAPI,
      bitcoinBlockchainFeeRecommendationAPI
    );
    this.dfnsDelegatedAPIClient = new DfnsDelegatedApiClient({
      baseUrl: appBaseURL,
      appId: dfnsAppID,
      authToken: dfnsAuthToken,
    });
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
      this.dfnsWalletID = dfnsWallet.id;
      this.taprootDerivedPublicKey = dfnsWallet.signingKey.publicKey;
    } catch (error: any) {
      throw new Error(`Error fetching wallet: ${error}`);
    }
  }

  set dfnsWalletID(dfnsWalletID: string) {
    this._dfnsWalletID = dfnsWalletID;
  }

  get dfnsWalletID(): string {
    if (!this._dfnsWalletID) {
      throw new DFNSWalletIDNotSetError();
    }
    return this._dfnsWalletID;
  }

  set taprootDerivedPublicKey(taprootDerivedPublicKey: string) {
    this._taprootDerivedPublicKey = taprootDerivedPublicKey;
  }

  getUserTaprootPublicKey(tweaked: boolean = false): string {
    if (!tweaked) {
      if (!this._taprootDerivedPublicKey) {
        throw new TaprootDerivedPublicKeyNotSet();
      }
      return this.taprootDerivedPublicKey;
    }

    if (!this.payment) {
      throw new PaymentNotSetError();
    }

    return bytesToHex(this.payment.multisigPayment.tweakedPubkey);
  }

  getUserFundingPublicKey(): string {
    if (!this._taprootDerivedPublicKey) {
      throw new TaprootDerivedPublicKeyNotSet();
    }
    return this.taprootDerivedPublicKey;
  }

  async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
    const dfnsWalletID = this.dfnsWalletID;

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
      throw new SignatureGenerationFailed();
    }

    const signedTransaction = Transaction.fromPSBT(hexToBytes(signedPSBT.slice(2)));

    const fundingPayment = this.payment.fundingPayment;

    this.finalizeTransaction(signedTransaction, transactionType, fundingPayment);

    return signedTransaction;
  }
}
