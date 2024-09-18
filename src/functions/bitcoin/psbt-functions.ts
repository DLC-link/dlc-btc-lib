import { hexToBytes } from '@noble/hashes/utils';
import { Transaction, selectUTXO } from '@scure/btc-signer';
import { P2Ret, P2TROut } from '@scure/btc-signer/payment';
import { Network, Psbt } from 'bitcoinjs-lib';
import { logger } from 'ethers';
import { PartialSignature } from 'ledger-bitcoin/build/main/lib/appClient.js';

import { BitcoinInputSigningConfig, PaymentTypes } from '../../models/bitcoin-models.js';
import { reverseBytes } from '../../utilities/index.js';
import {
  ecdsaPublicKeyToSchnorr,
  getFeeAmount,
  getFeeRecipientAddressFromPublicKey,
} from '../bitcoin/bitcoin-functions.js';
import { fetchBitcoinTransaction, getUTXOs } from './bitcoin-request-functions.js';
import { BitcoinCoreRpcConnection } from './bitcoincore-rpc-connection.js';

/**
 * Creates a Funding Transaction to deposit Bitcoin into an empty Vault.
 * Uses the UTXOs of the User to create the Funding Transaction.
 * The specified amount of Bitcoin is sent to the Vault's Multisig Address.
 *
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param depositAmount - The amount of Bitcoin to deposit into the Vault.
 * @param multisigPayment - The Multisig Payment object created from the User's Taproot Public Key, the Attestor's Public Key, and the Unspendable Public Key committed to the Vault's UUID.
 * @param depositPayment - The User's Payment object which will be used to fund the Deposit Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns A Funding Transaction.
 */
export async function createFundingTransaction(
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection,
  bitcoinNetwork: Network,
  depositAmount: bigint,
  multisigPayment: P2TROut,
  depositPayment: P2Ret | P2TROut,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: bigint
): Promise<Transaction> {
  const multisigAddress = multisigPayment.address;

  if (!multisigAddress) {
    throw new Error('Multisig Payment is missing Address');
  }

  const depositAddress = depositPayment.address;

  if (!depositAddress) {
    throw new Error('Deposit Payment is missing Address');
  }

  // const client = bitcoincoreRpcAuth.getClient();

  logger.info('createFundingTransaction: Getting feeAddress');
  const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
  logger.info('feeAddress:', feeAddress);

  logger.info('createFundingTransaction: Getting feeAmount');
  const feeAmount = getFeeAmount(Number(depositAmount), Number(feeBasisPoints));
  logger.info('feeAmount:', feeAmount);

  logger.info('createFundingTransaction: Getting userUTXOs');
  const userUTXOs = await getUTXOs(depositPayment, bitcoinCoreRpcConnection);

  const psbtOutputs = [
    { address: multisigAddress, amount: depositAmount },
    {
      address: feeAddress,
      amount: BigInt(feeAmount),
    },
  ];

  const selected = selectUTXO(userUTXOs, psbtOutputs, 'default', {
    changeAddress: depositAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
    dust: 546n as unknown as number,
  });

  if (!selected) {
    throw new Error(
      'Failed to select Inputs for the Funding Transaction. Ensure sufficient funds are available.'
    );
  }

  const fundingTX = selected.tx;

  if (!fundingTX) throw new Error('Could not create Funding Transaction');

  fundingTX.updateInput(0, {
    sequence: 0xfffffff0,
  });

  return fundingTX;
}

/**
 * Creates a Deposit Transaction to deposit Bitcoin into a Vault.
 * Uses the existing Vault's Funding Transaction ID and additional UTXOsof the User to create the Deposit Transaction.
 * The specified amount of Bitcoin is sent to the Vault's Multisig Address.
 * The remaining amount is sent back to the User's Address.
 *
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param depositAmount - The amount of Bitcoin to deposit into the Vault.
 * @param vaultTransactionID - The ID of the Vault Funding Transaction.
 * @param multisigPayment - The Multisig Payment object created from the User's Taproot Public Key, the Attestor's Public Key, and the Unspendable Public Key committed to the Vault's UUID.
 * @param depositPayment - The User's Payment object which will be used to fund the Deposit Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns A Deposit Transaction.
 */
export async function createDepositTransaction(
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection,
  bitcoinNetwork: Network,
  depositAmount: bigint,
  vaultTransactionID: string,
  multisigPayment: P2TROut,
  depositPayment: P2TROut | P2Ret,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: bigint
): Promise<Transaction> {
  const multisigAddress = multisigPayment.address;

  if (!multisigAddress) {
    throw new Error('Multisig Payment is missing Address');
  }

  const depositAddress = depositPayment.address;

  if (!depositAddress) {
    throw new Error('Deposit Payment is missing Address');
  }

  const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
  const feeAmount = getFeeAmount(Number(depositAmount), Number(feeBasisPoints));

  const vaultTransaction = await fetchBitcoinTransaction(
    vaultTransactionID,
    bitcoinCoreRpcConnection
  );

  const vaultTransactionOutputIndex = vaultTransaction.vout.findIndex(output =>
    output.scriptPubKey.addresses.includes(multisigAddress)
  );

  if (vaultTransactionOutputIndex === -1) {
    throw new Error('Could not find Vault Transaction Output Index');
  }

  const vaultTransactionOutputValue = BigInt(
    vaultTransaction.vout[vaultTransactionOutputIndex].value
  );

  const userUTXOs = await getUTXOs(depositPayment, bitcoinCoreRpcConnection);

  const additionalDepositOutputs = [
    {
      address: feeAddress,
      amount: BigInt(feeAmount),
    },
    {
      address: multisigAddress,
      amount: BigInt(depositAmount),
    },
  ];

  const additionalDepositSelected = selectUTXO(userUTXOs, additionalDepositOutputs, 'default', {
    changeAddress: depositAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: false,
    network: bitcoinNetwork,
    dust: 546n as unknown as number,
  });

  if (!additionalDepositSelected) {
    throw new Error(
      'Failed to select Inputs for the Additional Deposit Transaction. Ensure sufficient funds are available.'
    );
  }

  const vaultInput = {
    txid: hexToBytes(vaultTransactionID),
    index: vaultTransactionOutputIndex,
    witnessUtxo: {
      amount: BigInt(vaultTransactionOutputValue),
      script: multisigPayment.script,
    },
    ...multisigPayment,
  };

  const depositInputPromises = additionalDepositSelected.inputs
    .map(async input => {
      const txID = input.txid;
      if (!txID) {
        throw new Error('Could not get Transaction ID from Input');
      }
      return userUTXOs.find((utxo: any) => utxo.txid === txID && utxo.index === input.index);
    })
    .filter(utxo => utxo !== undefined);

  const depositInputs = await Promise.all(depositInputPromises);
  depositInputs.push(vaultInput);

  const depositOutputs = [
    {
      address: feeAddress,
      amount: BigInt(feeAmount),
    },
    {
      address: multisigAddress,
      amount: BigInt(depositAmount) + BigInt(vaultTransactionOutputValue),
    },
  ];

  const depositSelected = selectUTXO(depositInputs, depositOutputs, 'all', {
    changeAddress: depositAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
    dust: 546n as unknown as number,
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

  return depositTransaction;
}

/**
 * Creates a Withdraw Transaction to withdraw Bitcoin from a Vault.
 * Uses the existing Vault's Funding Transaction ID to create the Withdraw Transaction.
 * The specified amount of Bitcoin is sent to the User's Address.
 * The remaining amount is sent back to the Vault's Multisig Address.
 *
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param withdrawAmount - The amount of Bitcoin to withdraw from the Vault.
 * @param vaultTransactionID - The ID of the Vault Funding Transaction.
 * @param multisigPayment - The Multisig Payment object created from the User's Taproot Public Key, the Attestor's Public Key, and the Unspendable Public Key committed to the Vault's UUID.
 * @param withdrawPayment - The User's Payment object which will be used to receive the withdrawn Bitcoin.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns A Withdraw Transaction.
 */
export async function createWithdrawTransaction(
  bitcoinCoreRpcConnection: BitcoinCoreRpcConnection,
  bitcoinNetwork: Network,
  withdrawAmount: bigint,
  vaultTransactionID: string,
  multisigPayment: P2TROut,
  withdrawPayment: P2Ret | P2TROut,
  feeRate: bigint,
  feePublicKey: string,
  feeBasisPoints: bigint
): Promise<Transaction> {
  const multisigAddress = multisigPayment.address;

  if (!multisigAddress) {
    throw new Error('Multisig Transaction is missing Address');
  }

  const withdrawAddress = withdrawPayment.address;

  if (!withdrawAddress) {
    throw new Error('Withdraw Payment is missing Address');
  }

  const fundingTransaction = await fetchBitcoinTransaction(
    vaultTransactionID,
    bitcoinCoreRpcConnection
  );

  const fundingTransactionOutputIndex = fundingTransaction.vout.findIndex(output =>
    output.scriptPubKey.addresses.includes(multisigAddress)
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

  const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
  const feeAmount = getFeeAmount(Number(withdrawAmount), Number(feeBasisPoints));

  const inputs = [
    {
      txid: hexToBytes(vaultTransactionID),
      index: fundingTransactionOutputIndex,
      witnessUtxo: {
        amount: BigInt(fundingTransaction.vout[fundingTransactionOutputIndex].value),
        script: multisigPayment.script,
      },
      ...multisigPayment,
    },
  ];

  const outputs = [
    {
      address: feeAddress,
      amount: BigInt(feeAmount),
    },
  ];

  if (remainingAmount > 0) {
    outputs.push({
      address: multisigAddress,
      amount: remainingAmount,
    });
  }

  const selected = selectUTXO(inputs, outputs, 'default', {
    changeAddress: withdrawAddress,
    feePerByte: feeRate,
    bip69: false,
    createTx: true,
    network: bitcoinNetwork,
    dust: 546n as unknown as number,
  });

  if (!selected) {
    throw new Error(
      'Failed to select Inputs for the Withdraw Transaction. Ensure sufficient funds are available.'
    );
  }

  const withdrawTX = selected.tx;

  if (!withdrawTX) throw new Error('Could not create Withdraw Transaction');

  withdrawTX.updateInput(0, {
    sequence: 0xfffffff0,
  });

  return withdrawTX;
}

/**
 * This function updates the PSBT with the necessary information to sign the inputs
 * that correspond to the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @param nativeSegwitPublicKey - The public key corresponding to the native segwit inputs.
 * @param masterFingerprint - The master fingerprint of the wallet.
 * @param psbt - The PSBT to update.
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns The updated PSBT.
 * @throws An error if there is an issue adding the UTXO Ledger props or the BIP32 derivation.
 */
export async function updateNativeSegwitInputs(
  inputsToUpdate: BitcoinInputSigningConfig[] = [],
  nativeSegwitPublicKey: Buffer,
  masterFingerprint: string,
  psbt: Psbt,
  bitcoincoreRpcConnection: BitcoinCoreRpcConnection
): Promise<Psbt> {
  try {
    await addNativeSegwitUTXOLedgerProps(psbt, inputsToUpdate, bitcoincoreRpcConnection);
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
): Promise<void> {
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
 * @param bitcoinCoreRpcConnection - The Bitcoin Core RPC Connection object.
 * @returns The updated PSBT.
 */
async function addNativeSegwitUTXOLedgerProps(
  psbt: Psbt,
  inputSigningConfiguration: BitcoinInputSigningConfig[],
  bitcoincoreRpcConnection: BitcoinCoreRpcConnection
): Promise<Psbt> {
  const client = bitcoincoreRpcConnection.getClient();
  const inputTransactionHexes = await Promise.all(
    psbt.txInputs.map(async input =>
      (await client.getRawTransaction(reverseBytes(input.hash).toString('hex'))).toString()
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
): Promise<void> {
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
) {
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
    psbt.updateInput(index, { tapKeySig: signature.signature })
  );
}

export function addFundingSignaturesBasedOnPaymentType(
  psbt: Psbt,
  paymentType: 'wpkh' | 'tr',
  signatures: [number, PartialSignature][]
): void {
  switch (paymentType) {
    case 'wpkh':
      addNativeSegwitSignaturesToPSBT(psbt, signatures);
      break;
    case 'tr':
      addTaprootInputSignaturesToPSBT(psbt, signatures);
      break;
    default:
      throw new Error('Invalid Funding Payment Type');
  }
}

/**
 * This function updates the PSBT with the received Taproot Partial Signatures.
 * @param psbt - The PSBT to update.
 * @param signatures - An array of tuples containing the index of the input and the PartialSignature.
 * @returns The updated PSBT.
 */
export function addTaprooMultisigInputSignaturesToPSBT(
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
