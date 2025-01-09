import { AbstractUtxoCoin } from '@bitgo/abstract-utxo';
import { createDescriptorWalletWithWalletPassphrase } from '@bitgo/abstract-utxo/dist/src/descriptor/createWallet/createDescriptorWallet.js';
import { DefaultIBTC } from '@bitgo/abstract-utxo/dist/src/descriptor/createWallet/createDescriptors.js';
import { BitGoAPI } from '@bitgo/sdk-api';
import { Btc, Tbtc } from '@bitgo/sdk-coin-btc';
import { CoinConstructor, EnvironmentName, Keychain, Wallet } from '@bitgo/sdk-core';
import { hexToBytes } from '@noble/hashes/utils';
import { Transaction, selectUTXO } from '@scure/btc-signer';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';
import { DUST_LIMIT } from 'src/constants/dlc-handler.constants.js';
import { createRangeFromLength } from 'src/utilities/index.js';

import {
  deriveUnhardenedPublicKey,
  getAddressAndScriptPublicKeyFromDescriptor,
  getFeeAmount,
  getFeeRecipientAddress,
  getUnspendableKeyCommittedToUUID,
  removeDustOutputs,
} from '../functions/bitcoin/bitcoin-functions.js';
import { fetchBitcoinTransaction } from '../functions/bitcoin/bitcoin-request-functions.js';
import { FundingPaymentType, TransactionType } from '../models/dlc-handler.models.js';
import {
  BitGoAPIClientNotSetError,
  BitGoDescriptorWalletIDNotSetError,
  BitGoEnterpriseIDNotSet,
  BitGoFundingWalletIDNotSetError,
  SignatureGenerationFailed,
  TaprootDerivedPublicKeyNotSet,
} from '../models/errors/dlc-handler.errors.models.js';
import { RawVault } from '../models/ethereum-models.js';
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
    console.log('get fundingWalletID');
    if (!this._fundingWalletID) {
      throw new BitGoFundingWalletIDNotSetError();
    }
    return this._fundingWalletID;
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
    vaultUUID: string,
    unspendableDerivedPublicKey: string, // TODO: Add unspendableDerivedPublicKey as a parameter to createDescriptorWalletWithWalletPassphrase
    attestorGroupPublicKey: string // TODO: Add attestorGroupPublicKey as a parameter to createDescriptorWalletWithWalletPassphrase
  ): Promise<Wallet> {
    const descriptorWalletLabel = `[iBTC]${vaultUUID}`;

    const result = await createDescriptorWalletWithWalletPassphrase(
      this.bitGoAPIClient,
      this.bitGoAPIClientConfig.coin.coin(this.bitGoAPIClient) as AbstractUtxoCoin,
      {
        enterprise: this.enterpriseID,
        label: descriptorWalletLabel,
        walletPassphrase: '0000000000000000000000000000000000000000000000000000000000000001', // TODO: Use a real Wallet Passphrase
        descriptorsFromKeys: DefaultIBTC,
      }
    );

    const descriptorWalletID = result._wallet.id;

    this.descriptorWalletID = descriptorWalletID;

    const descriptorWallet = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .get({ id: descriptorWalletID });

    await descriptorWallet.createAddress();

    // TODO: We might need to introduce timeout logic here to wait for the address to be created

    return descriptorWallet;
  }

  private getExtendedPublicKeys(keychains: Keychain[]): string[] {
    return keychains
      .map(keychain => {
        if (!keychain.pub) {
          throw new Error('Missing Keychain Public Key');
        }
        return keychain.pub;
      })
      .sort((a, b) => (a > b ? 1 : -1));
  }

  private getUnspendableDerivedPublicKey(vaultUUID: string): string {
    return deriveUnhardenedPublicKey(
      getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork),
      this.bitcoinNetwork
    ).toString('hex');
  }

  async createFundingPSBT(
    vault: RawVault,
    depositAmount: bigint,
    attestorGroupPublicKey: string // TODO: Use attestorGroupPublicKey
  ): Promise<Transaction> {
    try {
      const unspendableDerivedPublicKey = this.getUnspendableDerivedPublicKey(vault.uuid);

      let descriptorWallet = await this.getDescriptorWalletByUUID(vault.uuid);

      if (!descriptorWallet) {
        descriptorWallet = await this.createDescriptorWallet(
          vault.uuid,
          unspendableDerivedPublicKey,
          attestorGroupPublicKey
        );
      }

      console.log('descriptorWallet', descriptorWallet);

      const descriptorWalletKeychains = await this.bitGoAPIClient
        .coin(this.bitGoAPIClientConfig.coin.name)
        .keychains()
        .getKeysForSigning({ wallet: descriptorWallet });

      const concatonatedExtendedPublicKeys =
        this.getExtendedPublicKeys(descriptorWalletKeychains).join(',');

      this.taprootDerivedPublicKey = concatonatedExtendedPublicKeys;

      console.log('fundWalletID', this.fundingWalletID);

      const fundingWallet = await this.bitGoAPIClient
        .coin(this.bitGoAPIClientConfig.coin.name)
        .wallets()
        .get({ id: this.fundingWalletID });

      console.log('fundingWallet ', fundingWallet);

      const feeAddress = getFeeRecipientAddress(vault.btcFeeRecipient, this.bitcoinNetwork);
      const feeAmount = getFeeAmount(
        Number(depositAmount),
        Number(vault.btcMintFeeBasisPoints.toBigInt())
      );

      const psbtOutputs = [
        {
          address: descriptorWallet._wallet.receiveAddress.address,
          amount: depositAmount.toString(),
        },
        {
          address: feeAddress,
          amount: BigInt(feeAmount).toString(),
        },
      ];

      console.log('psbtOutputs', psbtOutputs);

      removeDustOutputs(psbtOutputs);

      console.log('before prebuildAndSignTransaction');

      const response = await fundingWallet.prebuildAndSignTransaction({
        recipients: psbtOutputs,
        txFormat: 'psbt',
      });

      console.log('response', response);

      const fundingTransactionHex = (response as any).txHex;

      const fundingTransaction = Transaction.fromPSBT(Buffer.from(fundingTransactionHex, 'hex'));

      fundingTransaction.finalize();

      return fundingTransaction;
    } catch (error: any) {
      throw new Error(`Error creating Funding PSBT: ${error}`);
    }
  }

  async createWithdrawPSBT(
    vault: RawVault,
    withdrawAmount: bigint,
    attestorGroupPublicKey: string, // TODO: Use attestorGroupPublicKey
    fundingTransactionID: string
  ): Promise<Transaction> {
    const unspendableDerivedPublicKey = this.getUnspendableDerivedPublicKey(vault.uuid);

    let descriptorWallet = await this.getDescriptorWalletByUUID(vault.uuid);

    if (!descriptorWallet) {
      descriptorWallet = await this.createDescriptorWallet(
        vault.uuid,
        unspendableDerivedPublicKey,
        attestorGroupPublicKey
      );
    }

    const descriptorWalletKeychains = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .keychains()
      .getKeysForSigning({ wallet: descriptorWallet });

    const concatonatedExtendedPublicKeys =
      this.getExtendedPublicKeys(descriptorWalletKeychains).join(',');

    this.taprootDerivedPublicKey = concatonatedExtendedPublicKeys;

    const fundingWallet = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .wallets()
      .get({ id: this.fundingWalletID });

    const fundingTransaction = await fetchBitcoinTransaction(
      fundingTransactionID,
      this.bitcoinBlockchainAPI
    );

    const fundingTransactionOutputIndex = fundingTransaction.vout.findIndex(
      output => output.scriptpubkey_address === descriptorWallet._wallet.receiveAddress.address
    );

    if (fundingTransactionOutputIndex === -1) {
      throw new Error('Could not find Funding Transaction Output Index');
    }

    const fundingTransactionOutputValue = BigInt(
      fundingTransaction.vout[fundingTransactionOutputIndex].value
    );

    if (fundingTransactionOutputValue < withdrawAmount) {
      throw new Error('Insufficient Funds');
    }

    const remainingAmount =
      BigInt(fundingTransaction.vout[fundingTransactionOutputIndex].value) - BigInt(withdrawAmount);

    const feeAddress = getFeeRecipientAddress(vault.btcFeeRecipient, this.bitcoinNetwork);
    const feeAmount = getFeeAmount(
      Number(withdrawAmount),
      Number(vault.btcMintFeeBasisPoints.toBigInt())
    );

    const outputs = [
      {
        address: feeAddress,
        amount: BigInt(feeAmount).toString(),
      },
    ];

    if (remainingAmount > 0) {
      outputs.push({
        address: descriptorWallet._wallet.receiveAddress.address,
        amount: remainingAmount.toString(),
      });
    }

    removeDustOutputs(outputs);

    const response = await fundingWallet.prebuildAndSignTransaction({
      recipients: outputs,
      changeAddress: fundingWallet._wallet.receiveAddress.address,
      txFormat: 'psbt',
    });

    console.log('response', response);

    const withdrawTransactionHex = (response as any).txHex;

    return Transaction.fromPSBT(Buffer.from(withdrawTransactionHex, 'hex'));
  }

  async createDepositPSBT(
    vault: RawVault,
    depositAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const feeRate = await this.getFeeRate(feeRateMultiplier, customFeeRate);

    const unspendableDerivedPublicKey = this.getUnspendableDerivedPublicKey(vault.uuid);

    let descriptorWallet = await this.getDescriptorWalletByUUID(vault.uuid);

    if (!descriptorWallet) {
      descriptorWallet = await this.createDescriptorWallet(
        vault.uuid,
        unspendableDerivedPublicKey,
        attestorGroupPublicKey
      );
    }

    const descriptorWalletKeychains = await this.bitGoAPIClient
      .coin(this.bitGoAPIClientConfig.coin.name)
      .keychains()
      .getKeysForSigning({ wallet: descriptorWallet });

    const concatonatedExtendedPublicKeys =
      this.getExtendedPublicKeys(descriptorWalletKeychains).join(',');

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

    const vaultTransaction = await fetchBitcoinTransaction(
      fundingTransactionID,
      this.bitcoinBlockchainAPI
    );

    const vaultTransactionOutputIndex = vaultTransaction.vout.findIndex(
      output => output.scriptpubkey_address === descriptorWallet._wallet.receiveAddress.address
    );

    if (vaultTransactionOutputIndex === -1) {
      throw new Error('Could not find Vault Transaction Output Index');
    }

    const vaultTransactionOutputValue = BigInt(
      vaultTransaction.vout[vaultTransactionOutputIndex].value
    );

    const additionalDepositOutputs = [
      {
        address: feeAddress,
        amount: BigInt(feeAmount).toString(),
      },
      {
        address: descriptorWallet._wallet.receiveAddress.address,
        amount: BigInt(depositAmount).toString(),
      },
    ];

    const response = await fundingWallet.prebuildTransaction({
      recipients: additionalDepositOutputs,
      txFormat: 'psbt',
    });

    const additionalDepositTransactionHex = (response as any).txHex;

    const additionalDepositTransaction = Transaction.fromPSBT(
      Buffer.from(additionalDepositTransactionHex, 'hex')
    );

    const { address: descriptorWalletAddress, scriptPublicKey } =
      getAddressAndScriptPublicKeyFromDescriptor(
        unspendableDerivedPublicKey,
        attestorGroupPublicKey,
        this.getExtendedPublicKeys(descriptorWalletKeychains),
        this.bitcoinNetwork
      );

    const vaultInput = {
      txid: hexToBytes(fundingTransactionID),
      index: vaultTransactionOutputIndex,
      witnessUtxo: {
        amount: BigInt(vaultTransactionOutputValue),
        script: scriptPublicKey,
      },
    };

    const depositInputs = [vaultInput];

    createRangeFromLength(additionalDepositTransaction.inputsLength).forEach(index => {
      const input = additionalDepositTransaction.getInput(index);

      const amount = input.witnessUtxo?.amount;

      if (!amount) {
        throw new Error('Could not get amount from input');
      }

      const script = input.witnessUtxo?.script;

      if (!script) {
        throw new Error('Could not get script from input');
      }

      depositInputs.push({
        txid: input.txid!,
        index: input.index!,
        witnessUtxo: {
          amount: BigInt(amount),
          script: Buffer.from(script),
        },
      });
    });

    const depositOutputs = [
      {
        address: feeAddress,
        amount: BigInt(feeAmount),
      },
      {
        address: descriptorWalletAddress,
        amount: BigInt(depositAmount) + BigInt(vaultTransactionOutputValue),
      },
    ];

    removeDustOutputs(depositOutputs);

    const depositSelected = selectUTXO(depositInputs, depositOutputs, 'all', {
      changeAddress: fundingWallet.receiveAddress(),
      feePerByte: feeRate,
      bip69: false,
      createTx: true,
      network: this.bitcoinNetwork,
      dust: DUST_LIMIT as unknown as number,
    });

    if (!depositSelected) {
      throw new Error(
        'Failed to select Inputs for the Deposit Transaction. Ensure sufficient funds are available.'
      );
    }

    const depositTransaction = depositSelected.tx;

    if (!depositTransaction) throw new Error('Could not create Deposit Transaction');

    depositTransaction.updateInput(0, {
      sequence: 0xfffffff0,
    });

    const additionalDepositTransactionInputs = createRangeFromLength(
      additionalDepositTransaction.inputsLength
    ).map(index => additionalDepositTransaction.getInput(index));

    createRangeFromLength(depositTransaction.inputsLength).forEach(index => {
      const inputScript = depositTransaction.getInput(index);

      if (
        additionalDepositTransactionInputs.some(
          additionalInput => additionalInput.txid === inputScript.txid
        )
      ) {
        depositTransaction.finalizeIdx(index);
      }
    });

    return depositTransaction;
  }

  getUserFundingPublicKey(): string {
    throw new TaprootDerivedPublicKeyNotSet();
  }

  //   async signPSBT(transaction: Transaction, transactionType: TransactionType): Promise<Transaction> {
  //     throw new SignatureGenerationFailed();
  //   }
}
