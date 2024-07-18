export type AttestorChainID =
  | 'evm-arbitrum'
  | 'evm-arbsepolia'
  | 'evm-localhost'
  | 'evm-hardhat-arb'
  | 'evm-hardhat-eth';

export interface FundingTXAttestorInfo {
  vaultUUID: string;
  fundingPSBT: string;
  userEthereumAddress: string;
  userBitcoinTaprootPublicKey: string;
  attestorChainID: AttestorChainID;
}

export interface WithdrawDepositTXAttestorInfo {
  vaultUUID: string;
  withdrawDepositPSBT: string;
}
