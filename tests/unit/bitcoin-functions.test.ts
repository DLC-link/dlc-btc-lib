import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { testnet } from 'bitcoinjs-lib/src/networks';

import {
  createTaprootMultisigPayment,
  deriveUnhardenedPublicKey,
  getScriptMatchingOutputFromTransaction,
  getUnspendableKeyCommittedToUUID,
} from '../../src/functions/bitcoin/bitcoin-functions';
import {
  TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
  TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1,
} from '../mocks/attestor.test.constants';
import {
  TEST_TAPROOT_MULTISIG_PAYMENT_SCRIPT_1,
  TEST_TAPROOT_UNHARDENED_DERIVED_PUBLIC_KEY_1,
  TEST_TESTNET_FUNDING_TRANSACTION_1,
  TEST_TESTNET_FUNDING_TRANSACTION_2,
  TEST_UNHARDENED_DERIVED_UNSPENDABLE_KEY_COMMITED_TO_UUID_1,
  TEST_UNSPENDABLE_KEY_COMMITED_TO_UUID_1,
} from '../mocks/bitcoin.test.constants';
import { TEST_VAULT_UUID_1 } from '../mocks/ethereum.test.constants';

describe('Bitcoin Functions', () => {
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
});
