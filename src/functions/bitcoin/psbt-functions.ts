import { hexToBytes } from '@noble/hashes/utils';
import { p2wpkh, selectUTXO } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';
import { PartialSignature } from 'ledger-bitcoin/build/main/lib/appClient.js';

import { BitcoinInputSigningConfig, PaymentTypes } from '../../models/bitcoin-models.js';
import { reverseBytes } from '../../utilities/index.js';
import {
  ecdsaPublicKeyToSchnorr,
  getFeeRecipientAddressFromPublicKey,
  getUTXOs,
} from '../bitcoin/bitcoin-functions.js';

/**
 * Creates a Funding Transaction to fund the Multisig Transaction.
 *
 * @param bitcoinAmount - The amount of Bitcoin to fund the Transaction with.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param multisigAddress - The Multisig Address.
 * @param bitcoinNativeSegwitTransaction - The user's Native Segwit Payment Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Funding Transaction.
 */
export async function createFundingTransaction(
  bitcoinAmount: bigint,
  bitcoinNetwork: Network,
  multisigAddress: string,
  bitcoinNativeSegwitTransaction: P2Ret,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: bigint,
  bitcoinBlockchainAPIURL: string
): Promise<Uint8Array> {
  const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
  const feeRecipientOutputValue = bitcoinAmount / feeBasisPoints;

  const userUTXOs = await getUTXOs(bitcoinNativeSegwitTransaction, bitcoinBlockchainAPIURL);

  const psbtOutputs = [
    { address: multisigAddress, amount: bitcoinAmount },
    {
      address: feeAddress,
      amount: feeRecipientOutputValue,
    },
  ];

  const selected = selectUTXO(userUTXOs, psbtOutputs, 'default', {
    changeAddress: bitcoinNativeSegwitTransaction.address!,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
  });

  const fundingTX = selected?.tx;

  if (!fundingTX) throw new Error('Could not create Funding Transaction');

  const fundingPSBT = fundingTX.toPSBT();

  return fundingPSBT;
}

/**
 * Creates the Closing Transaction.
 * Uses the Funding Transaction's ID to create the Closing Transaction.
 * The Closing Transaction is sent to the User's Native Segwit Address.
 *
 * @param bitcoinAmount - The Amount of Bitcoin to fund the Transaction with.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param fundingTransactionID - The ID of the Funding Transaction.
 * @param multisigTransaction - The Multisig Transaction.
 * @param userNativeSegwitAddress - The User's Native Segwit Address.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Closing Transaction.
 */
export function createClosingTransaction(
  bitcoinAmount: bigint,
  bitcoinNetwork: Network,
  fundingTransactionID: string,
  multisigTransaction: P2TROut,
  userNativeSegwitAddress: string,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: bigint
): Uint8Array {
  const feePublicKeyBuffer = Buffer.from(feePublicKey, 'hex');
  const { address: feeAddress } = p2wpkh(feePublicKeyBuffer, bitcoinNetwork);

  if (!feeAddress) throw new Error('Could not create Fee Address');

  const inputs = [
    {
      txid: hexToBytes(fundingTransactionID),
      index: 0,
      witnessUtxo: {
        amount: bitcoinAmount,
        script: multisigTransaction.script,
      },
      ...multisigTransaction,
    },
  ];

  const outputs = [
    {
      address: feeAddress,
      amount: bitcoinAmount / feeBasisPoints,
    },
  ];

  const selected = selectUTXO(inputs, outputs, 'default', {
    changeAddress: userNativeSegwitAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
  });

  if (!selected?.tx) throw new Error('Could not create Closing Transaction');

  const closingPSBT = selected.tx.toPSBT();

  return closingPSBT;
}

/**
 * This function updates the PSBT with the necessary information to sign the inputs
 * that correspond to the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @param nativeSegwitPublicKey - The public key corresponding to the native segwit inputs.
 * @param masterFingerprint - The master fingerprint of the wallet.
 * @param psbt - The PSBT to update.
 * @returns The updated PSBT.
 * @throws An error if there is an issue adding the UTXO Ledger props or the BIP32 derivation.
 */
export async function updateNativeSegwitInputs(
  inputsToUpdate: BitcoinInputSigningConfig[] = [],
  nativeSegwitPublicKey: Buffer,
  masterFingerprint: string,
  psbt: Psbt,
  bitcoinBlockchainAPIURL: string
): Promise<Psbt> {
  try {
    await addNativeSegwitUTXOLedgerProps(psbt, inputsToUpdate, bitcoinBlockchainAPIURL);
  } catch (e) {
    // Intentionally Ignored
  }

  await addNativeSegwitBip32Derivation(
    psbt,
    masterFingerprint,
    nativeSegwitPublicKey,
    inputsToUpdate
  );

  return psbt;
}

/**
 * This function returns the Native Segwit Inputs to sign from the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @returns An array of BitcoinInputSigningConfig objects.
 */
export function getNativeSegwitInputsToSign(
  inputByPaymentType: [BitcoinInputSigningConfig, PaymentTypes][]
): BitcoinInputSigningConfig[] {
  return (
    inputByPaymentType
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, paymentType]) => paymentType === 'p2wpkh')
      .map(([index]) => index)
  );
}

/**
 * This function updates the PSBT with the necessary information to sign the inputs
 * that correspond to the given input signing configuration.
 * @param inputsToUpdate - An array of BitcoinInputSigningConfig objects.
 * @param taprootPublicKey - The public key corresponding to the taproot inputs.
 * @param masterFingerprint - The master fingerprint of the wallet.
 * @param psbt - The PSBT to update.
 * @returns The updated PSBT.
 */
export async function updateTaprootInputs(
  inputsToUpdate: BitcoinInputSigningConfig[] = [],
  taprootPublicKey: Buffer,
  masterFingerprint: string,
  psbt: Psbt
): Promise<Psbt> {
  inputsToUpdate.forEach(({ index, derivationPath }) => {
    psbt.updateInput(index, {
      tapBip32Derivation: [
        {
          masterFingerprint: Buffer.from(masterFingerprint, 'hex'),
          pubkey: ecdsaPublicKeyToSchnorr(taprootPublicKey),
          path: derivationPath,
          leafHashes: [],
        },
      ],
    });
  });

  return psbt;
}

/**
 * This function returns the Taproot Inputs to sign from the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @returns An array of BitcoinInputSigningConfig objects.
 */
export function getTaprootInputsToSign(
  inputByPaymentType: [BitcoinInputSigningConfig, PaymentTypes][]
): BitcoinInputSigningConfig[] {
  return (
    inputByPaymentType
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, paymentType]) => paymentType === 'p2tr')
      .map(([index]) => index)
  );
}

/**
 * This function updates the PSBT with the transaction hexes of the inputs that correspond to the given input signing configuration.
 * @param inputsToUpdate - An array of BitcoinInputSigningConfig objects.
 * @param psbt - The PSBT to update.
 * @returns The updated PSBT.
 */
async function addNativeSegwitUTXOLedgerProps(
  psbt: Psbt,
  inputSigningConfiguration: BitcoinInputSigningConfig[],
  bitcoinBlockchainAPIURL: string
): Promise<Psbt> {
  const inputTransactionHexes = await Promise.all(
    psbt.txInputs.map(async input =>
      (
        await fetch(`${bitcoinBlockchainAPIURL}/tx/${reverseBytes(input.hash).toString('hex')}/hex`)
      ).text()
    )
  );

  inputSigningConfiguration.forEach(({ index }) => {
    psbt.updateInput(index, {
      nonWitnessUtxo: Buffer.from(inputTransactionHexes[index], 'hex'),
    });
  });

  return psbt;
}

/**
 * This function updates the PSBT inputs with the BIP32 derivation information.
 * @param psbt - The PSBT to update.
 * @param masterFingerPrint - The Master Fingerprint of the Wallet.
 * @param nativeSegwitPublicKey - The Public Key corresponding to the Native Segwit Inputs.
 * @param inputSigningConfiguration - An array of BitcoinInputSigningConfig objects.
 * @returns The updated PSBT.
 */
async function addNativeSegwitBip32Derivation(
  psbt: Psbt,
  masterFingerPrint: string,
  nativeSegwitPublicKey: Buffer,
  inputSigningConfiguration: BitcoinInputSigningConfig[]
): Promise<Psbt> {
  inputSigningConfiguration.forEach(({ index, derivationPath }) => {
    psbt.updateInput(index, {
      bip32Derivation: [
        {
          masterFingerprint: Buffer.from(masterFingerPrint, 'hex'),
          pubkey: nativeSegwitPublicKey,
          path: derivationPath,
        },
      ],
    });
  });

  return psbt;
}

/**
 * This function updates the PSBT with the received Native Segwit Signatures.
 * @param psbt - The PSBT to update.
 * @param signatures - An array of tuples containing the index of the input and the PartialSignature.
 * @returns The updated PSBT.
 */
export function addNativeSegwitSignaturesToPSBT(
  psbt: Psbt,
  signatures: [number, PartialSignature][]
): void {
  signatures.forEach(([index, signature]) => psbt.updateInput(index, { partialSig: [signature] }));
}

/**
 * This function updates the PSBT with the received Taproot Signatures.
 * @param psbt - The PSBT to update.
 * @param signatures - An array of tuples containing the index of the input and the PartialSignature.
 * @returns The updated PSBT.
 */
export function addTaprootInputSignaturesToPSBT(
  psbt: Psbt,
  signatures: [number, PartialSignature][]
): void {
  signatures.forEach(([index, signature]) =>
    psbt.updateInput(index, {
      tapScriptSig: [
        {
          signature: signature.signature,
          pubkey: signature.pubkey,
          leafHash: signature.tapleafHash!,
        },
      ],
    })
  );
}
