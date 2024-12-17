import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';
import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import { any, isNil } from 'ramda';

import {
  createBitGoPayment,
  createBitGoTaprootMultisigPayment,
} from '../functions/bitcoin/bitcoin-functions.js';
import { FundingPaymentType, TransactionType } from '../models/dlc-handler.models.js';
import {
  BitGoAPIClientNotSetError,
  BitGoAddressIDNotSetError,
  BitGoWalletIDNotSetError,
  PaymentNotSetError,
  SignatureGenerationFailed,
  TaprootDerivedPublicKeyNotSet,
} from '../models/errors/dlc-handler.errors.models.js';
import { AbstractDLCHandler } from './abstract-dlc-handler.js';

interface BitGoAPIClientConfig {
  env: EnvironmentName;
  coin: { name: string; coin: CoinConstructor };
}

interface GetWalletWithAddressesResponse {
  wallet: Wallet;
  walletAddresses: any[];
}

function getBitGoAPIClientConfig(bitcoinNetwork: Network): BitGoAPIClientConfig {
  console.log('bitcoinNetwork', bitcoinNetwork);
  switch (bitcoinNetwork) {
    case bitcoin:
      return { env: 'test', coin: { name: 'btc', coin: Btc.createInstance } };
    case testnet:
      return { env: 'test', coin: { name: 'tbtc', coin: Tbtc.createInstance } };
    default:
      throw new Error('Invalid network');
  }
}

export class BitGoDLCHandler extends AbstractDLCHandler {
  readonly dlcHandlerType = 'bitgo' as const;
  private _bitGoAPIClient?: BitGoAPI;
  private _walletID?: string;
  private _addressID?: string;
  private bitGoAPIClientConfig: BitGoAPIClientConfig;
  private _extendedPublicKeys?: string[];

  constructor(
    fundingPaymentType: FundingPaymentType = 'tr',
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
    this.bitGoAPIClientConfig = getBitGoAPIClientConfig(bitcoinNetwork);
  }

  get bitGoAPIClient(): BitGoAPI {
    if (!this._bitGoAPIClient) {
      throw new BitGoAPIClientNotSetError();
    }
    return this._bitGoAPIClient;
  }

  set bitGoAPIClient(bitGoAPIClient: BitGoAPI) {
    this._bitGoAPIClient = bitGoAPIClient;
  }

  set walletID(walletID: string) {
    this._walletID = walletID;
  }

  get walletID(): string {
    if (!this._walletID) {
      throw new BitGoWalletIDNotSetError();
    }
    return this._walletID;
  }

  set addressID(addressID: string) {
    this._addressID = addressID;
  }

  get addressID(): string {
    if (!this._addressID) {
      throw new BitGoAddressIDNotSetError();
    }
    return this._addressID;
  }

  set extendedPublicKeys(extendedPublicKeys: string[]) {
    this._extendedPublicKeys = extendedPublicKeys;
  }

  get extendedPublicKeys(): string[] {
    if (!this._extendedPublicKeys) {
      throw new Error('Extended public keys are undefined');
    }

    return this._extendedPublicKeys;
  }

  async connect(username: string, password: string, otp: string): Promise<void> {
    const bitGoAPIClientWithoutAccessToken = new BitGoAPI({ env: this.bitGoAPIClientConfig.env });

    const authenticationResponse = await bitGoAPIClientWithoutAccessToken.authenticate({
      username,
      password,
      otp,
    });

    const accessToken = authenticationResponse.access_token;

    const bitGoAPIClient = new BitGoAPI({ env: this.bitGoAPIClientConfig.env, accessToken });

    bitGoAPIClient.register(
      this.bitGoAPIClientConfig.coin.name,
      this.bitGoAPIClientConfig.coin.coin
    );

    this.bitGoAPIClient = bitGoAPIClient;
  }

  async getWalletsWithAddresses(): Promise<GetWalletWithAddressesResponse[]> {
    const response = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .list();

    const wallets = response.wallets;

    const walletsWithAddresses = await Promise.all(
      wallets.map(async wallet => {
        const addresses = await wallet.addresses({ chains: [30] });
        return { wallet: wallet, walletAddresses: addresses.addresses };
      })
    );
    return walletsWithAddresses;
  }

  async initializeWalletByID(walletID: string, addressID: string): Promise<void> {
    const bitGoWallet = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .get({ id: walletID });

    const walletAddress = await bitGoWallet.getAddress({
      id: addressID,
    });

    console.log('walletAddress', walletAddress);

    const walletKeychains = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .keychains()
      .getKeysForSigning({ wallet: bitGoWallet });

    const extendedPublicKeys = walletKeychains.map(keychain => keychain.pub);

    if (any(extendedPublicKey => isNil(extendedPublicKey), extendedPublicKeys)) {
      throw new Error('Extended public keys are undefined');
    }

    createBitGoPayment(extendedPublicKeys as string[], this.bitcoinNetwork);

    createBitGoTaprootMultisigPayment(
      Buffer.from('02b733c776dd7776657c20a58f1f009567afc75db226965bce83d5d0afc29e46c9', 'hex'),
      'xpub6C1F2SwADP3TNajQjg2PaniEGpZLvWdMiFP8ChPjQBRWD1XUBeMdE4YkQYvnNhAYGoZKfcQbsRCefserB5DyJM7R9VR6ce6vLrXHVfeqyH3',
      extendedPublicKeys as string[],
      this.bitcoinNetwork
    );

    this.extendedPublicKeys = extendedPublicKeys as string[];
    this.walletID = bitGoWallet.id();
    this.addressID = walletAddress.id;
  }

  // protected async createPaymentInformation(
  //   vaultUUID: string,
  //   attestorGroupPublicKey: string
  // ): Promise<PaymentInformation> {
  //   let fundingPayment: P2Ret | P2TROut;

  //   if (this.fundingPaymentType === 'wpkh') {
  //     const fundingPublicKeyBuffer = Buffer.from(this.getUserFundingPublicKey(), 'hex');
  //     fundingPayment = createNativeSegwitPayment(fundingPublicKeyBuffer, this.bitcoinNetwork);
  //   } else {
  //     const fundingPublicKeyBuffer = Buffer.from(this.getUserFundingPublicKey(), 'hex');
  //     const fundingSchnorrPublicKeyBuffer = ecdsaPublicKeyToSchnorr(fundingPublicKeyBuffer);
  //     fundingPayment = createTaprootPayment(fundingSchnorrPublicKeyBuffer, this.bitcoinNetwork);
  //   }

  //   const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
  //   const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(
  //     unspendablePublicKey,
  //     this.bitcoinNetwork
  //   );

  //   const attestorDerivedPublicKey = deriveUnhardenedPublicKey(
  //     attestorGroupPublicKey,
  //     this.bitcoinNetwork
  //   );

  //   const taprootPublicKeyBuffer = Buffer.from(this.getUserTaprootPublicKey(), 'hex');

  //   const multisigPayment = createTaprootMultisigPayment(
  //     unspendableDerivedPublicKey,
  //     attestorDerivedPublicKey,
  //     taprootPublicKeyBuffer,
  //     this.bitcoinNetwork
  //   );

  //   const paymentInformation = { fundingPayment, multisigPayment };

  //   this.payment = paymentInformation;
  //   return paymentInformation;
  // }

  getUserTaprootPublicKey(tweaked: boolean = false): string {
    throw new PaymentNotSetError();
  }

  getUserFundingPublicKey(): string {
    throw new TaprootDerivedPublicKeyNotSet();
  }

  async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
    throw new SignatureGenerationFailed();
  }
}
