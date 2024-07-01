import { AttestorError } from '../models/errors.js';
export class AttestorHandler {
    attestorRootURLs;
    ethereumChainID;
    constructor(attestorRootURLs, ethereumChainID) {
        this.attestorRootURLs = attestorRootURLs;
        this.ethereumChainID = ethereumChainID;
    }
    async createPSBTEvent(vaultUUID, fundingTransactionPsbt, mintAddress, alicePubkey) {
        const createPSBTEndpoints = this.attestorRootURLs.map(url => `${url}/app/create-psbt-event`);
        const body = JSON.stringify({
            uuid: vaultUUID,
            funding_transaction_psbt: fundingTransactionPsbt,
            mint_address: mintAddress,
            chain: this.ethereumChainID,
            alice_pubkey: alicePubkey,
        });
        const requests = createPSBTEndpoints.map(async (url) => fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body,
        })
            .then(response => (response.ok ? true : response.statusText))
            .catch(error => error.message));
        const responses = await Promise.all(requests);
        const failedResponses = responses.filter(response => response !== true);
        if (failedResponses.length === createPSBTEndpoints.length) {
            throw new AttestorError(`Error sending Funding and Closing Transaction to Attestors: ${failedResponses.join(', ')}`);
        }
    }
    async submitWithdrawRequest(vaultUUID, withdrawPSBT) {
        const withdrawEndpoints = this.attestorRootURLs.map(url => `${url}/app/withdraw`);
        const body = JSON.stringify({
            uuid: vaultUUID,
            wd_psbt: withdrawPSBT,
        });
        const requests = withdrawEndpoints.map(async (url) => fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body,
        })
            .then(response => (response.ok ? true : response.statusText))
            .catch(error => error.message));
        const responses = await Promise.all(requests);
        const failedResponses = responses.filter(response => response !== true);
        if (failedResponses.length === withdrawEndpoints.length) {
            throw new AttestorError(`Error sending Withdraw Transaction to Attestors: ${failedResponses.join(', ')}`);
        }
    }
}
