import { bytesToHex } from '@noble/hashes/utils';
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
  getFeeRate,
  getInputByPaymentTypeArray,
  getInputIndicesByScript,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import { getBalance } from '../functions/bitcoin/bitcoin-request-functions.js';
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
import { RawVault } from '../models/ethereum-models.js';
import { BitcoinCoreRpcConnection } from '../models/index.js';
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
  private walletAddressIndex: number;
  private fundingPaymentType: 'wpkh' | 'tr';
  private policyInformation: LedgerPolicyInformation | undefined;
  public payment: ExtendedPaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoinNetworkIndex: number;
  private bitcoincoreRpcConnection: BitcoinCoreRpcConnection;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    ledgerApp: AppClient,
    masterFingerprint: string,
    walletAccountIndex: number,
    walletAddressIndex: number,
    fundingPaymentType: 'wpkh' | 'tr',
    bitcoinNetwork: Network,
    bitcoincoreRpcConnection: BitcoinCoreRpcConnection,
    bitcoinBlockchainFeeRecommendationAPI?: string
  ) {
    switch (bitcoinNetwork) {
      case bitcoin:
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/api/v1/fees/recommended';
        this.bitcoinNetworkIndex = 0;
        break;
      case testnet:
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/testnet/api/v1/fees/recommended';
        this.bitcoinNetworkIndex = 1;
        break;
      case regtest:
        if (!bitcoinBlockchainFeeRecommendationAPI) {
          throw new Error(
            'Regtest requires a Bitcoin Blockchain API and a Bitcoin Blockchain Fee Recommendation API'
          );
        }
        this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
        this.bitcoinNetworkIndex = 1;
        break;
      default:
        throw new Error('Invalid Bitcoin Network');
    }
    this.ledgerApp = ledgerApp;
    this.masterFingerprint = masterFingerprint;
    this.walletAccountIndex = walletAccountIndex;
    this.walletAddressIndex = walletAddressIndex;
    this.fundingPaymentType = fundingPaymentType;
    this.bitcoinNetwork = bitcoinNetwork;
    this.bitcoincoreRpcConnection = bitcoincoreRpcConnection;
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

  getTaprootDerivedPublicKey(): string {
    return bytesToHex(this.getPayment().taprootDerivedPublicKey);
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
    bitcoinAmount: bigint,
    attestorGroupPublicKey: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Psbt> {
    try {
      const { fundingPayment, fundingDerivedPublicKey, multisigPayment } = await this.createPayment(
        vault.uuid,
        attestorGroupPublicKey
      );

      const feeRate =
        customFeeRate ??
        BigInt(
          await getFeeRate(
            this.bitcoinNetwork,
            this.bitcoincoreRpcConnection,
            this.bitcoinBlockchainFeeRecommendationAPI,
            feeRateMultiplier
          )
        );

      const addressBalance = await getBalance(
        bytesToHex(fundingDerivedPublicKey),
        this.fundingPaymentType,
        this.bitcoincoreRpcConnection
      );

      if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
        throw new Error('Insufficient Funds');
      }

      const fundingTransaction = await createFundingTransaction(
        this.bitcoincoreRpcConnection,
        this.bitcoinNetwork,
        bitcoinAmount,
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
          this.bitcoincoreRpcConnection
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

  async createWithdrawPSBT(
    vault: RawVault,
    withdrawAmount: bigint,
    attestorGroupPublicKey: string,
    fundingTransactionID: string,
    feeRateMultiplier?: number,
    customFeeRate?: bigint
  ): Promise<Psbt> {
    try {
      const { fundingPayment, taprootDerivedPublicKey, multisigPayment } = await this.createPayment(
        vault.uuid,
        attestorGroupPublicKey
      );

      const feeRate =
        customFeeRate ??
        BigInt(
          await getFeeRate(
            this.bitcoinNetwork,
            this.bitcoincoreRpcConnection,
            this.bitcoinBlockchainFeeRecommendationAPI,
            feeRateMultiplier
          )
        );

      const withdrawTransaction = await createWithdrawTransaction(
        this.bitcoincoreRpcConnection,
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

      return formattedWithdrawPSBT;
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
  ) {
    const { fundingPayment, taprootDerivedPublicKey, fundingDerivedPublicKey, multisigPayment } =
      await this.createPayment(vault.uuid, attestorGroupPublicKey);

    const feeRate =
      customFeeRate ??
      BigInt(
        await getFeeRate(
          this.bitcoinNetwork,
          this.bitcoincoreRpcConnection,
          this.bitcoinBlockchainFeeRecommendationAPI,
          feeRateMultiplier
        )
      );

    const depositTransaction = await createDepositTransaction(
      this.bitcoincoreRpcConnection,
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
        this.bitcoincoreRpcConnection
      );
    }

    return formattedDepositPSBT;
  }

  async signPSBT(
    psbt: Psbt,
    transactionType: 'funding' | 'deposit' | 'withdraw'
  ): Promise<Transaction> {
    let transaction: Transaction;

    const { fundingWalletPolicy, multisigWalletPolicy, multisigWalletPolicyHMac } =
      this.getPolicyInformation();

    switch (transactionType) {
      case 'funding':
        addFundingSignaturesBasedOnPaymentType(
          psbt,
          this.fundingPaymentType,
          await this.ledgerApp.signPsbt(psbt.toBase64(), fundingWalletPolicy, null)
        );
        transaction = Transaction.fromPSBT(psbt.toBuffer());
        transaction.finalize();
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

        transaction = Transaction.fromPSBT(psbt.toBuffer());

        getInputIndicesByScript(this.getPayment().fundingPayment.script, transaction).forEach(
          index => {
            transaction.finalizeIdx(index);
          }
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
        transaction = Transaction.fromPSBT(psbt.toBuffer());
        break;
      default:
        throw new Error('Invalid Transaction Type');
    }
    return transaction;
  }
}
