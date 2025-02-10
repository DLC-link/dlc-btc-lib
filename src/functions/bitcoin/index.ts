import {
  finalizeUserInputs,
  getBitcoinAddressFromExtendedPublicKey,
  getDerivedUnspendablePublicKeyCommittedToUUID,
  getFeeAmount,
  getFeeRecipientAddress,
  getInputIndicesByScript,
  getVaultFundingBitcoinAddress,
  getVaultOutputValueFromTransaction,
  getVaultPayment,
  isBitcoinAddress,
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
  isBitcoinAddress,
  createFundingTransaction,
  getDerivedUnspendablePublicKeyCommittedToUUID,
  getVaultFundingBitcoinAddress,
  createDepositTransaction,
  createWithdrawTransaction,
  broadcastTransaction,
  fetchBitcoinBlockchainBlockHeight,
  fetchBitcoinTransaction,
  finalizeUserInputs,
  getFeeAmount,
  getBalance,
  getFeeRecipientAddress,
  getInputIndicesByScript,
  getBitcoinAddressFromExtendedPublicKey,
  getVaultOutputValueFromTransaction,
  getVaultPayment,
};
