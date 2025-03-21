export enum EVMAttestorChainID {
  'evm-mainnet' = 'evm-mainnet',
  'evm-sepolia' = 'evm-sepolia',
  'evm-arbitrum' = 'evm-arbitrum',
  'evm-arbsepolia' = 'evm-arbsepolia',
  'evm-base' = 'evm-base',
  'evm-basesepolia' = 'evm-basesepolia',
  'evm-optimism' = 'evm-optimism',
  'evm-opsepolia' = 'evm-opsepolia',
  'evm-polygon' = 'evm-polygon',
  'evm-polygonsepolia' = 'evm-polygonsepolia',
  'evm-avax' = 'evm-avax',
  'evm-bsc' = 'evm-bsc',
  'evm-holesky' = 'evm-holesky',
  'evm-localhost' = 'evm-localhost',
  'evm-hardhat-arb' = 'evm-hardhat-arb',
  'evm-hardhat-eth' = 'evm-hardhat-eth',
  'evm-bsctestnet' = 'evm-bsctestnet',
}

export enum XRPLAttestorChainID {
  'ripple-xrpl-mainnet' = 'ripple-xrpl-mainnet',
  'ripple-xrpl-testnet' = 'ripple-xrpl-testnet',
  'ripple-xrpl-devnet' = 'ripple-xrpl-devnet',
}

export enum StarknetAttestorChainID {
  'starknet-mainnet' = 'starknet-mainnet',
  'starknet-testnet' = 'starknet-testnet',
  'starknet-localhost' = 'starknet-localhost',
}

export type AttestorChainID = EVMAttestorChainID | XRPLAttestorChainID | StarknetAttestorChainID;

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

export interface WhitelistItem {
  name: string;
  addresses: string[];
}

export interface SharedAttestorConfiguration {
  btcFeeRecipient: string;
  btcMintFeeBasisPoints: number;
  btcRedeemFeeBasisPoints: number;
  whitelist: WhitelistItem[];
}
