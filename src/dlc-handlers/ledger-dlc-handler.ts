/** @format */
import { Transaction } from '@scure/btc-signer';
import { P2Ret, P2TROut, p2wpkh } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import { AppClient, DefaultWalletPolicy, WalletPolicy } from 'ledger-bitcoin';

import {
  createBitcoinInputSigningConfiguration,
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  getBalance,
  getFeeRate,
  getInputByPaymentTypeArray,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin-functions.js';
import {
  addNativeSegwitSignaturesToPSBT,
  addTaprootInputSignaturesToPSBT,
  createClosingTransaction,
  createFundingTransaction,
  getNativeSegwitInputsToSign,
  getTaprootInputsToSign,
  updateNativeSegwitInputs,
  updateTaprootInputs,
} from '../functions/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';
import { truncateAddress } from '../utilities/index.js';

interface LedgerPolicyInformation {
  nativeSegwitWalletPolicy: DefaultWalletPolicy;
  taprootMultisigWalletPolicy: WalletPolicy;
  taprootMultisigWalletPolicyHMac: Buffer;
}

export class LedgerDLCHandler {
  private ledgerApp: AppClient;
  private masterFingerprint: string;
  private walletAccountIndex: number;
  private policyInformation: LedgerPolicyInformation | undefined;
  private paymentInformation: PaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    ledgerApp: AppClient,
    masterFingerprint: string,
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
    this.ledgerApp = ledgerApp;
    this.masterFingerprint = masterFingerprint;
    this.walletAccountIndex = walletAccountIndex;
    this.bitcoinNetwork = bitcoinNetwork;
  }

  private setPolicyInformation(
    nativeSegwitWalletPolicy: DefaultWalletPolicy,
    taprootMultisigWalletPolicy: WalletPolicy,
    taprootMultisigWalletPolicyHMac: Buffer
  ): void {
    this.policyInformation = {
      nativeSegwitWalletPolicy,
      taprootMultisigWalletPolicy,
      taprootMultisigWalletPolicyHMac,
    };
  }
  private setPaymentInformation(
    nativeSegwitPayment: P2Ret,
    nativeSegwitDerivedPublicKey: Buffer,
    taprootMultisigPayment: P2TROut,
    taprootDerivedPublicKey: Buffer
  ): void {
    this.paymentInformation = {
      nativeSegwitPayment,
      nativeSegwitDerivedPublicKey,
      taprootMultisigPayment,
      taprootDerivedPublicKey,
    };
  }

  private getPolicyInformation(): LedgerPolicyInformation {
    if (!this.policyInformation) {
      throw new Error('Policy Information not set');
    }
    return this.policyInformation;
  }

  private getPaymentInformation(): PaymentInformation {
    if (!this.paymentInformation) {
      throw new Error('Payment Information not set');
    }
    return this.paymentInformation;
  }

  getVaultRelatedAddress(paymentType: 'p2wpkh' | 'p2tr'): string {
    const payment = this.getPaymentInformation();

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

  async createPayment(vaultUUID: string, attestorGroupPublicKey: string): Promise<void> {
    try {
      const networkIndex = this.bitcoinNetwork === bitcoin ? 0 : 1;

      const nativeSegwitExtendedPublicKey = await this.ledgerApp.getExtendedPubkey(
        `m/84'/${networkIndex}'/${this.walletAccountIndex}'`
      );

      const nativeSegwitKeyinfo = `[${this.masterFingerprint}/84'/${networkIndex}'/${this.walletAccountIndex}']${nativeSegwitExtendedPublicKey}`;

      const nativeSegwitWalletPolicy = new DefaultWalletPolicy('wpkh(@0/**)', nativeSegwitKeyinfo);

      const nativeSegwitAddress = await this.ledgerApp.getWalletAddress(
        nativeSegwitWalletPolicy,
        null,
        0,
        0,
        false
      );

      const nativeSegwitDerivedPublicKey = deriveUnhardenedPublicKey(
        nativeSegwitExtendedPublicKey,
        this.bitcoinNetwork
      );
      const nativeSegwitPayment = p2wpkh(nativeSegwitDerivedPublicKey, this.bitcoinNetwork);

      if (nativeSegwitPayment.address !== nativeSegwitAddress) {
        throw new Error(
          `[Ledger] Recreated Native Segwit Address does not match the Ledger Native Segwit Address`
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

      const taprootMultisigPayment = createTaprootMultisigPayment(
        unspendableDerivedPublicKey,
        attestorDerivedPublicKey,
        taprootDerivedPublicKey,
        this.bitcoinNetwork
      );

      if (taprootMultisigAddress !== taprootMultisigPayment.address) {
        throw new Error(`Recreated Multisig Address does not match the Ledger Multisig Address`);
      }

      this.setPolicyInformation(
        nativeSegwitWalletPolicy,
        taprootMultisigAccountPolicy,
        taprootMultisigPolicyHMac
      );
      this.setPaymentInformation(
        nativeSegwitPayment,
        nativeSegwitDerivedPublicKey,
        taprootMultisigPayment,
        taprootDerivedPublicKey
      );
    } catch (error: any) {
      throw new Error(`Error creating required wallet information: ${error}`);
    }
  }

  async createFundingPSBT(
    vault: RawVault,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Psbt> {
    try {
      const { nativeSegwitPayment, nativeSegwitDerivedPublicKey, taprootMultisigPayment } =
        this.getPaymentInformation();

      if (
        taprootMultisigPayment.address === undefined ||
        nativeSegwitPayment.address === undefined
      ) {
        throw new Error('Payment Address is undefined');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const addressBalance = await getBalance(
        nativeSegwitPayment.address,
        this.bitcoinBlockchainAPI
      );

      if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
        throw new Error('Insufficient Funds');
      }

      const fundingPSBT = await createFundingTransaction(
        vault.valueLocked.toBigInt(),
        this.bitcoinNetwork,
        taprootMultisigPayment.address,
        nativeSegwitPayment,
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

      const nativeSegwitInputsToSign = getNativeSegwitInputsToSign(inputByPaymentTypeArray);

      await updateNativeSegwitInputs(
        nativeSegwitInputsToSign,
        nativeSegwitDerivedPublicKey,
        this.masterFingerprint,
        formattedFundingPSBT,
        this.bitcoinBlockchainAPI
      );

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
      const { nativeSegwitPayment, taprootMultisigPayment, taprootDerivedPublicKey } =
        this.getPaymentInformation();

      if (nativeSegwitPayment.address === undefined) {
        throw new Error('Could not get Addresses from Payments');
      }

      const feeRate =
        customFeeRate ??
        BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

      const closingPSBT = createClosingTransaction(
        vault.valueLocked.toBigInt(),
        this.bitcoinNetwork,
        fundingTransactionID,
        taprootMultisigPayment,
        nativeSegwitPayment.address,
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
      const {
        nativeSegwitWalletPolicy,
        taprootMultisigWalletPolicy,
        taprootMultisigWalletPolicyHMac,
      } = this.getPolicyInformation();

      let signatures;
      let transaction: Transaction;

      switch (transactionType) {
        case 'funding':
          signatures = await this.ledgerApp.signPsbt(
            psbt.toBase64(),
            nativeSegwitWalletPolicy,
            null
          );
          addNativeSegwitSignaturesToPSBT(psbt, signatures);
          transaction = Transaction.fromPSBT(psbt.toBuffer());
          transaction.finalize();
          return transaction;
        case 'closing':
          signatures = await this.ledgerApp.signPsbt(
            psbt.toBase64(),
            taprootMultisigWalletPolicy,
            taprootMultisigWalletPolicyHMac
          );
          addTaprootInputSignaturesToPSBT(psbt, signatures);
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
