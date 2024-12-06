import { DLCHandlers } from '../constants/dlc-handler.constants.js';

export type DLCHandlerType = (typeof DLCHandlers)[keyof typeof DLCHandlers];
export type FundingPaymentType = 'wpkh' | 'tr';
export type PaymentType = 'funding' | 'multisig';
export type TransactionType = 'funding' | 'deposit' | 'withdraw';
