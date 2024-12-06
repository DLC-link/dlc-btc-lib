import { Transaction } from '@scure/btc-signer';
import { p2tr, p2wpkh } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';
import { bitcoin } from 'bitcoinjs-lib/src/networks.js';
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
  addFundingSignaturesBasedOnPaymentType,
  addTaprooMultisigInputSignaturesToPSBT,
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawTransaction,
  getNativeSegwitInputsToSign,
  getTaprootInputsToSign,
  updateNativeSegwitInputs,
  updateTaprootInputs,
} from '../functions/bitcoin/psbt-functions.js';
import { ExtendedPaymentInformation } from '../models/bitcoin-models.js';
import { FundingPaymentType, TransactionType } from '../models/dlc-handler.models.js';
import {
  FundingDerivedPublicKeyNotSet,
  IncompatibleTransactionArgument,
  PolicyInformationNotSet,
  TaprootDerivedPublicKeyNotSet,
} from '../models/errors/dlc-handler.errors.models.js';
import { RawVault } from '../models/ethereum-models.js';
import { truncateAddress } from '../utilities/index.js';
import { AbstractDLCHandler } from './abstract-dlc-handler.js';

interface LedgerPolicyInformation {
  fundingWalletPolicy: DefaultWalletPolicy;
  multisigWalletPolicy: WalletPolicy;
  multisigWalletPolicyHMac: Buffer;
}

export class LedgerDLCHandler extends AbstractDLCHandler {
  readonly _dlcHandlerType = 'ledger' as const;
  private ledgerApp: AppClient;
  private masterFingerprint: string;
  private walletAccountIndex: number;
  private walletAddressIndex: number;
  private bitcoinNetworkIndex: number;
  private _policyInformation: LedgerPolicyInformation | undefined;
  private _fundingDerivedPublicKey?: string;
  private _taprootDerivedPublicKey?: string;

  constructor(
    ledgerApp: AppClient,
    masterFingerprint: string,
    walletAccountIndex: number,
    walletAddressIndex: number,
    fundingPaymentType: FundingPaymentType,
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
    this.bitcoinNetworkIndex = bitcoinNetwork === bitcoin ? 0 : 1;
    this.ledgerApp = ledgerApp;
    this.masterFingerprint = masterFingerprint;
    this.walletAccountIndex = walletAccountIndex;
    this.walletAddressIndex = walletAddressIndex;
    this.fundingPaymentType = fundingPaymentType;
  }

  set policyInformation(policyInformation: LedgerPolicyInformation) {
    this._policyInformation = policyInformation;
  }

  get policyInformation(): LedgerPolicyInformation {
    if (!this._policyInformation) {
      throw new PolicyInformationNotSet();
    }
    return this._policyInformation;
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

  set fundingDerivedPublicKey(fundingDerivedPublicKey: string) {
    this._fundingDerivedPublicKey = fundingDerivedPublicKey;
  }

  getUserFundingPublicKey(): string {
    if (!this._fundingDerivedPublicKey) {
      throw new FundingDerivedPublicKeyNotSet();
    }

    return this._fundingDerivedPublicKey;
  }

  private async createPayment(
    vaultUUID: string,
    attestorGroupPublicKey: string
  ): Promise<ExtendedPaymentInformation> {
    try {
      const fundingPaymentTypeDerivationPath = this.fundingPaymentType === 'wpkh' ? '84' : '86';

      const fundingExtendedPublicKey = await this.ledgerApp.getExtendedPubkey(
        `m/${fundingPaymentTypeDerivationPath}'/${this.bitcoinNetworkIndex}'/${this.walletAccountIndex}'`
      );

      const fundingKeyinfo = `[${this.masterFingerprint}/${fundingPaymentTypeDerivationPath}'/${this.bitcoinNetworkIndex}'/${this.walletAccountIndex}']${fundingExtendedPublicKey}`;

      const fundingWalletPolicy = new DefaultWalletPolicy(
        `${this.fundingPaymentType}(@0/**)`,
        fundingKeyinfo
      );

      const fundingAddress = await this.ledgerApp.getWalletAddress(
        fundingWalletPolicy,
        null,
        0,
        this.walletAddressIndex,
        false
      );

      const fundingDerivedPublicKey = deriveUnhardenedPublicKey(
        fundingExtendedPublicKey,
        this.bitcoinNetwork,
        this.walletAddressIndex
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
        `m/86'/${this.bitcoinNetworkIndex}'/${this.walletAccountIndex}'`
      );

      const ledgerTaprootKeyInfo = `[${this.masterFingerprint}/86'/${this.bitcoinNetworkIndex}'/${this.walletAccountIndex}']${taprootExtendedPublicKey}`;

      const taprootDerivedPublicKey = deriveUnhardenedPublicKey(
        taprootExtendedPublicKey,
        this.bitcoinNetwork
      );

      const descriptors =
        taprootDerivedPublicKey.toString('hex') < attestorDerivedPublicKey.toString('hex')
          ? [ledgerTaprootKeyInfo, attestorGroupPublicKey]
          : [attestorGroupPublicKey, ledgerTaprootKeyInfo];

      const multisigWalletPolicy = new WalletPolicy(
        `Taproot Multisig Wallet for Vault: ${truncateAddress(vaultUUID)}`,
        `tr(@0/**,and_v(v:pk(@1/**),pk(@2/**)))`,
        [unspendablePublicKey, ...descriptors]
      );

      const [, multisigWalletPolicyHMac] =
        await this.ledgerApp.registerWallet(multisigWalletPolicy);

      const taprootMultisigAddress = await this.ledgerApp.getWalletAddress(
        multisigWalletPolicy,
        multisigWalletPolicyHMac,
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

      this.policyInformation = {
        fundingWalletPolicy,
        multisigWalletPolicy,
        multisigWalletPolicyHMac,
      };
      this.payment = {
        fundingPayment,
        multisigPayment,
      };
      this.taprootDerivedPublicKey = taprootDerivedPublicKey.toString('hex');
      this.fundingDerivedPublicKey = fundingDerivedPublicKey.toString('hex');

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
    depositAmount: bigint,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    try {
      const { fundingPayment, fundingDerivedPublicKey, multisigPayment } = await this.createPayment(
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
        depositAmount,
        multisigPayment,
        fundingPayment,
        feeRate,
        vault.btcFeeRecipient,
        vault.btcMintFeeBasisPoints.toBigInt()
      );

      const signingConfiguration = createBitcoinInputSigningConfiguration(
        fundingTransaction,
        this.walletAccountIndex,
        this.walletAddressIndex,
        multisigPayment,
        this.bitcoinNetwork,
        this.bitcoinNetworkIndex
      );

      const formattedFundingPSBT = Psbt.fromBuffer(Buffer.from(fundingTransaction.toPSBT()), {
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

      return Transaction.fromPSBT(formattedFundingPSBT.toBuffer());
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
      const { fundingPayment, taprootDerivedPublicKey, multisigPayment } = await this.createPayment(
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

      const withdrawTransactionSigningConfiguration = createBitcoinInputSigningConfiguration(
        withdrawTransaction,
        this.walletAccountIndex,
        this.walletAddressIndex,
        multisigPayment,
        this.bitcoinNetwork,
        this.bitcoinNetworkIndex
      );

      const formattedWithdrawPSBT = Psbt.fromBuffer(Buffer.from(withdrawTransaction.toPSBT()), {
        network: this.bitcoinNetwork,
      });

      const withdrawInputByPaymentTypeArray = getInputByPaymentTypeArray(
        withdrawTransactionSigningConfiguration,
        formattedWithdrawPSBT.toBuffer(),
        this.bitcoinNetwork
      );

      const taprootInputsToSign = getTaprootInputsToSign(withdrawInputByPaymentTypeArray);

      await updateTaprootInputs(
        taprootInputsToSign,
        taprootDerivedPublicKey,
        this.masterFingerprint,
        formattedWithdrawPSBT
      );

      return Transaction.fromPSBT(formattedWithdrawPSBT.toBuffer());
    } catch (error: any) {
      throw new Error(`Error creating Withdraw PSBT: ${error}`);
    }
  }

  async createDepositPSBT(
    vault: RawVault,
    depositAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Transaction> {
    const { fundingPayment, taprootDerivedPublicKey, fundingDerivedPublicKey, multisigPayment } =
      await this.createPayment(vault.uuid, attestorGroupPublicKey);

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

    const depositTransactionSigningConfiguration = createBitcoinInputSigningConfiguration(
      depositTransaction,
      this.walletAccountIndex,
      this.walletAddressIndex,
      multisigPayment,
      this.bitcoinNetwork,
      this.bitcoinNetworkIndex
    );

    const formattedDepositPSBT = Psbt.fromBuffer(Buffer.from(depositTransaction.toPSBT()), {
      network: this.bitcoinNetwork,
    });

    const depositInputByPaymentTypeArray = getInputByPaymentTypeArray(
      depositTransactionSigningConfiguration,
      formattedDepositPSBT.toBuffer(),
      this.bitcoinNetwork
    );

    const taprootInputsToSign = getTaprootInputsToSign(depositInputByPaymentTypeArray);

    const taprootUserInputsToSign = taprootInputsToSign.filter(inputSigningConfig => {
      return !inputSigningConfig.isMultisigInput;
    });

    const taprootMultisigInputsToSign = taprootInputsToSign.filter(inputSigningConfig => {
      return inputSigningConfig.isMultisigInput;
    });

    await updateTaprootInputs(
      taprootMultisigInputsToSign,
      taprootDerivedPublicKey,
      this.masterFingerprint,
      formattedDepositPSBT
    );

    if (taprootUserInputsToSign.length !== 0) {
      await updateTaprootInputs(
        taprootUserInputsToSign,
        fundingDerivedPublicKey,
        this.masterFingerprint,
        formattedDepositPSBT
      );
    }

    const nativeSegwitInputsToSign = getNativeSegwitInputsToSign(depositInputByPaymentTypeArray);

    if (nativeSegwitInputsToSign.length !== 0) {
      await updateNativeSegwitInputs(
        nativeSegwitInputsToSign,
        fundingDerivedPublicKey,
        this.masterFingerprint,
        formattedDepositPSBT,
        this.bitcoinBlockchainAPI
      );
    }

    return Transaction.fromPSBT(formattedDepositPSBT.toBuffer());
  }

  async signPSBT<T extends Psbt | Transaction>(
    transaction: T,
    transactionType: TransactionType
  ): Promise<Transaction> {
    if (transaction instanceof Psbt) {
      throw new IncompatibleTransactionArgument();
    }

    const psbt = Psbt.fromBuffer(Buffer.from(transaction.toPSBT()));

    const { fundingWalletPolicy, multisigWalletPolicy, multisigWalletPolicyHMac } =
      this.policyInformation;

    switch (transactionType) {
      case 'funding':
        addFundingSignaturesBasedOnPaymentType(
          psbt,
          this.fundingPaymentType,
          await this.ledgerApp.signPsbt(psbt.toBase64(), fundingWalletPolicy, null)
        );
        break;
      case 'deposit':
        addTaprooMultisigInputSignaturesToPSBT(
          psbt,
          await this.ledgerApp.signPsbt(
            psbt.toBase64(),
            multisigWalletPolicy,
            multisigWalletPolicyHMac
          )
        );

        addFundingSignaturesBasedOnPaymentType(
          psbt,
          this.fundingPaymentType,
          await this.ledgerApp.signPsbt(psbt.toBase64(), fundingWalletPolicy, null)
        );
        break;
      case 'withdraw':
        addTaprooMultisigInputSignaturesToPSBT(
          psbt,
          await this.ledgerApp.signPsbt(
            psbt.toBase64(),
            multisigWalletPolicy,
            multisigWalletPolicyHMac
          )
        );
        break;
      default:
        throw new Error('Invalid Transaction Type');
    }

    const signedTransaction = Transaction.fromPSBT(psbt.toBuffer());

    this.finalizeTransaction(signedTransaction, transactionType, this.payment.fundingPayment);

    return signedTransaction;
  }
}
