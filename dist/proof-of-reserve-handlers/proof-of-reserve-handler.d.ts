/// <reference types="node" resolution-mode="require"/>
import { Network } from 'bitcoinjs-lib';
import { RawVault } from '../models/ethereum-models.js';
export declare class ProofOfReserveHandler {
    private bitcoinBlockchainAPI;
    private bitcoinNetwork;
    private attestorGroupPublicKey;
    constructor(bitcoinBlockchainAPI: string, bitcoinNetwork: Network, attestorGroupPublicKey: string);
    verifyVaultDeposit(vault: RawVault, attestorGroupPublicKey: Buffer, bitcoinBlockchainBlockHeight: number): Promise<boolean>;
    calculateProofOfReserve(vaults: RawVault[]): Promise<number>;
}
