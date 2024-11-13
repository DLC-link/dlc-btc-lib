import {
  finalizeUserInputs,
  getBitcoinAddressFromExtendedPublicKey,
  getFeeAmount,
  getFeeRecipientAddressFromPublicKey,
  getInputIndicesByScript,
  sendYield,
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
  sendYield,
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
  getBitcoinAddressFromExtendedPublicKey,
};
