import Xrp from '@ledgerhq/hw-app-xrp';
import { encode } from 'ripple-binary-codec';
import { CheckCreate, Client, Transaction, TrustSet } from 'xrpl';

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

  constructor(
    ledgerApp: Xrp.default,
    derivationPath: string,
    xrpClient: Client,
    issuerAddress: string
  ) {
    this.ledgerApp = ledgerApp;
    this.derivationPath = derivationPath;
    this.xrpClient = xrpClient;
    this.issuerAddress = issuerAddress;
  }

  public async getAddress(): Promise<string> {
    const address = await this.ledgerApp.getAddress(this.derivationPath);
    return address.address;
  }

  public async setTrustLine(): Promise<void> {
    try {
      const deviceData = await this.ledgerApp.getAddress(this.derivationPath);

      const trustLineRequest = await setTrustLine(
        this.xrpClient,
        deviceData.address,
        this.issuerAddress
      );

      if (!trustLineRequest) {
        console.error('TrustLine is already set');
        return;
      }
      const updatedTrustLineRequest: TrustSet = {
        ...trustLineRequest,
        Flags: 2147483648,
        SigningPubKey: deviceData.publicKey.toUpperCase(),
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

  public async createCheck(dlcBTCAmount: string, vaultUUID: string): Promise<void> {
    try {
      const deviceData = await this.ledgerApp.getAddress(this.derivationPath);

      const checkCreateRequest: CheckCreate = await createCheck(
        this.xrpClient,
        deviceData.address,
        this.issuerAddress,
        undefined,
        dlcBTCAmount,
        vaultUUID
      );

      const updatedCheckCreateRequest: CheckCreate = {
        ...checkCreateRequest,
        Flags: 2147483648,
        SigningPubKey: deviceData.publicKey.toUpperCase(),
      };

      const encodedCheckCreateRequest = encode(updatedCheckCreateRequest);

      const signature = await this.ledgerApp.signTransaction(
        this.derivationPath,
        encodedCheckCreateRequest
      );

      const signedCheckCreateRequest: Transaction = {
        ...updatedCheckCreateRequest,
        TxnSignature: signature,
      };

      await connectRippleClient(this.xrpClient);

      const submitCheckCreateRequestResponse =
        await this.xrpClient.submitAndWait(signedCheckCreateRequest);

      console.log(`Response for submitted Transaction Request:`, submitCheckCreateRequestResponse);

      checkRippleTransactionResult(submitCheckCreateRequestResponse);
    } catch (error) {
      throw new Error(`Error creating Check: ${error}`);
    }
  }

  public async getDLCBTCBalance(): Promise<number> {
    try {
      const deviceData = await this.ledgerApp.getAddress(this.derivationPath);

      return await getDLCBTCBalance(this.xrpClient, deviceData.address, this.issuerAddress);
    } catch (error) {
      throw new Error(`Error getting BTC Balance: ${error}`);
    }
  }

  public async getLockedBTCBalance(): Promise<number> {
    try {
      const deviceData = await this.ledgerApp.getAddress(this.derivationPath);

      return await getLockedBTCBalance(this.xrpClient, deviceData.address, this.issuerAddress);
    } catch (error) {
      throw new Error(`Error getting BTC Balance: ${error}`);
    }
  }
}
