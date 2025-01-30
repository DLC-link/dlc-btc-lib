import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { Transaction, p2tr, p2wpkh } from '@scure/btc-signer';
import { bitcoin, regtest, testnet } from 'bitcoinjs-lib/src/networks';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  ecdsaPublicKeyToSchnorr,
  finalizeUserInputs,
  getFeeAmount,
  getFeeRecipientAddress,
  getInputIndicesByScript,
  getScriptMatchingOutputFromTransaction,
  getUnspendableKeyCommittedToUUID,
  getVaultFundingBitcoinAddress,
  removeDustOutputs,
} from '../../src/functions/bitcoin/bitcoin-functions';
import * as bitcoinRequestFunctions from '../../src/functions/bitcoin/bitcoin-request-functions.js';
import { TEST_TESTNET_BITCOIN_BLOCKCHAIN_API } from '../mocks/api.test.constants.js';
import {
  TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
  TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1,
} from '../mocks/attestor.test.constants';
import {
  TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1,
  TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_2,
  TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_3,
  TEST_TESTNET_FUNDING_TRANSACTION_1,
  TEST_TESTNET_FUNDING_TRANSACTION_2,
  TEST_TESTNET_FUNDING_TRANSACTION_4,
  TEST_TESTNET_FUNDING_TRANSACTION_5,
  TEST_WITHDRAW_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1,
} from '../mocks/bitcoin-transaction.test.constants';
import {
  TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1,
  TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_1,
  TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_2,
  TEST_ALICE_TAPROOT_PUBLIC_KEY_1,
  TEST_ALICE_TAPROOT_PUBLIC_KEY_2,
  TEST_OUTPUTS,
  TEST_TAPROOT_MULTISIG_PAYMENT_SCRIPT_1,
  TEST_TAPROOT_UNHARDENED_DERIVED_PUBLIC_KEY_1,
  TEST_UNHARDENED_DERIVED_UNSPENDABLE_KEY_COMMITED_TO_UUID_1,
  TEST_UNSPENDABLE_KEY_COMMITED_TO_UUID_1,
} from '../mocks/bitcoin.test.constants';
import { TEST_VAULT_2 } from '../mocks/ethereum-vault.test.constants.js';
import { TEST_VAULT_UUID_1 } from '../mocks/ethereum.test.constants';

describe('Bitcoin Functions', () => {
  describe('getInputIndicesByScript', () => {
    it('correctly retrieves one input index by script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1)
      );
      const aliceScript = hexToBytes(TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1);
      const inputIndices = getInputIndicesByScript(aliceScript, transaction);
      expect(inputIndices).toEqual([0]);
    });

    it('correctly retrieves multiple input indices by script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_3)
      );
      const aliceScript = hexToBytes(TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1);
      const inputIndices = getInputIndicesByScript(aliceScript, transaction);
      expect(inputIndices).toEqual([0, 1, 2]);
    });

    it('correctly retrieve an empty array when no inputs found with given script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_WITHDRAW_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1)
      );
      const aliceScript = hexToBytes(TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1);
      const inputIndices = getInputIndicesByScript(aliceScript, transaction);
      expect(inputIndices).toEqual([]);
    });
  });

  describe('removeDustOutputs', () => {
    it('removes single dust output', () => {
      const outputs = [TEST_OUTPUTS[0], TEST_OUTPUTS[1]];
      removeDustOutputs(outputs);
      expect(outputs).toEqual([TEST_OUTPUTS[0]]);
    });

    it('removes multiple dust outputs', () => {
      const outputs = [...TEST_OUTPUTS];
      removeDustOutputs(outputs);
      expect(outputs).toEqual([TEST_OUTPUTS[0], TEST_OUTPUTS[2]]);
    });

    it('keeps all outputs if none are dust', () => {
      const outputs = [TEST_OUTPUTS[0], TEST_OUTPUTS[2]];
      removeDustOutputs(outputs);
      expect(outputs).toEqual(outputs);
    });
  });

  describe('getFeeRecipientAddress', () => {
    describe('mainnet', () => {
      const network = bitcoin;

      it('accepts native segwit (p2wpkh) address', () => {
        const address = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('accepts taproot (p2tr) address', () => {
        const address = 'bc1pgj9ef0lhysgd2v042jta4mv8qmc70yappkv7vpl76dhfvrdfvusqqe4qj3';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('accepts nested segwit (p2sh) address', () => {
        const address = '3KF9nXowQ4asSGxRRzeiTpDjMuwM2nypAN';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('converts public key to native segwit address', () => {
        const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
        const expectedAddress = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
        expect(getFeeRecipientAddress(publicKey, network)).toBe(expectedAddress);
      });
    });

    describe('testnet', () => {
      const network = testnet;

      it('accepts native segwit (p2wpkh) address', () => {
        const address = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('accepts taproot (p2tr) address', () => {
        const address = 'tb1pa8hxt6r2gkc8d5thzfrw7gyrqlv354rdy4k05ylkvf6nadnhg8xsygyusf';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('accepts nested segwit (p2sh) address', () => {
        const address = '2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('converts public key to native segwit address', () => {
        const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
        const expectedAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
        expect(getFeeRecipientAddress(publicKey, network)).toBe(expectedAddress);
      });
    });

    describe('regtest', () => {
      const network = regtest;

      it('accepts native segwit (p2wpkh) address', () => {
        const address = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('accepts taproot (p2tr) address', () => {
        const address = 'bcrt1pa8hxt6r2gkc8d5thzfrw7gyrqlv354rdy4k05ylkvf6nadnhg8xsf3w69n';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('accepts nested segwit (p2sh) address', () => {
        const address = '2MzQwSSnBHWHqSAqtTVQ6v47XtaisrJa1Vc';
        expect(getFeeRecipientAddress(address, network)).toBe(address);
      });

      it('converts public key to native segwit address', () => {
        const publicKey = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
        const expectedAddress = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080';
        expect(getFeeRecipientAddress(publicKey, network)).toBe(expectedAddress);
      });
    });

    describe('error cases', () => {
      it('throws on invalid public key', () => {
        const invalidKey = 'invalidPublicKey';
        expect(() => getFeeRecipientAddress(invalidKey, bitcoin)).toThrow(
          'P2WPKH: invalid publicKey'
        );
      });

      it('throws on invalid address', () => {
        const invalidAddress = 'invalidAddress';
        expect(() => getFeeRecipientAddress(invalidAddress, bitcoin)).toThrow();
      });
    });
  });

  describe('finalizeUserInputs', () => {
    it('correctly finalizes inputs given a transaction and a native segwit payment script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1)
      );

      const alicePublicKey = Buffer.from(TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_1, 'hex');
      const alicePayment = p2wpkh(alicePublicKey, regtest);

      finalizeUserInputs(transaction, alicePayment);

      expect(transaction.getInput(0).finalScriptWitness).toBeDefined();
      expect(transaction.getInput(1).finalScriptWitness).toBeUndefined();
    });

    it('does not finalize inputs given a transaction and a native segwit payment script that is not included in this transaction', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1)
      );

      const alicePublicKey = Buffer.from(TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_2, 'hex');
      const alicePayment = p2wpkh(alicePublicKey, regtest);

      finalizeUserInputs(transaction, alicePayment);

      expect(transaction.getInput(0).finalScriptWitness).toBeUndefined();
      expect(transaction.getInput(1).finalScriptWitness).toBeUndefined();
    });

    it('correctly finalizes inputs given a transaction and a taproot payment script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_2)
      );

      const alicePublicKey = ecdsaPublicKeyToSchnorr(
        Buffer.from(TEST_ALICE_TAPROOT_PUBLIC_KEY_1, 'hex')
      );
      const alicePayment = p2tr(alicePublicKey, undefined, regtest);

      finalizeUserInputs(transaction, alicePayment);

      expect(transaction.getInput(0).finalScriptWitness).toBeDefined();
      expect(transaction.getInput(1).finalScriptWitness).toBeUndefined();
    });

    it('does not finalize inputs given a transaction and a taproot payment script that is not included in this transaction', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_2)
      );

      const alicePublicKey = ecdsaPublicKeyToSchnorr(
        Buffer.from(TEST_ALICE_TAPROOT_PUBLIC_KEY_2, 'hex')
      );
      const alicePayment = p2tr(alicePublicKey, undefined, regtest);

      finalizeUserInputs(transaction, alicePayment);

      expect(transaction.getInput(0).finalScriptWitness).toBeUndefined();
      expect(transaction.getInput(1).finalScriptWitness).toBeUndefined();
    });
  });

  describe('getUnspendableKeyCommittedToUUID', () => {
    it('should return an unspendable key committed to the given uuid', () => {
      const result = getUnspendableKeyCommittedToUUID(TEST_VAULT_UUID_1, testnet);

      expect(result).toBe(TEST_UNSPENDABLE_KEY_COMMITED_TO_UUID_1);
    });
  });

  describe('deriveUnhardenedPublicKey', () => {
    it('should derive an unhardened public key from a given public key', () => {
      const result = deriveUnhardenedPublicKey(
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        testnet
      );

      expect(result.toString('hex')).toBe(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1);
    });
  });

  describe('createTaprootMultisigPayment', () => {
    it('should create a taproot multisig payment', () => {
      const result = createTaprootMultisigPayment(
        Buffer.from(TEST_UNHARDENED_DERIVED_UNSPENDABLE_KEY_COMMITED_TO_UUID_1, 'hex'),
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        Buffer.from(TEST_TAPROOT_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        testnet
      );

      expect(bytesToHex(result.script)).toBe(TEST_TAPROOT_MULTISIG_PAYMENT_SCRIPT_1);
    });
  });

  describe('getScriptMatchingOutputFromTransaction', () => {
    it('should get the script matching output from a transaction', () => {
      const result = getScriptMatchingOutputFromTransaction(
        TEST_TESTNET_FUNDING_TRANSACTION_1,
        hexToBytes(TEST_TAPROOT_MULTISIG_PAYMENT_SCRIPT_1)
      );

      expect(result).toBeDefined();
      expect(result).toBe(TEST_TESTNET_FUNDING_TRANSACTION_1.vout[0]);
    });

    it('should return undefined for a transaction without any output linked to the multisig script', () => {
      const result = getScriptMatchingOutputFromTransaction(
        TEST_TESTNET_FUNDING_TRANSACTION_2,
        hexToBytes(TEST_TAPROOT_MULTISIG_PAYMENT_SCRIPT_1)
      );

      expect(result).toBeUndefined();
    });
  });
  describe('getVaultFundingBitcoinAddress', () => {
    const expectedFundingAddress = 'tb1prykktsems67p98tqdsf0qxp4d82zwvk4njknhusg4x5l6wcnsfyqar32mq';

    it('should return input address when single non-multisig input exists', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const result = await getVaultFundingBitcoinAddress(
        TEST_VAULT_2,
        TEST_VAULT_2.btcFeeRecipient,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        testnet,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API
      );

      expect(result).toBe(expectedFundingAddress);
    });

    it('should return non-multisig address when transaction has multiple inputs', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_4);

      const result = await getVaultFundingBitcoinAddress(
        TEST_VAULT_2,
        TEST_VAULT_2.btcFeeRecipient,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        testnet,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API
      );

      expect(result).toBe(expectedFundingAddress);
    });

    it('should return non-fee-recipient output address when input is from multisig address', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_5);

      const result = await getVaultFundingBitcoinAddress(
        TEST_VAULT_2,
        TEST_VAULT_2.btcFeeRecipient,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        testnet,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API
      );

      expect(result).toBe(expectedFundingAddress);
    });
  });
  describe('getFeeAmount', () => {
    test('calculates correct fee for whole numbers', () => {
      expect(getFeeAmount(1000000, 50)).toBe(5000);
      expect(getFeeAmount(1000000, 25)).toBe(2500);
    });

    test('handles small fee basis points', () => {
      expect(getFeeAmount(1000000, 1)).toBe(100);
      expect(getFeeAmount(2000000, 1)).toBe(200);
    });

    test('handles typical fee calculations', () => {
      expect(getFeeAmount(1500000, 15)).toBe(2250);
      expect(getFeeAmount(2000000, 25)).toBe(5000);
    });

    test('properly drops decimals', () => {
      expect(getFeeAmount(1008584578, 15)).toBe(1512876);
      expect(getFeeAmount(1234567, 15)).toBe(1851); // 1234567 * 15 / 10000 = 1851.8505 -> 1851
      expect(getFeeAmount(9876543, 23)).toBe(22716); // 9876543 * 23 / 10000 = 22716.0489 -> 22716
    });
  });
});
