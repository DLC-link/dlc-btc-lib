import { hexToBytes } from '@noble/hashes/utils';
import { selectUTXO } from '@scure/btc-signer';
import { reverseBytes } from '../../utilities/index.js';
import { ecdsaPublicKeyToSchnorr, getFeeAmount, getFeeRecipientAddressFromPublicKey, getUTXOs, } from '../bitcoin/bitcoin-functions.js';
import { fetchBitcoinTransaction } from './bitcoin-request-functions.js';
/**
 * Creates the initial Funding Transaction to fund the Multisig Transaction.
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
export async function createFundingTransaction(bitcoinAmount, bitcoinNetwork, multisigAddress, bitcoinNativeSegwitTransaction, feeRate, feePublicKey, feeBasisPoints, bitcoinBlockchainAPIURL) {
    const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
    const feeAmount = getFeeAmount(Number(bitcoinAmount), Number(feeBasisPoints));
    const userUTXOs = await getUTXOs(bitcoinNativeSegwitTransaction, bitcoinBlockchainAPIURL);
    const psbtOutputs = [
        { address: multisigAddress, amount: bitcoinAmount },
        {
            address: feeAddress,
            amount: BigInt(feeAmount),
        },
    ];
    const selected = selectUTXO(userUTXOs, psbtOutputs, 'default', {
        changeAddress: bitcoinNativeSegwitTransaction.address,
        feePerByte: feeRate,
        bip69: false,
        createTx: true,
        network: bitcoinNetwork,
    });
    if (!selected) {
        throw new Error('Failed to select Inputs for the Funding Transaction. Ensure sufficient funds are available.');
    }
    const fundingTX = selected.tx;
    if (!fundingTX)
        throw new Error('Could not create Funding Transaction');
    fundingTX.updateInput(0, {
        sequence: 0xfffffff0,
    });
    return fundingTX;
}
/**
 * Creates a Deposit Transaction.
 * Uses the existing Vault's Funding Transaction ID and additional UTXOs to create the Deposit Transaction.
 * The specified amount of Bitcoin is sent to the Vault's Multisig Address.
 * The remaining amount is sent back to the user's address.
 *
 * @param bitcoinBlockchainURL - The Bitcoin Blockchain URL.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param depositAmount - The Amount of Bitcoin to deposit.
 * @param vaultTransactionID - The ID of the Vault Funding Transaction.
 * @param multisigPayment - The Taproot Multisig Payment Transaction.
 * @param depositPayment - The User's Native Segwit or Taproot Payment Transaction which will be used to fund the Deposit Transaction.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Deposit Transaction.
 */
export async function createDepositTransaction(bitcoinBlockchainURL, bitcoinNetwork, depositAmount, vaultTransactionID, multisigPayment, depositPayment, feeRate, feePublicKey, feeBasisPoints) {
    const multisigPaymentAddress = multisigPayment.address;
    if (!multisigPaymentAddress) {
        throw new Error('Multisig Payment is missing Address');
    }
    const depositPaymentAddress = depositPayment.address;
    if (!depositPaymentAddress) {
        throw new Error('Deposit Payment is missing Address');
    }
    const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
    const feeAmount = getFeeAmount(Number(depositAmount), Number(feeBasisPoints));
    const vaultTransaction = await fetchBitcoinTransaction(vaultTransactionID, bitcoinBlockchainURL);
    const vaultTransactionOutputIndex = vaultTransaction.vout.findIndex(output => output.scriptpubkey_address === multisigPaymentAddress);
    if (vaultTransactionOutputIndex === -1) {
        throw new Error('Could not find Vault Transaction Output Index');
    }
    const vaultTransactionOutputValue = BigInt(vaultTransaction.vout[vaultTransactionOutputIndex].value);
    const userUTXOs = await getUTXOs(depositPayment, bitcoinBlockchainURL);
    const additionalDepositOutputs = [
        {
            address: feeAddress,
            amount: BigInt(feeAmount),
        },
        {
            address: multisigPaymentAddress,
            amount: BigInt(depositAmount),
        },
    ];
    const additionalDepositSelected = selectUTXO(userUTXOs, additionalDepositOutputs, 'default', {
        changeAddress: depositPaymentAddress,
        feePerByte: feeRate,
        bip69: false,
        createTx: false,
        network: bitcoinNetwork,
    });
    if (!additionalDepositSelected) {
        throw new Error('Failed to select Inputs for the Additional Deposit Transaction. Ensure sufficient funds are available.');
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
        .map(async (input) => {
        const txID = input.txid;
        if (!txID) {
            throw new Error('Could not get Transaction ID from Input');
        }
        return userUTXOs.find((utxo) => utxo.txid === txID && utxo.index === input.index);
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
            address: multisigPaymentAddress,
            amount: BigInt(depositAmount) + BigInt(vaultTransactionOutputValue),
        },
    ];
    const depositSelected = selectUTXO(depositInputs, depositOutputs, 'default', {
        changeAddress: depositPaymentAddress,
        feePerByte: feeRate,
        bip69: false,
        createTx: true,
        network: bitcoinNetwork,
    });
    if (!depositSelected) {
        throw new Error('Failed to select Inputs for the Deposit Transaction. Ensure sufficient funds are available.');
    }
    const depositTransaction = depositSelected.tx;
    if (!depositTransaction)
        throw new Error('Could not create Deposit Transaction');
    depositTransaction.updateInput(0, {
        sequence: 0xfffffff0,
    });
    return depositTransaction;
}
/**
 * Creates a Withdrawal Transaction.
 * Uses the Funding Transaction's ID to create the Withdrawal Transaction.
 * The specified amount of Bitcoin is sent to the User's Native Segwit Address.
 * The remaining amount is sent back to the Multisig Transaction.
 *
 * @param bitcoinBlockchainURL - The Bitcoin Blockchain URL.
 * @param bitcoinAmount - The Amount of Bitcoin to withdraw.
 * @param bitcoinNetwork - The Bitcoin Network to use.
 * @param fundingTransactionID - The ID of the Funding Transaction.
 * @param multisigTransaction - The Multisig Transaction.
 * @param userNativeSegwitAddress - The User's Native Segwit Address.
 * @param feeRate - The Fee Rate to use for the Transaction.
 * @param feePublicKey - The Fee Recipient's Public Key.
 * @param feeBasisPoints - The Fee Basis Points.
 * @returns The Closing Transaction.
 */
export async function createWithdrawalTransaction(bitcoinBlockchainURL, bitcoinAmount, bitcoinNetwork, fundingTransactionID, multisigTransaction, userNativeSegwitAddress, feeRate, feePublicKey, feeBasisPoints) {
    const multisigTransactionAddress = multisigTransaction.address;
    if (!multisigTransactionAddress) {
        throw new Error('Multisig Transaction is missing Address');
    }
    const fundingTransaction = await fetchBitcoinTransaction(fundingTransactionID, bitcoinBlockchainURL);
    const fundingTransactionOutputIndex = fundingTransaction.vout.findIndex(output => output.scriptpubkey_address === multisigTransactionAddress);
    if (fundingTransactionOutputIndex === -1) {
        throw new Error('Could not find Funding Transaction Output Index');
    }
    const fundingTransactionOutputValue = BigInt(fundingTransaction.vout[fundingTransactionOutputIndex].value);
    if (fundingTransactionOutputValue < bitcoinAmount) {
        throw new Error('Insufficient Funds');
    }
    const remainingAmount = BigInt(fundingTransaction.vout[fundingTransactionOutputIndex].value) - BigInt(bitcoinAmount);
    const feeAddress = getFeeRecipientAddressFromPublicKey(feePublicKey, bitcoinNetwork);
    const feeAmount = getFeeAmount(Number(bitcoinAmount), Number(feeBasisPoints));
    const inputs = [
        {
            txid: hexToBytes(fundingTransactionID),
            index: fundingTransactionOutputIndex,
            witnessUtxo: {
                amount: BigInt(fundingTransaction.vout[fundingTransactionOutputIndex].value),
                script: multisigTransaction.script,
            },
            ...multisigTransaction,
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
            address: multisigTransactionAddress,
            amount: remainingAmount,
        });
    }
    const selected = selectUTXO(inputs, outputs, 'default', {
        changeAddress: userNativeSegwitAddress,
        feePerByte: feeRate,
        bip69: false,
        createTx: true,
        network: bitcoinNetwork,
    });
    if (!selected) {
        throw new Error('Failed to select Inputs for the Withdrawal Transaction. Ensure sufficient funds are available.');
    }
    const withdrawTX = selected.tx;
    if (!withdrawTX)
        throw new Error('Could not create Withdrawal Transaction');
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
 * @returns The updated PSBT.
 * @throws An error if there is an issue adding the UTXO Ledger props or the BIP32 derivation.
 */
export async function updateNativeSegwitInputs(inputsToUpdate = [], nativeSegwitPublicKey, masterFingerprint, psbt, bitcoinBlockchainAPIURL) {
    try {
        await addNativeSegwitUTXOLedgerProps(psbt, inputsToUpdate, bitcoinBlockchainAPIURL);
    }
    catch (e) {
        // Intentionally Ignored
    }
    await addNativeSegwitBip32Derivation(psbt, masterFingerprint, nativeSegwitPublicKey, inputsToUpdate);
    return psbt;
}
/**
 * This function returns the Native Segwit Inputs to sign from the given input signing configuration.
 * @param inputByPaymentType - An array of tuples containing the BitcoinInputSigningConfig
 * and the payment type of the input.
 * @returns An array of BitcoinInputSigningConfig objects.
 */
export function getNativeSegwitInputsToSign(inputByPaymentType) {
    return (inputByPaymentType
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, paymentType]) => paymentType === 'p2wpkh')
        .map(([index]) => index));
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
export async function updateTaprootInputs(inputsToUpdate = [], taprootPublicKey, masterFingerprint, psbt) {
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
export function getTaprootInputsToSign(inputByPaymentType) {
    return (inputByPaymentType
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, paymentType]) => paymentType === 'p2tr')
        .map(([index]) => index));
}
/**
 * This function updates the PSBT with the transaction hexes of the inputs that correspond to the given input signing configuration.
 * @param inputsToUpdate - An array of BitcoinInputSigningConfig objects.
 * @param psbt - The PSBT to update.
 * @returns The updated PSBT.
 */
async function addNativeSegwitUTXOLedgerProps(psbt, inputSigningConfiguration, bitcoinBlockchainAPIURL) {
    const inputTransactionHexes = await Promise.all(psbt.txInputs.map(async (input) => (await fetch(`${bitcoinBlockchainAPIURL}/tx/${reverseBytes(input.hash).toString('hex')}/hex`)).text()));
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
async function addNativeSegwitBip32Derivation(psbt, masterFingerPrint, nativeSegwitPublicKey, inputSigningConfiguration) {
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
export function addNativeSegwitSignaturesToPSBT(psbt, signatures) {
    signatures.forEach(([index, signature]) => psbt.updateInput(index, { partialSig: [signature] }));
}
/**
 * This function updates the PSBT with the received Taproot Signatures.
 * @param psbt - The PSBT to update.
 * @param signatures - An array of tuples containing the index of the input and the PartialSignature.
 * @returns The updated PSBT.
 */
export function addTaprootInputSignaturesToPSBT(psbt, signatures) {
    signatures.forEach(([index, signature]) => psbt.updateInput(index, {
        tapScriptSig: [
            {
                signature: signature.signature,
                pubkey: signature.pubkey,
                leafHash: signature.tapleafHash,
            },
        ],
    }));
}
