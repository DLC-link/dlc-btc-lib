import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';

import * as bitcoinRequestFunctions from '../../src/functions/bitcoin/bitcoin-request-functions.js';
import { getVaultDepositValue } from '../../src/functions/proof-of-reserve/proof-of-reserve-functions.js';
import {
  TEST_MAINNET_BITCOIN_BLOCKCHAIN_API,
  TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
} from '../mocks/api.test.constants.js';
import {
  TEST_MAINNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
  TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
} from '../mocks/attestor.test.constants.js';
import {
  TEST_MAINNET_FUNDING_TRANSACTION_1,
  TEST_TESTNET_FUNDING_TRANSACTION_1,
  TEST_TESTNET_FUNDING_TRANSACTION_2,
} from '../mocks/bitcoin-transaction.test.constants.js';
import {
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2,
  TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_3,
} from '../mocks/bitcoin.test.constants.js';
import { TEST_VAULT_2, TEST_VAULT_3 } from '../mocks/ethereum-vault.test.constants.js';

describe('Proof of Reserve Calculation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('verifyVaultDeposit', () => {
    it("should return the expected value when the vault's funding transaction is confirmed, contains an output with the multisig's script, and the output's value matches the vault's valueLocked field", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const result = await getVaultDepositValue(
        TEST_VAULT_2,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(10000000);
    });

    it('should return 0 if the funding transaction is not found', async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => {
          throw new Error('Transaction not found');
        });

      const result = await getVaultDepositValue(
        TEST_VAULT_2,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(0);
    });

    it("should return 0 when the vault's funding transaction is not yet confirmed", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_1);

      const result = await getVaultDepositValue(
        TEST_VAULT_2,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_2,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(0);
    });

    it("should return 0 if the vault's funding transaction lacks an output with the multisig's script", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_2);

      const result = await getVaultDepositValue(
        TEST_VAULT_2,
        TEST_TESTNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_1,
        TEST_TESTNET_BITCOIN_BLOCKCHAIN_API,
        testnet
      );

      expect(result).toBe(0);
    });

    it("should return 0 if the vault is legacy and it's funding transaction lacks an output with the multisig's script", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_MAINNET_FUNDING_TRANSACTION_1);

      const result = await getVaultDepositValue(
        TEST_VAULT_3,
        TEST_MAINNET_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY_1,
        TEST_BITCOIN_BLOCKCHAIN_BLOCK_HEIGHT_3,
        TEST_MAINNET_BITCOIN_BLOCKCHAIN_API,
        bitcoin
      );

      expect(result).toBe(0);
    });
  });
});
