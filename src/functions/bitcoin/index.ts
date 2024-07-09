import {
  finalizeUserInputs,
  getFeeAmount,
  getFeeRecipientAddressFromPublicKey,
  getInputIndicesByScript,
} from '../bitcoin/bitcoin-functions.js';
import {
  broadcastTransaction,
  fetchBitcoinBlockchainBlockHeight,
  fetchBitcoinTransaction,
  getBalance,
} from '../bitcoin/bitcoin-request-functions.js';
import {
  createDepositTransaction,
  createFundingTransaction,
  createWithdrawTransaction,
} from '../bitcoin/psbt-functions.js';

export {
  createFundingTransaction,
  createDepositTransaction,
  createWithdrawTransaction,
  broadcastTransaction,
  fetchBitcoinBlockchainBlockHeight,
  fetchBitcoinTransaction,
  finalizeUserInputs,
  getFeeAmount,
  getBalance,
  getFeeRecipientAddressFromPublicKey,
  getInputIndicesByScript,
};
