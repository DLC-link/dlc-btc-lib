import { testnet } from 'bitcoinjs-lib/src/networks.js';

import * as bitcoinRequestFunctions from '../../src/functions/bitcoin/bitcoin-request-functions.js';
import { verifyVaultDeposit } from '../../src/functions/proof-of-reserve/proof-of-reserve-functions.js';
import { TEST_TESTNET_BITCOIN_BLOCKCHAIN_API } from '../mocks/api.test.constants.js';
import { TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1 } from '../mocks/attestor.test.constants.js';
import {
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2,
  TEST_TESTNET_FUNDING_TRANSACTION_1,
  TEST_TESTNET_FUNDING_TRANSACTION_2,
  TEST_TESTNET_FUNDING_TRANSACTION_3,
} from '../mocks/bitcoin.test.constants.js';
import { TEST_VAULT_2 } from '../mocks/constants';

describe('Proof of Reserve Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('verifyVaultDeposit', () => {
    xit("should return true when the vault's funding transaction is confirmed, contains an output with the multisig's script, and the output's value matches the vault's valueLocked field", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(true);
    });

    xit('should return false if the funding transaction is not found', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => {
          throw new Error('Transaction not found');
        });

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(false);
    });

    xit("should return false when the vault's funding transaction is not yet confirmed", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(false);
    });

    it("should return false if the vault's funding transaction lacks an output with the multisig's script", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_2);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(false);
    });

    it("should return false if the output value related to the multisig script differs from the vault's valueLocked field in the funding transaction", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_3);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(false);
    });
  });
});
