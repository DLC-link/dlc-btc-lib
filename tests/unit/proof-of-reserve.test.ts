import { bitcoin, testnet } from 'bitcoinjs-lib/src/networks.js';

import * as bitcoinRequestFunctions from '../../src/functions/bitcoin/bitcoin-request-functions.js';
import { BitcoinCoreRpcConnection } from '../../src/functions/bitcoin/bitcoincore-rpc-connection.js';
import { verifyVaultDeposit } from '../../src/functions/proof-of-reserve/proof-of-reserve-functions.js';
import {
  TEST_TESTNET_BITCOINCORE_RPC_PASSWORD,
  TEST_TESTNET_BITCOINCORE_RPC_PORT,
  TEST_TESTNET_BITCOINCORE_RPC_URL,
  TEST_TESTNET_BITCOINCORE_RPC_USERNAME,
} from '../mocks/api.test.constants.js';
import {
  TEST_MAINNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1,
  TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1,
} from '../mocks/attestor.test.constants.js';
import {
  TEST_TESTNET_FUNDING_TRANSACTION_11,
  TEST_TESTNET_FUNDING_TRANSACTION_12,
  TEST_TESTNET_FUNDING_TRANSACTION_111,
} from '../mocks/bitcoin-transaction.test.constants.js';
import { TEST_VAULT_2, TEST_VAULT_3 } from '../mocks/ethereum-vault.test.constants.js';

describe('Proof of Reserve Calculation', () => {
  const bitcoincoreRpcConnectionTestnet = new BitcoinCoreRpcConnection(
    TEST_TESTNET_BITCOINCORE_RPC_URL,
    TEST_TESTNET_BITCOINCORE_RPC_USERNAME,
    TEST_TESTNET_BITCOINCORE_RPC_PASSWORD,
    TEST_TESTNET_BITCOINCORE_RPC_PORT
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('verifyVaultDeposit', () => {
    it("should return the expected value when the vault's funding transaction is confirmed, contains an output with the multisig's script, and the output's value matches the vault's valueLocked field", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_111);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        bitcoincoreRpcConnectionTestnet,
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

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        bitcoincoreRpcConnectionTestnet,
        testnet
      );

      expect(result).toBe(0);
    });

    it("should return 0 when the vault's funding transaction is not yet confirmed", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_11);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        bitcoincoreRpcConnectionTestnet,
        testnet
      );
      expect(result).toBe(0);
    });

    it("should return 0 if the vault's funding transaction lacks an output with the multisig's script", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_12);

      const result = await verifyVaultDeposit(
        TEST_VAULT_2,
        Buffer.from(TEST_TESTNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        bitcoincoreRpcConnectionTestnet,
        testnet
      );

      expect(result).toBe(0);
    });

    it("should return 0 if the vault is legacy and its funding transaction lacks an output with the multisig's script", async () => {
      jest
        .spyOn(bitcoinRequestFunctions, 'fetchBitcoinTransaction')
        .mockImplementationOnce(async () => TEST_TESTNET_FUNDING_TRANSACTION_11);

      const result = await verifyVaultDeposit(
        TEST_VAULT_3,
        Buffer.from(TEST_MAINNET_ATTESTOR_UNHARDENED_DERIVED_PUBLIC_KEY_1, 'hex'),
        bitcoincoreRpcConnectionTestnet,
        bitcoin
      );

      expect(result).toBe(0);
    });
  });
});
