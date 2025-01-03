export type AttestorChainID =
  | 'evm-mainnet'
  | 'evm-sepolia'
  | 'evm-arbitrum'
  | 'evm-arbsepolia'
  | 'evm-base'
  | 'evm-basesepolia'
  | 'evm-optimism'
  | 'evm-opsepolia'
  | 'evm-polygon'
  | 'evm-polygonsepolia'
  | 'evm-avax'
  | 'evm-bsc'
  | 'evm-localhost'
  | 'evm-hardhat-arb'
  | 'evm-hardhat-eth'
  | 'ripple-xrpl-mainnet'
  | 'ripple-xrpl-testnet'
  | 'ripple-xrpl-devnet';

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
