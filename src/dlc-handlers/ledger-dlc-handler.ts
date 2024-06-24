import { Transaction } from '@scure/btc-signer';
import { P2Ret, P2TROut, p2tr, p2wpkh } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';

import {
  createBitcoinInputSigningConfiguration,
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
  getBalance,
  getFeeRate,
  getInputByPaymentTypeArray,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import {
  addNativeSegwitSignaturesToPSBT,
  addTaprootInputSignaturesToPSBT,
  createClosingTransaction,
  createFundingTransaction,
  getNativeSegwitInputsToSign,
  getTaprootInputsToSign,
  updateNativeSegwitInputs,
  updateTaprootInputs,
} from '../functions/bitcoin/psbt-functions.js';
import { ExtendedPaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';
import { truncateAddress } from '../utilities/index.js';

interface LedgerPolicyInformation {
  fundingWalletPolicy: DefaultWalletPolicy;
  multisigWalletPolicy: WalletPolicy;
  multisigWalletPolicyHMac: Buffer;
}

export class LedgerDLCHandler {
  private ledgerApp: AppClient;
  private masterFingerprint: string;
  private walletAccountIndex: number;
  private fundingPaymentType: 'wpkh' | 'tr';
  private policyInformation: LedgerPolicyInformation | undefined;
  public payment: ExtendedPaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    ledgerApp: AppClient,
    masterFingerprint: string,
    walletAccountIndex: number,
    fundingPaymentType: 'wpkh' | 'tr',
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
    this.ledgerApp = ledgerApp;
    this.masterFingerprint = masterFingerprint;
    this.walletAccountIndex = walletAccountIndex;
    this.fundingPaymentType = fundingPaymentType;
    this.bitcoinNetwork = bitcoinNetwork;
  }

  private setPolicyInformation(
    fundingWalletPolicy: DefaultWalletPolicy,
    multisigWalletPolicy: WalletPolicy,
    multisigWalletPolicyHMac: Buffer
  ): void {
    this.policyInformation = {
      fundingWalletPolicy,
      multisigWalletPolicy,
      multisigWalletPolicyHMac,
    };
  }
  private setPayment(
    fundingPayment: P2Ret | P2TROut,
    fundingDerivedPublicKey: Buffer,
    multisigPayment: P2TROut,
    taprootDerivedPublicKey: Buffer
  ): void {
    this.payment = {
      fundingPayment,
      fundingDerivedPublicKey,
      multisigPayment,
      taprootDerivedPublicKey,
    };
  }

  private getPolicyInformation(): LedgerPolicyInformation {
    if (!this.policyInformation) {
      throw new Error('Policy Information not set');
    }
    return this.policyInformation;
  }

  private getPayment(): ExtendedPaymentInformation {
    if (!this.payment) {
      throw new Error('Payment Information not set');
    }
    return this.payment;
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

  private async createPayment(
    vaultUUID: string,
    attestorGroupPublicKey: string
  ): Promise<ExtendedPaymentInformation> {
    try {
      const fundingPaymentTypeDerivationPath = this.fundingPaymentType === 'wpkh' ? '84' : '86';
      const networkIndex = this.bitcoinNetwork === bitcoin ? 0 : 1;

      const fundingExtendedPublicKey = await this.ledgerApp.getExtendedPubkey(
        `m/${fundingPaymentTypeDerivationPath}'/${networkIndex}'/${this.walletAccountIndex}'`
      );

      const fundingKeyinfo = `[${this.masterFingerprint}/${fundingPaymentTypeDerivationPath}'/${networkIndex}'/${this.walletAccountIndex}']${fundingExtendedPublicKey}`;

      const fundingWalletPolicy = new DefaultWalletPolicy(
        `${this.fundingPaymentType}(@0/**)`,
        fundingKeyinfo
      );

      const fundingAddress = await this.ledgerApp.getWalletAddress(
        fundingWalletPolicy,
        null,
        0,
        0,
        false
      );

      const fundingDerivedPublicKey = deriveUnhardenedPublicKey(
        fundingExtendedPublicKey,
        this.bitcoinNetwork
      );

      const fundingPayment =
        this.fundingPaymentType === 'wpkh'
          ? p2wpkh(fundingDerivedPublicKey, this.bitcoinNetwork)
          : p2tr(ecdsaPublicKeyToSchnorr(fundingDerivedPublicKey), undefined, this.bitcoinNetwork);

      if (fundingPayment.address !== fundingAddress) {
        throw new Error(
          `[Ledger] Recreated Funding Address does not match the Ledger Funding Address`
        );
      }

      const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
      const unspendableDerivedPublicKey = deriveUnhardenedPublicKey(
        unspendablePublicKey,
        this.bitcoinNetwork
      );

      const attestorDerivedPublicKey = deriveUnhardenedPublicKey(
        attestorGroupPublicKey,
        this.bitcoinNetwork
      );

      const taprootExtendedPublicKey = await this.ledgerApp.getExtendedPubkey(
        `m/86'/${networkIndex}'/${this.walletAccountIndex}'`
      );

      const ledgerTaprootKeyInfo = `[${this.masterFingerprint}/86'/${networkIndex}'/${this.walletAccountIndex}']${taprootExtendedPublicKey}`;

      const taprootDerivedPublicKey = deriveUnhardenedPublicKey(
        taprootExtendedPublicKey,
        this.bitcoinNetwork
      );

      const descriptors =
        taprootDerivedPublicKey.toString('hex') < attestorDerivedPublicKey.toString('hex')
          ? [ledgerTaprootKeyInfo, attestorGroupPublicKey]
          : [attestorGroupPublicKey, ledgerTaprootKeyInfo];

      const taprootMultisigAccountPolicy = new WalletPolicy(
        `Taproot Multisig Wallet for Vault: ${truncateAddress(vaultUUID)}`,
        `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`,
        [unspendablePublicKey, ...descriptors]
      );

      const [, taprootMultisigPolicyHMac] = await this.ledgerApp.registerWallet(
        taprootMultisigAccountPolicy
      );

      const taprootMultisigAddress = await this.ledgerApp.getWalletAddress(
        taprootMultisigAccountPolicy,
        taprootMultisigPolicyHMac,
        0,
        0,
        false
      );

      const multisigPayment = createTaprootMultisigPayment(
        unspendableDerivedPublicKey,
        attestorDerivedPublicKey,
        taprootDerivedPublicKey,
        this.bitcoinNetwork
      );

      if (taprootMultisigAddress !== multisigPayment.address) {
        throw new Error(`Recreated Multisig Address does not match the Ledger Multisig Address`);
      }

      this.setPolicyInformation(
        fundingWalletPolicy,
        taprootMultisigAccountPolicy,
        taprootMultisigPolicyHMac
      );
      this.setPayment(
        fundingPayment,
        fundingDerivedPublicKey,
        multisigPayment,
        taprootDerivedPublicKey
      );

      return {
        fundingPayment,
        fundingDerivedPublicKey,
        multisigPayment,
        taprootDerivedPublicKey,
      };
    } catch (error: any) {
      throw new Error(`Error creating required wallet information: ${error}`);
    }
  }

  async createFundingPSBT(
    vault: RawVault,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Psbt> {
    try {
      const { fundingPayment, fundingDerivedPublicKey, multisigPayment } = await this.createPayment(
        vault.uuid,
        attestorGroupPublicKey
      );

      if (multisigPayment.address === undefined || fundingPayment.address === undefined) {
        throw new Error('Payment Address is undefined');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const addressBalance = await getBalance(fundingPayment.address, this.bitcoinBlockchainAPI);

      if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
        throw new Error('Insufficient Funds');
      }

      const fundingPSBT = await createFundingTransaction(
        vault.valueLocked.toBigInt(),
        this.bitcoinNetwork,
        multisigPayment.address,
        fundingPayment,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcMintFeeBasisPoints.toBigInt(),
        this.bitcoinBlockchainAPI
      );

      const signingConfiguration = createBitcoinInputSigningConfiguration(
        fundingPSBT,
        this.walletAccountIndex,
        this.bitcoinNetwork
      );

      const formattedFundingPSBT = Psbt.fromBuffer(Buffer.from(fundingPSBT), {
        network: this.bitcoinNetwork,
      });

      const inputByPaymentTypeArray = getInputByPaymentTypeArray(
        signingConfiguration,
        formattedFundingPSBT.toBuffer(),
        this.bitcoinNetwork
      );

      if (this.fundingPaymentType === 'wpkh') {
        const nativeSegwitInputsToSign = getNativeSegwitInputsToSign(inputByPaymentTypeArray);

        await updateNativeSegwitInputs(
          nativeSegwitInputsToSign,
          fundingDerivedPublicKey,
          this.masterFingerprint,
          formattedFundingPSBT,
          this.bitcoinBlockchainAPI
        );
      } else {
        const taprootInputsToSign = getTaprootInputsToSign(inputByPaymentTypeArray);

        await updateTaprootInputs(
          taprootInputsToSign,
          fundingDerivedPublicKey,
          this.masterFingerprint,
          formattedFundingPSBT
        );
      }

      return formattedFundingPSBT;
    } catch (error: any) {
      throw new Error(`Error creating Funding PSBT: ${error}`);
    }
  }

  async createClosingPSBT(
    vault: RawVault,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Psbt> {
    try {
      const { fundingPayment, multisigPayment, taprootDerivedPublicKey } = this.getPayment();

      if (fundingPayment.address === undefined) {
        throw new Error('Could not get Addresses from Payments');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const closingPSBT = createClosingTransaction(
        vault.valueLocked.toBigInt(),
        this.bitcoinNetwork,
        fundingTransactionID,
        multisigPayment,
        fundingPayment.address,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcRedeemFeeBasisPoints.toBigInt()
      );

      const closingTransactionSigningConfiguration = createBitcoinInputSigningConfiguration(
        closingPSBT,
        this.walletAccountIndex,
        this.bitcoinNetwork
      );

      const formattedClosingPSBT = Psbt.fromBuffer(Buffer.from(closingPSBT), {
        network: this.bitcoinNetwork,
      });

      const closingInputByPaymentTypeArray = getInputByPaymentTypeArray(
        closingTransactionSigningConfiguration,
        formattedClosingPSBT.toBuffer(),
        this.bitcoinNetwork
      );

      const taprootInputsToSign = getTaprootInputsToSign(closingInputByPaymentTypeArray);

      await updateTaprootInputs(
        taprootInputsToSign,
        taprootDerivedPublicKey,
        this.masterFingerprint,
        formattedClosingPSBT
      );

      return formattedClosingPSBT;
    } catch (error: any) {
      throw new Error(`Error creating Closing PSBT: ${error}`);
    }
  }

  async signPSBT(psbt: Psbt, transactionType: 'funding' | 'closing'): Promise<Transaction> {
    try {
      const { fundingWalletPolicy, multisigWalletPolicy, multisigWalletPolicyHMac } =
        this.getPolicyInformation();

      let signatures;
      let transaction: Transaction;

      switch (transactionType) {
        case 'funding':
          signatures = await this.ledgerApp.signPsbt(psbt.toBase64(), fundingWalletPolicy, null);
          switch (this.fundingPaymentType) {
            case 'wpkh':
              addNativeSegwitSignaturesToPSBT(psbt, signatures);
              break;
            case 'tr':
              addTaprootInputSignaturesToPSBT('funding', psbt, signatures);
              break;
            default:
              throw new Error('Invalid Funding Payment Type');
          }
          transaction = Transaction.fromPSBT(psbt.toBuffer());
          transaction.finalize();
          return transaction;
        case 'closing':
          signatures = await this.ledgerApp.signPsbt(
            psbt.toBase64(),
            multisigWalletPolicy,
            multisigWalletPolicyHMac
          );
          addTaprootInputSignaturesToPSBT('closing', psbt, signatures);
          transaction = Transaction.fromPSBT(psbt.toBuffer());
          return transaction;
        default:
          throw new Error('Invalid Transaction Type');
      }
    } catch (error: any) {
      throw new Error(`Error signing PSBT: ${error}`);
    }
  }
}
