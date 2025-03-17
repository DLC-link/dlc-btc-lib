export interface VaultProofOfReserveData {
  amount: number;
  address: string;
}

export interface ProofOfReserveData {
  proofOfReserve: number;
  vaultAddresses: string[];
}
