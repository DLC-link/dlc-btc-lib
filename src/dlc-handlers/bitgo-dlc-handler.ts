import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';
import { bytesToHex } from '@noble/hashes/utils';
import { Transaction, p2tr, p2tr_ms, p2tr_ns } from '@scure/btc-signer';
import { Network, address } from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import { any } from 'ramda';

import {
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
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

    const walletKeychains = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .keychains()
      .getKeysForSigning({ wallet: bitGoWallet });

    const extendedPublicKeys = walletKeychains.map(keychain => keychain.pub);

    if (any(extendedPublicKey => extendedPublicKey === undefined, extendedPublicKeys)) {
      throw new Error('Extended public keys are undefined');
    }

    const derivedPublicKeys = extendedPublicKeys.map(extendedPublicKey =>
      ecdsaPublicKeyToSchnorr(deriveUnhardenedPublicKey(extendedPublicKey!, bitcoin))
    );

    const bitGoMultiSig = p2tr_ms(2, derivedPublicKeys);
    const attestorMultisig = p2tr_ns(derivedPublicKeys);

    console.log('bitGoMultiSig', bitGoMultiSig.script);

    this.walletID = bitGoWallet.id();
    this.addressID = walletAddress.id;
  }

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
