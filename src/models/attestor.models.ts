export type AttestorChainID = 'evm-arbitrum' | 'evm-arbsepolia' | 'evm-localhost';

export interface FundingTXAttestorInfo {
  vaultUUID: string;
  fundingPSBT: string;
  userEthereumAddress: string;
  userBitcoinTaprootPublicKey: string;
  attestorChainID: AttestorChainID;
}

export interface WithdrawDepositTXAttestorInfo {
  vaultUUID: string;
  depositWithdrawPSBT: string;
}
