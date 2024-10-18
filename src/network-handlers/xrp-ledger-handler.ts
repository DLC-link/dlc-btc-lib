import * as Xrp from '@ledgerhq/hw-app-xrp';
import { encode } from 'ripple-binary-codec';
import { CheckCreate, Client, Transaction, TrustSet } from 'xrpl';

import { submitXRPLCheckToCash } from '../functions/attestor/attestor-request.functions.js';
import {
  checkRippleTransactionResult,
  connectRippleClient,
  createCheck,
  getDLCBTCBalance,
  getLockedBTCBalance,
  setTrustLine,
} from '../functions/ripple/ripple.functions.js';

export class LedgerXRPHandler {
  private ledgerApp: Xrp.default;
  private derivationPath: string;
  private xrpClient: Client;
  private issuerAddress: string;
  private userAddress: string;
  private publicKey: string;

  constructor(
    ledgerApp: Xrp.default,
    derivationPath: string,
    xrpClient: Client,
    issuerAddress: string,
    userAddress: string,
    publicKey: string
  ) {
    this.ledgerApp = ledgerApp;
    this.derivationPath = derivationPath;
    this.xrpClient = xrpClient;
    this.issuerAddress = issuerAddress;
    this.userAddress = userAddress;
    this.publicKey = publicKey;
  }

  public async getAddress(): Promise<string> {
    const address = await this.ledgerApp.getAddress(this.derivationPath);
    return address.address;
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
        SigningPubKey: this.publicKey.toUpperCase(),
      };

      const encodedTrustLineRequest = encode(updatedTrustLineRequest);

      const signature = await this.ledgerApp.signTransaction(
        this.derivationPath,
        encodedTrustLineRequest
      );
      console.log('Signature:', signature);

      const signedTrustLineRequest: TrustSet = {
        ...updatedTrustLineRequest,
        TxnSignature: signature,
      };

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
        SigningPubKey: this.publicKey.toUpperCase(),
      };

      return updatedCheckCreateRequest;
    } catch (error) {
      throw new Error(`Error creating Check: ${error}`);
    }
  }

  public async signAndSubmitCheck(checkCreateRequest: CheckCreate): Promise<string> {
    try {
      const encodedCheckCreateRequest = encode(checkCreateRequest);

      const signature = await this.ledgerApp.signTransaction(
        this.derivationPath,
        encodedCheckCreateRequest
      );

      const signedCheckCreateRequest: Transaction = {
        ...checkCreateRequest,
        TxnSignature: signature,
      };

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
