import { Transaction, p2wpkh } from '@scure/btc-signer';

import { PrivateKeyDLCHandler } from '../../src/index.js';
import { shiftValue } from '../../src/utilities/index.js';
import {
  TEST_BITCOIN_AMOUNT,
  TEST_BITCOIN_BLOCKCHAIN_API,
  TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API,
  TEST_BITCOIN_EXTENDED_PRIVATE_KEY,
  TEST_BITCOIN_NETWORK,
  TEST_BITCOIN_WALLET_ACCOUNT_INDEX,
  TEST_REGTEST_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY,
  TEST_VAULT,
} from '../mocks/constants.js';

describe('Create and Sign Vault related Transactions', () => {
  let dlcHandler: PrivateKeyDLCHandler;
  let fundingTransaction: Transaction;
  let signedFundingTransaction: Transaction;
  let closingTransaction: Transaction;
  let partiallySignedClosingTransaction: Transaction;

  it('should initialize a Private Key DLC Handler', async () => {
    dlcHandler = new PrivateKeyDLCHandler(
      TEST_BITCOIN_EXTENDED_PRIVATE_KEY,
      TEST_BITCOIN_WALLET_ACCOUNT_INDEX,
      TEST_BITCOIN_NETWORK,
      TEST_BITCOIN_BLOCKCHAIN_API,
      TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API
    );
  });

  it('should create a funding transaction', async () => {
    fundingTransaction = await dlcHandler.createFundingPSBT(
      TEST_VAULT,
      BigInt(shiftValue(TEST_BITCOIN_AMOUNT)),
      TEST_REGTEST_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY,
      2
    );

    const vaultAmount = TEST_VAULT.valueLocked.toBigInt();
    const feeAmount = vaultAmount / TEST_VAULT.btcMintFeeBasisPoints.toBigInt();

    const feeRecipientScript = p2wpkh(
      Buffer.from(TEST_VAULT.btcFeeRecipient, 'hex'),
      TEST_BITCOIN_NETWORK
    ).script;
    const multisigScript = dlcHandler.payment?.taprootMultisigPayment.script;

    const outputs = Array.from({ length: fundingTransaction.outputsLength }, (_, index) =>
      fundingTransaction.getOutput(index)
    );

    const multisigOutput = outputs.find(
      output => output.script?.toString() === multisigScript?.toString()
    );
    const feeOutput = outputs.find(
      output => output.script?.toString() === feeRecipientScript.toString()
    );

    expect(fundingTransaction).toBeDefined();
    expect(multisigOutput?.amount === vaultAmount).toBeTruthy();
    expect(feeOutput?.amount === feeAmount).toBeTruthy();
  });

  it('should sign a funding transaction', async () => {
    signedFundingTransaction = dlcHandler.signPSBT(fundingTransaction, 'funding');

    expect(signedFundingTransaction.isFinal).toBeTruthy();
  });
});
