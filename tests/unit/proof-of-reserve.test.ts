import { testnet } from 'bitcoinjs-lib/src/networks.js';

import { verifyVaultDeposit } from '../../src/functions/proof-of-reserve/proof-of-reserve-functions.js';
import { TEST_TESTNET_BITCOIN_BLOCKCHAIN_API } from '../mocks/api.test.constants.js';
import { TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1 } from '../mocks/attestor.test.constants.js';
import {
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2,
} from '../mocks/bitcoin.test.constants.js';
import { TEST_TESTNET_FUNDING_TRANSACTION, TEST_VAULT_2 } from '../mocks/constants';

jest.mock('../../src/functions/bitcoin/bitcoin-request-functions.js', () => {
  const actual = jest.requireActual('../../src/functions/bitcoin/bitcoin-request-functions.js');
  return {
    ...actual,
    fetchBitcoinTransaction: () => TEST_TESTNET_FUNDING_TRANSACTION,
  };
});

describe('Proof of Reserve Calculation', () => {
  describe('verifyVaultDeposit', () => {
    it("should return true when the vault's funding transaction is confirmed, contains an output with the multisig's script, and the output's value matches the vault's valueLocked field", async () => {
      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(true);
    });

    it("should return false when the vault's funding transaction is not yet confirmed", async () => {
      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(false);
    });
  });
});
