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

export type SignatureType = 'cashCheck' | 'burnNFT' | 'mintNFT' | 'mintToken';

export interface MultisignatureTransactionResponse {
  tx_blob: string;
  autoFillValues: AutoFillValues;
}
