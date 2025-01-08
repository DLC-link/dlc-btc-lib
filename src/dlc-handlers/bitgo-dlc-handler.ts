import { AbstractUtxoCoin } from '@bitgo/abstract-utxo';
import { createDescriptorWalletWithWalletPassphrase } from '@bitgo/abstract-utxo/dist/src/descriptor/createWallet/createDescriptorWallet.js';
import { DefaultIBTC } from '@bitgo/abstract-utxo/dist/src/descriptor/createWallet/createDescriptors.js';
import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Wallet } from '@bitgo/sdk-core';
import { Transaction } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import {
  deriveUnhardenedPublicKey,
  getFeeAmount,
  getFeeRecipientAddress,
  getUnspendableKeyCommittedToUUID,
} from 'src/functions/bitcoin/bitcoin-functions.js';
import { RawVault } from 'src/models/ethereum-models.js';

import { FundingPaymentType, TransactionType } from '../models/dlc-handler.models.js';
import {
  BitGoAPIClientNotSetError,
  BitGoDescriptorWalletIDNotSetError,
  BitGoEnterpriseIDNotSet,
  BitGoFundingWalletIDNotSetError,
  PaymentNotSetError,
  SignatureGenerationFailed,
  TaprootDerivedPublicKeyNotSet,
} from '../models/errors/dlc-handler.errors.models.js';
import { AbstractDLCHandler } from './abstract-dlc-handler.js';

interface BitGoAPIClientConfig {
  env: EnvironmentName;
  coin: { name: string; coin: CoinConstructor };
}

function getBitGoAPIClientConfig(bitcoinNetwork: Network): BitGoAPIClientConfig {
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
  private bitGoAPIClientConfig: BitGoAPIClientConfig;
  private _fundingWalletID?: string;
  private _descriptorWalletID?: string;
  private _enterpriseID?: string;
  private _taprootDerivedPublicKey?: string;

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

  set bitGoAPIClient(bitGoAPIClient: BitGoAPI) {
    this._bitGoAPIClient = bitGoAPIClient;
  }

  get bitGoAPIClient(): BitGoAPI {
    if (!this._bitGoAPIClient) {
      throw new BitGoAPIClientNotSetError();
    }
    return this._bitGoAPIClient;
  }

  set fundingWalletID(fundingWalletID: string) {
    this._fundingWalletID = fundingWalletID;
  }

  get fundingWalletID(): string {
    if (!this._fundingWalletID) {
      throw new BitGoFundingWalletIDNotSetError();
    }
    return this.fundingWalletID;
  }

  set descriptorWalletID(descriptorWalletID: string) {
    this._descriptorWalletID = descriptorWalletID;
  }

  get descriptorWalletID(): string {
    if (!this._descriptorWalletID) {
      throw new BitGoDescriptorWalletIDNotSetError();
    }
    return this._descriptorWalletID;
  }

  set enterpriseID(enterpriseID: string) {
    this._enterpriseID = enterpriseID;
  }

  get enterpriseID(): string {
    if (!this._enterpriseID) {
      throw new BitGoEnterpriseIDNotSet();
    }
    return this._enterpriseID;
  }

  set taprootDerivedPublicKey(taprootDerivedPublicKey: string) {
    this._taprootDerivedPublicKey = taprootDerivedPublicKey;
  }

  getUserTaprootPublicKey(): string {
    if (!this._taprootDerivedPublicKey) {
      throw new TaprootDerivedPublicKeyNotSet();
    }
    return this._taprootDerivedPublicKey;
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

  async getWalletsWithAddresses(): Promise<Wallet[]> {
    const response = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .list();

    return response.wallets;
  }

  async initializeWalletByID(walletID: string): Promise<void> {
    const fundingWallet = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .get({ id: walletID });

    const descriptorWalletKeychains = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .keychains()
      .getKeysForSigning({ wallet: fundingWallet });

    console.log(descriptorWalletKeychains);

    this.fundingWalletID = fundingWallet.id();
    this.enterpriseID = fundingWallet._wallet.enterprise;
  }

  private async getDescriptorWalletByUUID(vaultUUID: string): Promise<Wallet | undefined> {
    const descriptorWalletLabel = `[iBTC]${vaultUUID}`;

    const wallets = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .list();

    return wallets.wallets.find(wallet => wallet.label() === descriptorWalletLabel);
  }

  private async createDescriptorWallet(
    vaultUUID: string
    // attestorGroupPublicKey: string // TODO: Add attestorGroupPublicKey as a parameter to createDescriptorWalletWithWalletPassphrase
  ): Promise<Wallet> {
    const descriptorWalletLabel = `[iBTC]${vaultUUID}`;

    // TODO: Add unspendableDerivedPublicKey as a parameter to createDescriptorWalletWithWalletPassphrase

    // const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
    // const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(
    //   unspendablePublicKey,
    //   this.bitcoinNetwork
    // );

    const result = await createDescriptorWalletWithWalletPassphrase(
      this.bitGoAPIClient,
      this.bitGoAPIClientConfig.coin.coin(this.bitGoAPIClient) as AbstractUtxoCoin,
      {
        enterprise: this.enterpriseID,
        label: descriptorWalletLabel,
        walletPassphrase: '0000000000000000000000000000000000000000000000000000000000000000', // TODO: Use a real Wallet Passphrase
        descriptorsFromKeys: DefaultIBTC,
      }
    );

    const descriptorWalletID = result._wallet.id;

    this.descriptorWalletID = descriptorWalletID;

    const descriptorWallet = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .get({ id: descriptorWalletID });

    return descriptorWallet;
  }

  async createFundingPSBT(
    vault: RawVault,
    depositAmount: bigint,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      let descriptorWallet = await this.getDescriptorWalletByUUID(vault.uuid);

      if (!descriptorWallet) {
        descriptorWallet = await this.createDescriptorWallet(vault.uuid);
      }

      const descriptorWalletKeychains = await this.bitGoAPIClient
        .coin(this.bitGoAPIClientConfig.coin.name)
        .keychains()
        .getKeysForSigning({ wallet: descriptorWallet });

      const concatonatedExtendedPublicKeys = descriptorWalletKeychains
        .map(keychain => {
          if (!keychain.pub) {
            throw new Error('Missing Keychain Public Key');
          }
          return keychain.pub;
        })
        .sort((a, b) => (a > b ? 1 : -1))
        .join(',');

      this.taprootDerivedPublicKey = concatonatedExtendedPublicKeys;

      const fundingWallet = await this.bitGoAPIClient
        .coin(this.bitGoAPIClientConfig.coin.name)
        .wallets()
        .get({ id: this.fundingWalletID });

      const feeAddress = getFeeRecipientAddress(vault.btcFeeRecipient, this.bitcoinNetwork);
      const feeAmount = getFeeAmount(
        Number(depositAmount),
        Number(vault.btcMintFeeBasisPoints.toBigInt())
      );

      fundingWallet.prebuildAndSignTransaction({
        recipients: [
          {
            address: descriptorWallet._wallet.receiveAddress.address,
            amount: depositAmount.toString(),
          },
        ],
      });

      return Transaction.fromPSBT(formattedFundingPSBT.toBuffer());
    } catch (error: any) {
      throw new Error(`Error creating Funding PSBT: ${error}`);
    }
  }

  getUserFundingPublicKey(): string {
    throw new TaprootDerivedPublicKeyNotSet();
  }

  async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
    throw new SignatureGenerationFailed();
  }
}
