export declare class AttestorHandler {
    private attestorRootURLs;
    private ethereumChainID;
    constructor(attestorRootURLs: string[], ethereumChainID: 'evm-arbitrum' | 'evm-arbsepolia' | 'evm-localhost');
    createPSBTEvent(vaultUUID: string, fundingTransactionPsbt: string, mintAddress: string, alicePubkey: string): Promise<void>;
    submitWithdrawRequest(vaultUUID: string, withdrawPSBT: string): Promise<void>;
}
