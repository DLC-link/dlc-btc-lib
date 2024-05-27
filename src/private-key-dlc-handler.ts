/** @format */

import { Transaction, p2wpkh } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { BIP32Factory, BIP32Interface } from 'bip32';
import { Network } from 'bitcoinjs-lib';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks.js';
import * as ellipticCurveCryptography from 'tiny-secp256k1';
import {
  createTaprootMultisigPayment,
  getBalance,
  getDerivedPublicKey,
  getFeeRate,
  getUnspendableKeyCommittedToUUID,
} from './bitcoin-functions.js';
import { BitcoinNetworkName } from './models/bitcoin-models.js';
import { RawVault } from './models/ethereum-models.js';
import { createClosingTransaction, createFundingTransaction } from './psbt-functions.js';

interface BitcoinDerivationPath {
  nativeSegwitDerivationPathRoot: string;
  taprootDerivationPathRoot: string;
}

interface PaymentInformation {
  nativeSegwitPayment: P2Ret;
  nativeSegwitDerivedKeyPair: BIP32Interface;
  taprootMultisigPayment: P2TROut;
  taprootDerivedKeyPair: BIP32Interface;
}

export class PrivateKeyDLCHandler {
  private bip32: BIP32Interface;
  private bitcoinNetwork: Network;
  private bitcoinDerivationPath: BitcoinDerivationPath;
  private bitcoinBlockchainAPI: string;
  private bitcoinBlockchainFeeRecommendationAPI: string;

  constructor(
    bitcoinWalletPrivateKey: string,
    bitcoinNetworkName: BitcoinNetworkName,
    bitcoinBlockchainAPI?: string,
    bitcoinBlockchainFeeRecommendationAPI?: string
  ) {
    const bip32 = BIP32Factory(ellipticCurveCryptography);

    switch (bitcoinNetworkName) {
      case 'Mainnet':
        this.bip32 = bip32.fromBase58(bitcoinWalletPrivateKey, bitcoin);
        this.bitcoinNetwork = bitcoin;
        this.bitcoinBlockchainAPI = '';
        this.bitcoinBlockchainFeeRecommendationAPI = '';
        this.bitcoinDerivationPath = {
          nativeSegwitDerivationPathRoot: `m/84'/0'`,
          taprootDerivationPathRoot: `m/86'/0'`,
        };
        break;
      case 'Testnet':
        this.bip32 = bip32.fromBase58(bitcoinWalletPrivateKey, testnet);
        this.bitcoinNetwork = testnet;
        this.bitcoinBlockchainAPI = '';
        this.bitcoinBlockchainFeeRecommendationAPI = '';
        this.bitcoinDerivationPath = {
          nativeSegwitDerivationPathRoot: `m/84'/1'`,
          taprootDerivationPathRoot: `m/86'/1'`,
        };
        break;
      case 'Regtest':
        if (bitcoinBlockchainAPI === undefined || bitcoinBlockchainFeeRecommendationAPI === undefined) {
          throw new Error('Regtest requires a Bitcoin Blockchain API and a Bitcoin Blockchain Fee Recommendation API');
        }
        this.bip32 = bip32.fromBase58(bitcoinWalletPrivateKey, regtest);
        this.bitcoinNetwork = regtest;
        this.bitcoinBlockchainAPI = bitcoinBlockchainAPI;
        this.bitcoinBlockchainFeeRecommendationAPI = bitcoinBlockchainFeeRecommendationAPI;
        this.bitcoinDerivationPath = {
          nativeSegwitDerivationPathRoot: `m/84'/1'`,
          taprootDerivationPathRoot: `m/86'/1'`,
        };
        break;
      default:
        throw new Error('Invalid Bitcoin Network');
    }
  }

  handlePayment(vaultUUID: string, accountIndex: number, attestorGroupPublicKey: string): PaymentInformation {
    const { nativeSegwitDerivationPathRoot, taprootDerivationPathRoot } = this.bitcoinDerivationPath;

    const nativeSegwitDerivationPath = `${nativeSegwitDerivationPathRoot}/${accountIndex}`;
    const taprootDerivationPath = `${taprootDerivationPathRoot}/${accountIndex}`;

    const nativeSegwitDerivedKeyPair = this.bip32.derivePath(`${nativeSegwitDerivationPath}/0/0`);
    const taprootDerivedKeyPair = this.bip32.derivePath(`${taprootDerivationPath}/0/0`);

    if (nativeSegwitDerivedKeyPair.privateKey === undefined || taprootDerivedKeyPair.privateKey === undefined) {
      throw new Error('Could not get Private Key');
    }

    const unspendablePublicKey = getUnspendableKeyCommittedToUUID(vaultUUID, this.bitcoinNetwork);
    const unspendableDerivedPublicKey = getDerivedPublicKey(unspendablePublicKey, this.bitcoinNetwork);

    const attestorDerivedPublicKey = getDerivedPublicKey(attestorGroupPublicKey, this.bitcoinNetwork);

    const nativeSegwitPayment = p2wpkh(nativeSegwitDerivedKeyPair.publicKey, this.bitcoinNetwork);
    const taprootMultisigPayment = createTaprootMultisigPayment(
      unspendableDerivedPublicKey,
      attestorDerivedPublicKey,
      taprootDerivedKeyPair.publicKey,
      this.bitcoinNetwork
    );

    return {
      nativeSegwitPayment,
      nativeSegwitDerivedKeyPair,
      taprootMultisigPayment,
      taprootDerivedKeyPair,
    };
  }

  async createFundingPSBT(
    vault: RawVault,
    nativeSegwitPayment: P2Ret,
    taprootMultisigPayment: P2TROut,
    customFeeRate?: bigint,
    feeRateMultiplier?: number
  ): Promise<Transaction> {
    if (nativeSegwitPayment.address === undefined || taprootMultisigPayment.address === undefined) {
      throw new Error('Could not get Addresses from Payments');
    }

    const addressBalance = await getBalance(nativeSegwitPayment.address, this.bitcoinBlockchainAPI);

    if (BigInt(addressBalance) < vault.valueLocked.toBigInt()) {
      throw new Error('Insufficient Funds');
    }

    const feeRate =
      customFeeRate ?? BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

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

    return Transaction.fromPSBT(fundingPSBT);
  }

  async createClosingPSBT(
    vault: RawVault,
    nativeSegwitPayment: P2Ret,
    taprootMultisigPayment: P2TROut,
    fundingTransactionID: string,
    customFeeRate?: bigint,
    feeRateMultiplier?: number
  ): Promise<Transaction> {
    if (nativeSegwitPayment.address === undefined) {
      throw new Error('Could not get Addresses from Payments');
    }

    const feeRate =
      customFeeRate ?? BigInt(await getFeeRate(this.bitcoinBlockchainFeeRecommendationAPI, feeRateMultiplier));

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

    return Transaction.fromPSBT(closingPSBT);
  }

  signPSBT(psbt: Transaction, privateKey: Buffer, finalize: boolean = false): Transaction {
    psbt.sign(privateKey);
    if (finalize) psbt.finalize();
    return psbt;
  }
}
