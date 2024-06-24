import { Transaction, p2wpkh } from '@scure/btc-signer';

import { PrivateKeyDLCHandler } from '../../src/index.js';
import {
  TEST_BITCOIN_BLOCKCHAIN_API,
  TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API,
  TEST_BITCOIN_EXTENDED_PRIVATE_KEY,
  TEST_BITCOIN_NETWORK,
  TEST_BITCOIN_WALLET_ACCOUNT_INDEX,
  TEST_FUNDING_PAYMENT_TYPE,
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
      TEST_FUNDING_PAYMENT_TYPE,
      TEST_BITCOIN_NETWORK,
      TEST_BITCOIN_BLOCKCHAIN_API,
      TEST_BITCOIN_BLOCKCHAIN_FEE_RECOMMENDATION_API
    );
  });

  it('should create a funding transaction', async () => {
    fundingTransaction = await dlcHandler.createFundingPSBT(
      TEST_VAULT,
      TEST_REGTEST_ATTESTOR_EXTENDED_GROUP_PUBLIC_KEY
    );

    const vaultAmount = TEST_VAULT.valueLocked.toBigInt();
    const feeAmount = vaultAmount / TEST_VAULT.btcMintFeeBasisPoints.toBigInt();

    const feeRecipientScript = p2wpkh(
      Buffer.from(TEST_VAULT.btcFeeRecipient, 'hex'),
      TEST_BITCOIN_NETWORK
    ).script;
    const multisigScript = dlcHandler.payment?.multisigPayment.script;

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

  it('should create a closing transaction', async () => {
    closingTransaction = await dlcHandler.createClosingPSBT(
      TEST_VAULT,
      signedFundingTransaction.id
    );

    const vaultAmount = TEST_VAULT.valueLocked.toBigInt();
    const feeAmount = vaultAmount / TEST_VAULT.btcMintFeeBasisPoints.toBigInt();

    const feeRecipientScript = p2wpkh(
      Buffer.from(TEST_VAULT.btcFeeRecipient, 'hex'),
      TEST_BITCOIN_NETWORK
    ).script;
    const userScript = dlcHandler.payment?.fundingPayment.script;

    const outputs = Array.from({ length: fundingTransaction.outputsLength }, (_, index) =>
      fundingTransaction.getOutput(index)
    );

    const userOutput = outputs.find(output => output.script?.toString() === userScript?.toString());
    const feeOutput = outputs.find(
      output => output.script?.toString() === feeRecipientScript.toString()
    );

    expect(closingTransaction).toBeDefined();
    expect(userOutput).toBeDefined();
    expect(feeOutput?.amount === feeAmount).toBeTruthy();
    expect(
      closingTransaction.getInput(0).witnessUtxo?.script.toString() ==
        dlcHandler.payment?.multisigPayment.script.toString()
    ).toBeTruthy();
  });

  it('should sign a closing transaction', async () => {
    partiallySignedClosingTransaction = dlcHandler.signPSBT(closingTransaction, 'closing');

    expect(closingTransaction.isFinal).toBeFalsy();
    expect(partiallySignedClosingTransaction).toBeDefined();
  });
});
