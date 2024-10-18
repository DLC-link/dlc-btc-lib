import { getAddress, signTransaction } from '@gemwallet/api';
import { ResponseType } from '@gemwallet/api/_constants/index.js';
import { CheckCreate, Client, TrustSet } from 'xrpl';

import { submitXRPLCheckToCash } from '../functions/attestor/attestor-request.functions.js';
import {
  checkRippleTransactionResult,
  connectRippleClient,
  createCheck,
  getDLCBTCBalance,
  getLockedBTCBalance,
  setTrustLine,
} from '../functions/ripple/ripple.functions.js';

export class GemXRPHandler {
  private xrpClient: Client;
  private issuerAddress: string;
  private userAddress: string;

  constructor(xrpClient: Client, issuerAddress: string, userAddress: string) {
    this.xrpClient = xrpClient;
    this.issuerAddress = issuerAddress;
    this.userAddress = userAddress;
  }

  public async getAddress(): Promise<string> {
    const getAddressResponse = await getAddress();

    if (getAddressResponse.type === ResponseType.Reject || !getAddressResponse.result) {
      throw new Error('Error getting Address');
    }
    return getAddressResponse.result.address;
  }

  public async setTrustLine(): Promise<void> {
    try {
      const trustLineRequest = await setTrustLine(
        this.xrpClient,
        this.userAddress,
        this.issuerAddress
      );

      if (!trustLineRequest) {
        console.error('TrustLine is already set');
        return;
      }
      const updatedTrustLineRequest: TrustSet = {
        ...trustLineRequest,
        Flags: 2147483648,
      };

      const signTrustLineResponse = await signTransaction({ transaction: updatedTrustLineRequest });

      if (
        signTrustLineResponse.type === ResponseType.Reject ||
        !signTrustLineResponse.result ||
        !signTrustLineResponse.result.signature
      ) {
        throw new Error('Error signing Trust Line');
      }

      const signedTrustLineRequest = signTrustLineResponse.result.signature;

      await connectRippleClient(this.xrpClient);

      const submitTrustLineRequestResponse =
        await this.xrpClient.submitAndWait(signedTrustLineRequest);

      console.log(`Response for submitted Transaction Request:`, submitTrustLineRequestResponse);

      checkRippleTransactionResult(submitTrustLineRequestResponse);
    } catch (error) {
      throw new Error(`Error setting Trust Line: ${error}`);
    }
  }

  public async createCheck(dlcBTCAmount: string, vaultUUID: string): Promise<CheckCreate> {
    try {
      const checkCreateRequest: CheckCreate = await createCheck(
        this.xrpClient,
        this.userAddress,
        this.issuerAddress,
        undefined,
        dlcBTCAmount,
        vaultUUID
      );

      const updatedCheckCreateRequest: CheckCreate = {
        ...checkCreateRequest,
        Flags: 2147483648,
      };

      return updatedCheckCreateRequest;
    } catch (error) {
      throw new Error(`Error creating Check: ${error}`);
    }
  }

  public async signAndSubmitCheck(checkCreateRequest: CheckCreate): Promise<string> {
    try {
      const signCheckCreateResponse = await signTransaction({
        transaction: checkCreateRequest,
      });

      if (
        signCheckCreateResponse.type === ResponseType.Reject ||
        !signCheckCreateResponse.result ||
        !signCheckCreateResponse.result.signature
      ) {
        throw new Error('Error signing Check Create');
      }

      const signedCheckCreateRequest = signCheckCreateResponse.result.signature;

      await connectRippleClient(this.xrpClient);

      const submitCheckCreateRequestResponse =
        await this.xrpClient.submitAndWait(signedCheckCreateRequest);

      console.log(`Response for submitted Transaction Request:`, submitCheckCreateRequestResponse);

      checkRippleTransactionResult(submitCheckCreateRequestResponse);

      return submitCheckCreateRequestResponse.result.hash;
    } catch (error) {
      throw new Error(`Error signing and submitting Check: ${error}`);
    }
  }

  public async sendCheckTXHash(coordinatorURL: string, checkTXHash: string): Promise<void> {
    try {
      await submitXRPLCheckToCash(coordinatorURL, checkTXHash);
    } catch (error) {
      throw new Error(`Error sending Check TX Hash to Attestors: ${error}`);
    }
  }
  public async getDLCBTCBalance(): Promise<number> {
    try {
      await connectRippleClient(this.xrpClient);
      return await getDLCBTCBalance(this.xrpClient, this.userAddress, this.issuerAddress);
    } catch (error) {
      throw new Error(`Error getting BTC Balance: ${error}`);
    }
  }

  public async getLockedBTCBalance(): Promise<number> {
    try {
      await connectRippleClient(this.xrpClient);
      return await getLockedBTCBalance(this.xrpClient, this.userAddress, this.issuerAddress);
    } catch (error) {
      throw new Error(`Error getting BTC Balance: ${error}`);
    }
  }
}
