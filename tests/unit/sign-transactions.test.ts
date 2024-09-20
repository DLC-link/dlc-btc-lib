import { hexToBytes } from '@noble/hashes/utils';
import { Transaction } from '@scure/btc-signer';
import { regtest } from 'bitcoinjs-lib/src/networks.js';

import { BitcoinCoreRpcConnection } from '../../src/functions/bitcoin/bitcoincore-rpc-connection.js';
import { PrivateKeyDLCHandler } from '../../src/index.js';
import {
  TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API,
  TEST_REGTEST_BITCOINCORE_RPC_PASSWORD,
  TEST_REGTEST_BITCOINCORE_RPC_PORT,
  TEST_REGTEST_BITCOINCORE_RPC_URL,
  TEST_REGTEST_BITCOINCORE_RPC_USERNAME,
} from '../mocks/api.test.constants.js';
import { TEST_FUNDING_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1 } from '../mocks/bitcoin-transaction.test.constants.js';
import {
  TEST_BITCOIN_EXTENDED_PRIVATE_KEY,
  TEST_BITCOIN_WALLET_ACCOUNT_INDEX,
  TEST_FUNDING_PAYMENT_TYPE,
} from '../mocks/bitcoin.test.constants.js';

describe('Create and Sign Vault related Transactions', () => {
  let dlcHandler: PrivateKeyDLCHandler;

  it('should initialize a Private Key DLC Handler', async () => {
    const bitcoincoreRpcConnection = new BitcoinCoreRpcConnection(
      TEST_REGTEST_BITCOINCORE_RPC_URL,
      TEST_REGTEST_BITCOINCORE_RPC_USERNAME,
      TEST_REGTEST_BITCOINCORE_RPC_PASSWORD,
      TEST_REGTEST_BITCOINCORE_RPC_PORT
    );
    dlcHandler = new PrivateKeyDLCHandler(
      TEST_BITCOIN_EXTENDED_PRIVATE_KEY,
      TEST_BITCOIN_WALLET_ACCOUNT_INDEX,
      TEST_FUNDING_PAYMENT_TYPE,
      regtest,
      bitcoincoreRpcConnection,
      TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API
    );
  });

  it('should sign a funding transaction', async () => {
    const signedFundingTransaction = dlcHandler.signPSBT(
      Transaction.fromPSBT(hexToBytes(TEST_FUNDING_PSBT_PARTIALLY_SIGNED_WITHDRAW_PSBT_1)),
      'funding'
    );

    expect(signedFundingTransaction.isFinal).toBeTruthy();
  });
});
