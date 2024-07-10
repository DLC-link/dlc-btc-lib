import { hexToBytes } from '@noble/hashes/utils';
import { Transaction, p2tr, p2wpkh } from '@scure/btc-signer';
import { regtest } from 'bitcoinjs-lib/src/networks';

import {
  ecdsaPublicKeyToSchnorr,
  finalizeUserInputs,
  getInputIndicesByScript,
} from '../../src/functions/bitcoin/bitcoin-functions';
import {
  TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1,
  TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_1,
  TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_2,
  TEST_ALICE_TAPROOT_PUBLIC_KEY_1,
  TEST_ALICE_TAPROOT_PUBLIC_KEY_2,
  TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1,
  TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_2,
  TEST_WITHDRAW_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1,
} from '../mocks/constants';

describe('Bitcoin Functions', () => {
  describe('getInputIndicesByScript', () => {
    it('correctly retrieves the input indices by script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1)
      );
      const aliceScript = hexToBytes(TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1);
      const inputIndices = getInputIndicesByScript(aliceScript, transaction);
      expect(inputIndices).toEqual([0]);
    });

    it('correctly retrieve an empty array when the script is not found', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_WITHDRAW_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1)
      );
      const aliceScript = hexToBytes(TEST_ALICE_NATIVE_SEGWIT_PAYMENT_SCRIPT_1);
      const inputIndices = getInputIndicesByScript(aliceScript, transaction);
      expect(inputIndices).toEqual([]);
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

    it('does not finalize inputs given a transaction and a native segwit payment script', () => {
      const transaction = Transaction.fromPSBT(
        hexToBytes(TEST_DEPOSIT_PSBT_PARTIALLY_SIGNED_DEPOSIT_PSBT_1)
      );

      const alicePublicKey = Buffer.from(TEST_ALICE_NATIVE_SEGWIT_PUBLIC_KEY_2, 'hex');
      const alicePayment = p2wpkh(alicePublicKey, regtest);

      finalizeUserInputs(transaction, alicePayment);

      expect(transaction.getInput(0).finalScriptWitness).toBeUndefined();
      expect(transaction.getInput(1).finalScriptWitness).toBeUndefined();
    });
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

  it('does not finalize inputs given a transaction and a taproot payment script', () => {
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
