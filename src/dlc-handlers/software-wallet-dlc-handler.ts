import { Transaction, p2tr, p2wpkh } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
  getFeeRate,
  getUnspendableKeyCommittedToUUID,
} from '../functions/bitcoin/bitcoin-functions.js';
import { getBalance } from '../functions/bitcoin/bitcoin-request-functions.js';
import { BitcoinCoreRpcConnection } from '../functions/bitcoin/bitcoincore-rpc-connection.js';
import {
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawTransaction,
} from '../functions/bitcoin/psbt-functions.js';
import { PaymentInformation } from '../models/bitcoin-models.js';
import { RawVault } from '../models/ethereum-models.js';

export class SoftwareWalletDLCHandler {
  private fundingDerivedPublicKey: string;
  private taprootDerivedPublicKey: string;
  private fundingPaymentType: 'wpkh' | 'tr';
  public payment: PaymentInformation | undefined;
  private bitcoinNetwork: Network;
  private bitcoincoreRpcConnection: BitcoinCoreRpcConnection;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    fundingDerivedPublicKey: string,
    taprootDerivedPublicKey: string,
    fundingPaymentType: 'wpkh' | 'tr',
    bitcoinNetwork: Network,
    // bitcoincoreRpcConnection: BitcoinCoreRpcConnection,
    bitcoinBlockchainFeeRecommendationAPI?: string
  ) {
    switch (bitcoinNetwork) {
      case bitcoin:
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/api/v1/fees/recommended';
        break;
      case testnet:
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://mempool.space/testnet/api/v1/fees/recommended';
        break;
      case regtest:
        this.bitcoinBlockchainFeeRecommendationAPI =
          'https://devnet.dlc.link/electrs/fee-estimates';
        // if (!bitcoinBlockchainFeeRecommendationAPI) {
        //   throw new Error('Regtest requires a Bitcoin Blockchain Fee Recommendation API');
        // }
        // this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
        break;
      default:
        throw new Error('Invalid Bitcoin Network');
    }
    this.fundingPaymentType = fundingPaymentType;
    this.bitcoinNetwork = bitcoinNetwork;
    this.fundingDerivedPublicKey = fundingDerivedPublicKey;
    this.taprootDerivedPublicKey = taprootDerivedPublicKey;
    this.bitcoincoreRpcConnection = BitcoinCoreRpcConnection.default();
  }

  public setBitcoinCoreRpcConnection(bitcoincoreRpcConnection: BitcoinCoreRpcConnection): void {
    this.bitcoincoreRpcConnection = bitcoincoreRpcConnection;
  }

  private setPayment(fundingPayment: P2Ret | P2TROut, multisigPayment: P2TROut): void {
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

  getTaprootDerivedPublicKey(): string {
    return this.taprootDerivedPublicKey;
  }

  getVaultRelatedAddress(paymentType: 'funding' | 'multisig'): string {
    const payment = this.getPayment();

    if (payment === undefined) {
      throw new Error('Payment Objects have not been set');
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

  static fromJSON(json: any): SoftwareWalletDLCHandler {
    // const btcConn = BitcoinCoreRpcConnection.fromJSON(json.bitcoincoreRpcConnection);
    // console.log('Bitcoin core connection from JSON: ' + btcConn);

    // const bitcoincoreRpcConnection = BitcoinCoreRpcConnection.fromJSON(
    //   json.bitcoincoreRpcConnection
    // );
    const jsonString = JSON.parse(json);

    console.log('fundingDerivedPublicKey: ' + jsonString.fundingDerivedPublicKey);

    return new SoftwareWalletDLCHandler(
      jsonString.fundingDerivedPublicKey,
      jsonString.taprootDerivedPublicKey,
      jsonString.fundingPaymentType,
      // json.bitcoinNetwork,
      // bitcoincoreRpcConnection,
      regtest, // todo: create network from JSON
      // new BitcoinCoreRpcConnection('electrs-btc2.dlc.link', 'devnet2', 'devnet2', 18443), // todo: create it from JSON
      jsonString.bitcoinBlockchainFeeRecommendationAPI
    );
  }

  private async createPayments(
    vaultUUID: string,
    attestorGroupPublicKey: string
  ): Promise<PaymentInformation> {
    try {
      console.log('vaultUUID: ' + vaultUUID);
      console.log('attestorGroupPublicKey: ' + attestorGroupPublicKey);
      console.log('fundingDerivedPublicKey: ' + this.fundingDerivedPublicKey);

      console;
      const fundingPayment =
        this.fundingPaymentType === 'wpkh'
          ? p2wpkh(Buffer.from(this.fundingDerivedPublicKey, 'hex'), this.bitcoinNetwork)
          : p2tr(
              ecdsaPublicKeyToSchnorr(Buffer.from(this.fundingDerivedPublicKey, 'hex')),
              undefined,
              this.bitcoinNetwork
            );

      console.log('fundingPayment for set payment: ' + JSON.stringify(fundingPayment));

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
        Buffer.from(this.taprootDerivedPublicKey, 'hex'),
        this.bitcoinNetwork
      );

      console.log('multisigPayment for set payment: ' + JSON.stringify(multisigPayment));

      this.setPayment(fundingPayment, multisigPayment);

      console.log('this SoftwareWalletDlcHandler payment: ' + JSON.stringify(this.payment));

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

      const fetchedFeeRate = await getFeeRate(
        this.bitcoinNetwork,
        this.bitcoincoreRpcConnection,
        this.bitcoinBlockchainFeeRecommendationAPI,
        feeRateMultiplier
      );
      console.log('INSIDE createFundingPSBT - fetchedFeeRate : ', fetchedFeeRate);
      const feeRate = customFeeRate ?? BigInt(fetchedFeeRate);

      console.log('INSIDE createFundingPSBT - feeRate as BigInt : ', feeRate);

      const addressBalance = await getBalance(
        this.fundingDerivedPublicKey,
        this.fundingPaymentType,
        this.bitcoincoreRpcConnection
      );
      console.log('INSIDE createFundingPSBT - addressBalance : ', addressBalance);

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
  ) {
    const { fundingPayment, multisigPayment } = await this.createPayments(
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

    return depositTransaction;
  }
}
