import { Decimal } from 'decimal.js';
import { BigNumber } from 'ethers';
import xrpl, {
  AccountNFTsRequest,
  AccountObject,
  AccountObjectsResponse,
  CheckCash,
  CreatedNode,
  IssuedCurrencyAmount,
  Payment,
  Request,
  SubmittableTransaction,
  TicketCreate,
  TransactionMetadata,
  decode,
} from 'xrpl';
import { NFTokenMintMetadata } from 'xrpl/dist/npm/models/transactions/NFTokenMint.js';

import { XRPL_DLCBTC_CURRENCY_HEX } from '../constants/ripple.constants.js';
import {
  checkRippleTransactionResult,
  connectRippleClient,
  decodeURI,
  encodeURI,
  getAllRippleVaults,
  getCheckByTXHash,
  getRippleVault,
  multiSignTransaction,
} from '../functions/ripple/ripple.functions.js';
import { RippleError } from '../models/errors.js';
import { RawVault, SSFVaultUpdate, SSPVaultUpdate } from '../models/ethereum-models.js';
import {
  AutoFillValues,
  MultisignatureTransactionResponse,
  SignResponse,
  XRPLSignatures,
} from '../models/ripple.model.js';
import { shiftValue, unshiftValue } from '../utilities/index.js';

function buildDefaultNftVault(): RawVault {
  return {
    uuid: `0x${'0'.repeat(64)}`,
    valueLocked: BigNumber.from(0),
    valueMinted: BigNumber.from(0),
    protocolContract: '',
    timestamp: BigNumber.from(0),
    creator: 'rfvtbrXSxLsxVWDktR4sdzjJgv8EnMKFKG',
    status: 0,
    fundingTxId: '0'.repeat(64),
    closingTxId: '',
    wdTxId: '0'.repeat(64),
    btcFeeRecipient: '03c9fc819e3c26ec4a58639add07f6372e810513f5d3d7374c25c65fdf1aefe4c5',
    btcMintFeeBasisPoints: BigNumber.from(100),
    btcRedeemFeeBasisPoints: BigNumber.from(100),
    taprootPubKey: '0'.repeat(64),
    icyIntegrationAddress: '',
  };
}

export class RippleHandler {
  private client: xrpl.Client;
  private wallet: xrpl.Wallet;
  private issuerAddress: string;
  private minSigners: number;

  private constructor(
    seedPhrase: string,
    issuerAddress: string,
    websocketURL: string,
    minSigners: number
  ) {
    this.client = new xrpl.Client(websocketURL, { timeout: 10000 });
    this.wallet = xrpl.Wallet.fromSeed(seedPhrase);
    this.issuerAddress = issuerAddress;
    this.minSigners = minSigners;
  }

  static fromSeed(
    seedPhrase: string,
    issuerAddress: string,
    websocketURL: string,
    minSigners: number
  ): RippleHandler {
    return new RippleHandler(seedPhrase, issuerAddress, websocketURL, minSigners);
  }

  async withConnectionMgmt<T>(callback: () => Promise<T>): Promise<T> {
    console.log('Connecting to the async service...');
    const newConnection = !this.client.isConnected();
    try {
      await connectRippleClient(this.client);
      console.log('calling the callback service...');
      const result = await callback();
      return result;
    } catch (error) {
      throw new RippleError(`Error while executing XRPL function: ${error}`);
    } finally {
      console.log('Disconnecting from the async service...');
      if (newConnection) {
        // only disconnect if we connected in this function, otherwise leave the connection open
        // This is to prevent closing a connection from an internally used function when the connection is still needed by the caller
        // For example, getSigUpdateVaultForSSP calls getRawVault internally, and both need the connection, so we can't close the connection when getRawVault finishes
        await this.client.disconnect();
      }
    }
  }

  async submit(xrplSignatures: XRPLSignatures[]): Promise<string> {
    return await this.withConnectionMgmt(async () => {
      try {
        const multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'mintNFT')!.signatures
        );

        const tx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(multisig_tx);
        const meta: NFTokenMintMetadata = tx.result.meta! as NFTokenMintMetadata;

        if (meta.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not burn temporary Ripple Vault: ${meta!.TransactionResult}`
          );
        }
        return tx.result.hash;
      } catch (error) {
        throw new RippleError(`Could not submit transaction: ${error}`);
      }
    });
  }

  async getNetworkInfo(): Promise<xrpl.ServerInfoResponse> {
    return await this.withConnectionMgmt(async () => {
      try {
        return await this.client.request({ command: 'server_info' });
      } catch (error) {
        throw new RippleError(`Could not fetch Network Info: ${error}`);
      }
    });
  }

  async getAddress(): Promise<string> {
    try {
      return this.wallet.classicAddress;
    } catch (error) {
      throw new RippleError(`Could not fetch Address Info: ${error}`);
    }
  }

  async getRawVault(uuid: string): Promise<RawVault> {
    return await this.withConnectionMgmt(async () => {
      try {
        return await getRippleVault(this.client, this.issuerAddress, uuid);
      } catch (error) {
        throw new RippleError(`Could not fetch Vault: ${error}`);
      }
    });
  }

  async submitCreateTicketTransaction(xrplSignatures: XRPLSignatures[]): Promise<string[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        const signedTransactionBlobs = xrplSignatures.find(
          sig => sig.signatureType === 'createTicket'
        )!.signatures;
        const multisignedTransaction = multiSignTransaction(signedTransactionBlobs);

        const submitCreateTicketTransactionResponse =
          await this.client.submitAndWait(multisignedTransaction);

        checkRippleTransactionResult(submitCreateTicketTransactionResponse);

        const meta = submitCreateTicketTransactionResponse.result.meta;

        if (!meta) {
          throw new RippleError('Transaction Metadata not found');
        }

        if (typeof meta === 'string') {
          throw new RippleError(`Could not read Transaction Result of: ${meta}`);
        }

        const createdNodes = (meta as TransactionMetadata<TicketCreate>).AffectedNodes.filter(
          (node): node is CreatedNode => 'CreatedNode' in node
        ).map(node => node.CreatedNode);

        const tickets = createdNodes.map(node => node.NewFields.TicketSequence).filter(Boolean);

        const decodedSignature: Record<string, unknown> = decode(multisignedTransaction);

        const ticketCount = (decodedSignature as unknown as TicketCreate).TicketCount;

        if (tickets.length !== ticketCount) {
          throw new RippleError(
            `Number of created tickets does not match the number of requested tickets. Requested: ${ticketCount}, Created: ${tickets.length}`
          );
        }

        return tickets as string[];
      } catch (error) {
        throw new RippleError(`Could not submit Ticket Transaction: ${error}`);
      }
    });
  }

  async createTicket(
    ticketCount: number,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        const createTicketRequest: TicketCreate = {
          TransactionType: 'TicketCreate',
          Account: this.issuerAddress,
          TicketCount: ticketCount,
        };

        const preparedCreateTicketTransaction = await this.client.autofill(
          createTicketRequest,
          this.minSigners
        );
        if (autoFillValues) {
          preparedCreateTicketTransaction.Fee = autoFillValues.Fee;
          preparedCreateTicketTransaction.LastLedgerSequence = autoFillValues.LastLedgerSequence;
          preparedCreateTicketTransaction.Sequence = autoFillValues.Sequence;
        } else {
          // set the LastLedgerSequence to be rounded up to the nearest 10000.
          // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
          // The request has a timeout, so this shouldn't end up being a hanging request
          // Using the ticket system would likely be a better way:
          // https://xrpl.org/docs/concepts/accounts/tickets
          preparedCreateTicketTransaction.LastLedgerSequence =
            Math.ceil(preparedCreateTicketTransaction.LastLedgerSequence! / 10000 + 1) * 10000;
        }

        console.log('preparedCreateTicketTransaction ', preparedCreateTicketTransaction);

        const createTicketTransactionSignature = this.wallet.sign(
          preparedCreateTicketTransaction,
          true
        ).tx_blob;

        return [
          {
            tx_blob: createTicketTransactionSignature,
            autoFillValues: {
              signatureType: 'createTicket',
              LastLedgerSequence: preparedCreateTicketTransaction.LastLedgerSequence!,
              Sequence: preparedCreateTicketTransaction.Sequence!,
              Fee: preparedCreateTicketTransaction.Fee!,
            },
          },
        ];
      } catch (error) {
        throw new RippleError(`Could not create Ticket: ${error}`);
      }
    });
  }

  async setupVault(
    uuid: string,
    userAddress: string,
    timeStamp: number,
    btcMintFeeBasisPoints: number,
    btcRedeemFeeBasisPoints: number,
    ticket: string,
    autoFillValues?: AutoFillValues[]
  ): Promise<MultisignatureTransactionResponse[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        const newVault = buildDefaultNftVault();
        newVault.uuid = uuid;
        newVault.creator = userAddress;
        newVault.timestamp = BigNumber.from(timeStamp);
        newVault.btcMintFeeBasisPoints = BigNumber.from(btcMintFeeBasisPoints);
        newVault.btcRedeemFeeBasisPoints = BigNumber.from(btcRedeemFeeBasisPoints);

        return [
          await this.mintNFT(
            newVault,
            ticket,
            autoFillValues?.find(sig => sig.signatureType === 'mintNFT')
          ),
        ];
      } catch (error) {
        throw new RippleError(`Could not setup Ripple Vault: ${error}`);
      }
    });
  }

  async withdraw(
    uuid: string,
    withdrawAmount: bigint,
    tickets: string[],
    autoFillValues: AutoFillValues[]
  ): Promise<MultisignatureTransactionResponse[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log(`Performing Withdraw from Vault: ${uuid}`);

        let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
        nftUUID = nftUUID.toUpperCase();
        const thisVault = await this.getRawVault(nftUUID);
        const burnSig = await this.burnNFT(
          nftUUID,
          tickets[0],
          autoFillValues.find(sig => sig.signatureType === 'burnNFT')
        );

        thisVault.valueMinted = thisVault.valueMinted.sub(BigNumber.from(withdrawAmount));
        const mintSig = await this.mintNFT(
          thisVault,
          tickets[1],
          autoFillValues.find(sig => sig.signatureType === 'mintNFT')
        );
        return [burnSig, mintSig];
      } catch (error) {
        throw new RippleError(`Unable to perform Withdraw for User: ${error}`);
      }
    });
  }

  async setVaultStatusFunded(xrplSignatures: XRPLSignatures[]): Promise<void> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log('Doing the burn for SSF');
        const burn_multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'burnNFT')!.signatures
        );
        const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(burn_multisig_tx);
        const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
        if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
          );
        }

        const mintTokensSignedTxBlobs = xrplSignatures.find(
          sig => sig.signatureType === 'mintToken'
        )!;
        if (mintTokensSignedTxBlobs) {
          console.log('Success! Now minting the actual tokens!! How fun $$');

          const mint_token_multisig_tx = xrpl.multisign(mintTokensSignedTxBlobs.signatures);
          const mintTokenTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
            await this.client.submitAndWait(mint_token_multisig_tx);
          const mintTokenMeta: NFTokenMintMetadata = mintTokenTx.result
            .meta! as NFTokenMintMetadata;
          if (mintTokenMeta!.TransactionResult !== 'tesSUCCESS') {
            throw new RippleError(
              `Could not mint tokens to user: ${mintTokenMeta!.TransactionResult}`
            );
          }
        } else {
          console.log('No need to mint tokens, because this was a withdraw flow SSF');
        }

        console.log('Success! Now Doing the mint for SSF');
        // multisig mint
        const mint_multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'mintNFT')!.signatures
        );
        const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(mint_multisig_tx);
        const mintMeta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
        if (mintMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not mint temporary Ripple Vault: ${mintMeta!.TransactionResult}`
          );
        }
      } catch (error) {
        throw new RippleError(`Unable to set Vault status to FUNDED: ${error}`);
      }
    });
  }

  async performCheckCashAndNftUpdate(xrplSignatures: XRPLSignatures[]): Promise<void> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log('Doing the check cashing');
        // multisig burn
        const cash_check_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'cashCheck')!.signatures
        );
        const cashCheckTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(cash_check_tx); // add timeouts
        const cashCheckMeta: NFTokenMintMetadata = cashCheckTx.result.meta! as NFTokenMintMetadata;
        if (cashCheckMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(`Could not cash check: ${cashCheckMeta!.TransactionResult}`);
        }

        console.log('Doing the burn for SSP');
        // multisig burn
        const burn_multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'burnNFT')!.signatures
        );
        const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(burn_multisig_tx); // add timeouts
        const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
        if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
          );
        }

        console.log('Success! Now Doing the mint for SSP');

        // multisig mint
        const mint_multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'mintNFT')!.signatures
        );
        const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(mint_multisig_tx); // add timeouts
        const mintMeta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
        if (mintMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not mint temporary Ripple Vault: ${mintMeta!.TransactionResult}`
          );
        }

        console.log('Success! Done with the mint for SSP');
      } catch (error) {
        throw new RippleError(`Unable to set Vault status to PENDING: ${error}`);
      }
    });
  }

  async setVaultStatusPending(xrplSignatures: XRPLSignatures[]): Promise<void> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log('Doing the burn for SSP');
        // multisig burn
        const burn_multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'burnNFT')!.signatures
        );
        const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(burn_multisig_tx);
        const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
        if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
          );
        }

        console.log('Success! Now Doing the mint for SSP');

        // multisig mint
        const mint_multisig_tx = xrpl.multisign(
          xrplSignatures.find(sig => sig.signatureType === 'mintNFT')!.signatures
        );
        const mintTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(mint_multisig_tx);
        const mintMeta: NFTokenMintMetadata = mintTx.result.meta! as NFTokenMintMetadata;
        if (mintMeta!.TransactionResult !== 'tesSUCCESS') {
          throw new RippleError(
            `Could not mint temporary Ripple Vault: ${mintMeta!.TransactionResult}`
          );
        }

        console.log('Success! Done with the mint for SSP');
      } catch (error) {
        throw new RippleError(`Unable to set Vault status to PENDING: ${error}`);
      }
    });
  }

  async getContractVaults(): Promise<RawVault[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        return await getAllRippleVaults(this.client, this.issuerAddress);
      } catch (error) {
        throw new RippleError(`Could not fetch All Vaults: ${error}`);
      }
    });
  }

  async getNFTokenIdForVault(uuid: string): Promise<string> {
    return await this.withConnectionMgmt(async () => {
      console.log(`Getting NFTokenId for vault: ${uuid}`);
      try {
        const getNFTsTransaction: AccountNFTsRequest = {
          command: 'account_nfts',
          account: this.issuerAddress,
          limit: 400,
        };

        const nfts: xrpl.AccountNFTsResponse = await this.client.request(getNFTsTransaction);
        const matchingNFT = nfts.result.account_nfts.find(
          nft => decodeURI(nft.URI!).uuid.slice(2) === uuid
        );

        if (!matchingNFT) {
          throw new RippleError(`Vault for uuid: ${uuid} not found`);
        }
        return matchingNFT.NFTokenID;
      } catch (error) {
        throw new RippleError(`Could not find NFTokenId for vault Vault: ${error}`);
      }
    });
  }

  async burnNFT(
    nftUUID: string,
    ticket: string,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log(`Getting sig for Burning Ripple Vault, vault: ${nftUUID}`);
        const nftTokenId = await this.getNFTokenIdForVault(nftUUID);
        const burnTransactionJson: SubmittableTransaction = {
          TransactionType: 'NFTokenBurn',
          TicketSequence: new Decimal(ticket).toNumber(),
          Sequence: 0,
          Account: this.issuerAddress,
          NFTokenID: nftTokenId,
        };

        // even if autofills are provided, we still need to use autofill to have all the fields filled in
        const preparedBurnTx = await this.client.autofill(burnTransactionJson, this.minSigners);
        if (autoFillValues) {
          preparedBurnTx.Fee = autoFillValues.Fee;
          preparedBurnTx.LastLedgerSequence = autoFillValues.LastLedgerSequence;
          preparedBurnTx.Sequence = autoFillValues.Sequence;
        } else {
          // set the LastLedgerSequence to be rounded up to the nearest 10000.
          // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
          // The request has a timeout, so this shouldn't end up being a hanging request
          // Using the ticket system would likely be a better way:
          // https://xrpl.org/docs/concepts/accounts/tickets
          preparedBurnTx.LastLedgerSequence =
            Math.ceil(preparedBurnTx.LastLedgerSequence! / 10000 + 1) * 10000;
        }

        console.log('preparedBurnTx ', preparedBurnTx);

        const burnTransactionSignature = this.wallet.sign(preparedBurnTx, true).tx_blob;
        console.log('burnTransactionSignature: ', burnTransactionSignature);

        return {
          tx_blob: burnTransactionSignature,
          autoFillValues: {
            signatureType: 'burnNFT',
            LastLedgerSequence: preparedBurnTx.LastLedgerSequence!,
            Sequence: preparedBurnTx.Sequence!,
            Fee: preparedBurnTx.Fee!,
          },
        };
      } catch (error) {
        throw new RippleError(`Could not burn Vault: ${error}`);
      }
    });
  }

  async mintNFT(
    vault: RawVault,
    ticket: string,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log(
          `Getting sig for Minting Ripple Vault, vault: ${JSON.stringify(vault, null, 2)}`
        );
        const newURI = encodeURI(vault);
        console.log('newURI: ', newURI);
        const mintTransactionJson: SubmittableTransaction = {
          TransactionType: 'NFTokenMint',
          TicketSequence: new Decimal(ticket).toNumber(),
          Sequence: 0,
          Account: this.issuerAddress,
          URI: newURI,
          NFTokenTaxon: 0,
        };

        // even if autofills are provided, we still need to use autofill to have all the fields filled in
        const preparedMintTx = await this.client.autofill(mintTransactionJson, this.minSigners);
        if (autoFillValues) {
          preparedMintTx.Fee = autoFillValues.Fee;
          preparedMintTx.LastLedgerSequence = autoFillValues.LastLedgerSequence;
          preparedMintTx.Sequence = autoFillValues.Sequence;
        } else {
          // set the LastLedgerSequence to be rounded up to the nearest 10000.
          // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
          // The request has a timeout, so this shouldn't end up being a hanging request
          // Using the ticket system would likely be a better way:
          // https://xrpl.org/docs/concepts/accounts/tickets
          preparedMintTx.LastLedgerSequence =
            Math.ceil(preparedMintTx.LastLedgerSequence! / 10000 + 1) * 10000;
        }

        console.log('preparedMintTx ', preparedMintTx);

        const mintTransactionSignature = this.wallet.sign(preparedMintTx, true).tx_blob;
        return {
          tx_blob: mintTransactionSignature,
          autoFillValues: {
            signatureType: 'mintNFT',
            LastLedgerSequence: preparedMintTx.LastLedgerSequence!,
            Sequence: preparedMintTx.Sequence!,
            Fee: preparedMintTx.Fee!,
          },
        };
      } catch (error) {
        throw new RippleError(`Could not mint Vault: ${error}`);
      }
    });
  }

  async getSigUpdateVaultForSSP(
    uuid: string,
    updates: SSPVaultUpdate,
    ticket: string,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log(`Getting sig for getSigUpdateVaultForSSP, vault uuid: ${uuid}`);
        const nftUUID = uuid;
        const thisVault = await this.getRawVault(nftUUID);

        const updatedVault = {
          ...thisVault,
          status: updates.status,
          wdTxId: updates.wdTxId,
          taprootPubKey: updates.taprootPubKey,
        };
        console.log(`the updated vault: `, updatedVault);
        return await this.mintNFT(updatedVault, ticket, autoFillValues);
      } catch (error) {
        throw new RippleError(`Could not update Vault: ${error}`);
      }
    });
  }

  async getSigUpdateVaultForSSF(
    uuid: string,
    updates: SSFVaultUpdate,
    ticket: string,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse> {
    return await this.withConnectionMgmt(async () => {
      try {
        const nftUUID = uuid;
        const thisVault = await this.getRawVault(nftUUID);
        const updatedVault = {
          ...thisVault,
          status: updates.status,
          fundingTxId: updates.fundingTxId,
          wdTxId: updates.wdTxId,
          valueMinted: BigNumber.from(updates.valueMinted),
          valueLocked: BigNumber.from(updates.valueLocked),
        };
        return await this.mintNFT(updatedVault, ticket, autoFillValues);
      } catch (error) {
        throw new RippleError(`Could not update Vault: ${error}`);
      }
    });
  }

  async getAllChecks(): Promise<AccountObject[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        const getAccountObjectsRequestJSON: Request = {
          command: 'account_objects',
          account: this.issuerAddress,
          ledger_index: 'validated',
          type: 'check',
        };

        const getAccountObjectsResponse: AccountObjectsResponse = await this.client.request(
          getAccountObjectsRequestJSON
        );

        return getAccountObjectsResponse.result.account_objects;
      } catch (error) {
        throw new RippleError(`Could not fetch Checks: ${error}`);
      }
    });
  }

  async getCashCheckAndWithdrawSignatures(
    txHash: string,
    tickets: string[],
    autoFillValues?: AutoFillValues[]
  ): Promise<MultisignatureTransactionResponse[]> {
    return await this.withConnectionMgmt(async () => {
      try {
        const check = await getCheckByTXHash(this.client, this.issuerAddress, txHash);
        const invoiceID = check.InvoiceID;

        if (!invoiceID) {
          throw new RippleError(`Could not find Invoice ID for Check with TX Hash: ${txHash}`);
        }

        const vault = await this.getRawVault(`0x${invoiceID}`.toLowerCase());

        if (!vault) {
          throw new RippleError(
            `Could not find Vault for Check with Invoice ID: ${check.InvoiceID}`
          );
        }

        const checkSendMax = check.SendMax as IssuedCurrencyAmount;

        const checkCashSignatures = await this.cashCheck(
          check.index,
          checkSendMax.value,
          tickets[0],
          autoFillValues?.find(sig => sig.signatureType === 'cashCheck')
        );

        const mintAndBurnSignatures = await this.withdraw(
          vault.uuid,
          BigInt(shiftValue(Number(checkSendMax.value))),
          tickets.slice(1),
          autoFillValues ?? []
        );
        return [checkCashSignatures, ...mintAndBurnSignatures];
      } catch (error) {
        throw new RippleError(`Could not get Cash Check and Withdraw Signatures: ${error}`);
      }
    });
  }

  async cashCheck(
    checkID: string,
    dlcBTCAmount: string,
    ticket: string,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse> {
    return await this.withConnectionMgmt(async () => {
      try {
        console.log(`Cashing Check of Check ID ${checkID} for an amount of ${dlcBTCAmount}`);

        const cashCheckTransactionJSON: CheckCash = {
          TransactionType: 'CheckCash',
          Account: this.issuerAddress,
          CheckID: checkID,
          TicketSequence: new Decimal(ticket).toNumber(),
          Sequence: 0,
          Amount: {
            currency: XRPL_DLCBTC_CURRENCY_HEX,
            value: dlcBTCAmount,
            issuer: this.issuerAddress,
          },
        };

        // even if autofills are provided, we still need to use autofill to have all the fields filled in
        const preparedCashCheckTx = await this.client.autofill(
          cashCheckTransactionJSON,
          this.minSigners
        );
        if (autoFillValues) {
          preparedCashCheckTx.Fee = autoFillValues.Fee;
          preparedCashCheckTx.LastLedgerSequence = autoFillValues.LastLedgerSequence;
          preparedCashCheckTx.Sequence = autoFillValues.Sequence;
        } else {
          // set the LastLedgerSequence to be rounded up to the nearest 10000.
          // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
          // The request has a timeout, so this shouldn't end up being a hanging request
          // Using the ticket system would likely be a better way:
          // https://xrpl.org/docs/concepts/accounts/tickets
          preparedCashCheckTx.LastLedgerSequence =
            Math.ceil(preparedCashCheckTx.LastLedgerSequence! / 10000 + 1) * 10000;
        }

        console.log('Issuer is about to sign the following cashCheck tx: ', preparedCashCheckTx);

        const signCashCheckTransactionSig: SignResponse = this.wallet.sign(
          preparedCashCheckTx,
          true
        );

        return {
          tx_blob: signCashCheckTransactionSig.tx_blob,
          autoFillValues: {
            signatureType: 'cashCheck',
            LastLedgerSequence: preparedCashCheckTx.LastLedgerSequence!,
            Sequence: preparedCashCheckTx.Sequence!,
            Fee: preparedCashCheckTx.Fee!,
          },
        };
      } catch (error) {
        throw new RippleError(`Could not cash Check: ${error}`);
      }
    });
  }

  async mintTokens(
    updatedValueMinted: number,
    destinationAddress: string,
    valueMinted: number,
    ticket: string,
    autoFillValues?: AutoFillValues
  ): Promise<MultisignatureTransactionResponse | undefined> {
    return await this.withConnectionMgmt(async () => {
      try {
        if (updatedValueMinted === 0 || valueMinted >= updatedValueMinted) {
          console.log('No need to mint tokens, because this is a withdraw SSF');
          return;
        }
        const mintValue = unshiftValue(
          new Decimal(updatedValueMinted).minus(valueMinted).toNumber()
        );
        const dlcBTCAmount = mintValue.toString();
        console.log(`Minting ${dlcBTCAmount} dlcBTC to ${destinationAddress} address`);

        const sendTokenTransactionJSON: Payment = {
          TransactionType: 'Payment',
          Account: this.issuerAddress,
          TicketSequence: new Decimal(ticket).toNumber(),
          Sequence: 0,
          Destination: destinationAddress,
          DestinationTag: 1,
          Amount: {
            currency: XRPL_DLCBTC_CURRENCY_HEX,
            value: dlcBTCAmount,
            issuer: this.issuerAddress,
          },
        };

        // even if autofills are provided, we still need to use autofill to have all the fields filled in
        const preparedSendTokenTx = await this.client.autofill(
          sendTokenTransactionJSON,
          this.minSigners
        );
        if (autoFillValues) {
          preparedSendTokenTx.Fee = autoFillValues.Fee;
          preparedSendTokenTx.LastLedgerSequence = autoFillValues.LastLedgerSequence;
          preparedSendTokenTx.Sequence = autoFillValues.Sequence;
        } else {
          // set the LastLedgerSequence to be rounded up to the nearest 10000.
          // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
          // The request has a timeout, so this shouldn't end up being a hanging request
          // Using the ticket system would likely be a better way:
          // https://xrpl.org/docs/concepts/accounts/tickets
          preparedSendTokenTx.LastLedgerSequence =
            Math.ceil(preparedSendTokenTx.LastLedgerSequence! / 10000 + 1) * 10000;
        }

        console.log('Issuer is about to sign the following mintTokens tx: ', preparedSendTokenTx);

        const signSendTokenTransactionResponse: SignResponse = this.wallet.sign(
          preparedSendTokenTx,
          true
        );

        return {
          tx_blob: signSendTokenTransactionResponse.tx_blob,
          autoFillValues: {
            signatureType: 'mintToken',
            LastLedgerSequence: preparedSendTokenTx.LastLedgerSequence!,
            Sequence: preparedSendTokenTx.Sequence!,
            Fee: preparedSendTokenTx.Fee!,
          },
        };
      } catch (error) {
        throw new RippleError(`Could not mint tokens: ${error}`);
      }
    });
  }
}
