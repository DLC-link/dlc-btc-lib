import { convertStringToHex } from 'xrpl';

export const TRANSACTION_SUCCESS_CODE = 'tesSUCCESS';
export const XRPL_DLCBTC_CURRENCY_HEX = convertStringToHex('iBTC').padEnd(40, '0');
