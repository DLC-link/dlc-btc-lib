export interface SignResponse {
  tx_blob: string;
  hash: string;
}

export interface AutoFillValues {
  signatureType: SignatureType;
  LastLedgerSequence: number;
  Sequence: number;
  Fee: string;
}

export type SignatureType = 'cashCheck' | 'burnNFT' | 'mintNFT' | 'mintToken' | 'createTicket';

export interface XRPLSignatures {
  signatureType: SignatureType;
  signatures: string[];
}

export interface MultisignatureTransactionResponse {
  tx_blob: string;
  autoFillValues: AutoFillValues;
}

export interface XRPLAccountBalanceAndReserveData {
  balance: number;
  availableBalance: number;
  ownerCount: number;
  baseReserve: number;
  ownerReserve: number;
  totalReserve: number;
}
