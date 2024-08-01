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

export interface PsbtEvent {
  closing_psbt: string;
  wd_psbt: string;
  mint_address: string;
  uuid: string;
  funding_txid: string;
  closing_txid: string;
  status: string;
  chain_name: string;
  user_pubkey: string;
}
