import { isEmpty, join } from 'ramda';
import {
  FundingTXAttestorInfo,
  WithdrawDepositTXAttestorInfo,
} from 'src/models/attestor.models.js';
import { AttestorError } from 'src/models/errors.js';

export async function sendRequest(url: string, body: string): Promise<boolean | string> {
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

export async function submitFundingPSBT(
  attestorRootURLs: string[],
  fundingTXAttestorInfo: FundingTXAttestorInfo
): Promise<void> {
  if (isEmpty(attestorRootURLs)) {
    throw new AttestorError('No Attestor URLs provided');
  }

  const fundingEndpoints = attestorRootURLs.map(url => `${url}/app/create-psbt-event`);

  const body = JSON.stringify({
    uuid: fundingTXAttestorInfo.vaultUUID,
    funding_transaction_psbt: fundingTXAttestorInfo.fundingPSBT,
    mint_address: fundingTXAttestorInfo.userEthereumAddress,
    chain: fundingTXAttestorInfo.attestorChainID,
    alice_pubkey: fundingTXAttestorInfo.userBitcoinTaprootPublicKey,
  });

  const attestorResponses: (boolean | string)[] = await Promise.all(
    fundingEndpoints.map(async url =>
      sendRequest(url, body)
        .then(response => response)
        .catch(error => error.message)
    )
  );

  if (attestorResponses.every(response => response !== true)) {
    throw new AttestorError(
      `Error sending [Funding] Transaction to Attestors:
         ${join('|', attestorResponses)}`
    );
  }
}

export async function submitWithdrawDepositPSBT(
  attestorRootURLs: string[],
  withdrawDepositTXAttestorInfo: WithdrawDepositTXAttestorInfo
): Promise<void> {
  if (isEmpty(attestorRootURLs)) {
    throw new AttestorError('No Attestor URLs provided');
  }

  const depositWithdrawEndpoints = attestorRootURLs.map(url => `${url}/app/withdraw`);

  const body = JSON.stringify({
    uuid: withdrawDepositTXAttestorInfo.vaultUUID,
    wd_psbt: withdrawDepositTXAttestorInfo.depositWithdrawPSBT,
  });

  const attestorResponses: (boolean | string)[] = await Promise.all(
    depositWithdrawEndpoints.map(async url =>
      sendRequest(url, body)
        .then(response => response)
        .catch(error => error.message)
    )
  );

  if (attestorResponses.every(response => response !== true)) {
    throw new AttestorError(
      `Error sending [Deposit/Withdraw] Transaction to Attestors:
          ${join('|', attestorResponses)}`
    );
  }
}
