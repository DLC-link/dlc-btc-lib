import { FundingTXAttestorInfo, WithdrawDepositTXAttestorInfo } from '../models/attestor.models.js';
import { AttestorError } from '../models/errors.js';

export class AttestorHandler {
  private attestorRootURLs: string[];

  constructor(attestorRootURLs: string[]) {
    this.attestorRootURLs = attestorRootURLs;
  }

  private async sendRequest(url: string, body: string): Promise<boolean | string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body,
    });
    if (!response.ok) {
      throw new AttestorError(`Attestor Response ${url} was not OK: ${response.statusText}`);
    }
    return true;
  }

  async submitFundingPSBT(fundingTXAttestorInfo: FundingTXAttestorInfo): Promise<void> {
    const fundingEndpoints = this.attestorRootURLs.map(url => `${url}/app/create-psbt-event`);

    const body = JSON.stringify({
      uuid: fundingTXAttestorInfo.vaultUUID,
      funding_transaction_psbt: fundingTXAttestorInfo.fundingPSBT,
      mint_address: fundingTXAttestorInfo.userEthereumAddress,
      chain: fundingTXAttestorInfo.attestorChainID,
      alice_pubkey: fundingTXAttestorInfo.userBitcoinTaprootPublicKey,
    });

    const attestorResponses: (boolean | string)[] = await Promise.all(
      fundingEndpoints.map(async url =>
        this.sendRequest(url, body)
          .then(response => response)
          .catch(error => error.message)
      )
    );

    if (attestorResponses.every(response => response !== true)) {
      throw new AttestorError(
        `Error sending [Funding] Transaction to Attestors:
          ${attestorResponses.join('| ')}`
      );
    }
  }

  async submitWithdrawDepositPSBT(
    withdrawDepositTXAttestorInfo: WithdrawDepositTXAttestorInfo
  ): Promise<void> {
    const depositWithdrawEndpoints = this.attestorRootURLs.map(url => `${url}/app/withdraw`);

    const body = JSON.stringify({
      uuid: withdrawDepositTXAttestorInfo.vaultUUID,
      wd_psbt: withdrawDepositTXAttestorInfo.depositWithdrawPSBT,
    });

    const attestorResponses: (boolean | string)[] = await Promise.all(
      depositWithdrawEndpoints.map(async url =>
        this.sendRequest(url, body)
          .then(response => response)
          .catch(error => error.message)
      )
    );

    if (attestorResponses.every(response => response !== true)) {
      throw new AttestorError(
        `Error sending [Deposit/Withdraw] Transaction to Attestors:
          ${attestorResponses.join('| ')}`
      );
    }
  }
}
