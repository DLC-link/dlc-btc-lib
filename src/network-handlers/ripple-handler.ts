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
} from 'xrpl';
import { NFTokenMintMetadata } from 'xrpl/dist/npm/models/transactions/NFTokenMint.js';

import { XRPL_DLCBTC_CURRENCY_HEX } from '../constants/ripple.constants.js';
import {
  checkRippleTransactionResult,
  connectRippleClient,
  createTicket,
  decodeURI,
  encodeURI,
  getAllRippleVaults,
  getCheckByTXHash,
  getRippleVault,
  multiSignTransaction,
  signTransaction,
} from '../functions/ripple/ripple.functions.js';
import { RippleError } from '../models/errors.js';
import { RawVault, SSFVaultUpdate, SSPVaultUpdate } from '../models/ethereum-models.js';
import { shiftValue, unshiftValue } from '../utilities/index.js';

export interface SignResponse {
  tx_blob: string;
  hash: string;
}

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

  async disconnectClient(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      throw new RippleError(`Could not disconnect client: ${error}`);
    }
  }

  async submit(signatures: string[]): Promise<string> {
    try {
      await connectRippleClient(this.client);

      const multisig_tx = xrpl.multisign(signatures);

      const tx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(multisig_tx);
      const meta: NFTokenMintMetadata = tx.result.meta! as NFTokenMintMetadata;

      if (meta.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(`Could not burn temporary Ripple Vault: ${meta!.TransactionResult}`);
      }
      return tx.result.hash;
    } catch (error) {
      throw new RippleError(`Could not submit transaction: ${error}`);
    }
  }

  async getNetworkInfo(): Promise<xrpl.ServerInfoResponse> {
    try {
      await connectRippleClient(this.client);

      return await this.client.request({ command: 'server_info' });
    } catch (error) {
      throw new RippleError(`Could not fetch Network Info: ${error}`);
    }
  }

  async getAddress(): Promise<string> {
    try {
      await connectRippleClient(this.client);

      return this.wallet.classicAddress;
    } catch (error) {
      throw new RippleError(`Could not fetch Address Info: ${error}`);
    }
  }

  async getRawVault(uuid: string): Promise<RawVault> {
    try {
      await connectRippleClient(this.client);

      return await getRippleVault(this.client, this.issuerAddress, uuid);
    } catch (error) {
      throw new RippleError(`Could not fetch Vault: ${error}`);
    }
  }

  async createTicket(ticketAmount: number): Promise<TicketCreate> {
    try {
      await connectRippleClient(this.client);

      return await createTicket(this.client, this.issuerAddress, ticketAmount, this.minSigners);
    } catch (error) {
      throw new RippleError(`Could not create Ticket: ${error}`);
    }
  }

  async signTransaction(transaction: SubmittableTransaction): Promise<string> {
    try {
      const signedTransaction = await signTransaction(this.wallet, transaction);
      return signedTransaction.tx_blob;
    } catch (error) {
      throw new RippleError(`Could not sign Transaction: ${error}`);
    }
  }

  async submitCreateTicketTransaction(signedTransactionBlobs: string[]): Promise<string[]> {
    try {
      await connectRippleClient(this.client);

      const multisignedTransaction = multiSignTransaction(signedTransactionBlobs);

      const submitCreateTicketTransactionResponse =
        await this.client.submitAndWait(multisignedTransaction);

      checkRippleTransactionResult(submitCreateTicketTransactionResponse);

      let meta = submitCreateTicketTransactionResponse.result.meta;

      if (!meta) {
        throw new RippleError('Transaction Metadata not found');
      }

      if (typeof meta === 'string') {
        throw new RippleError(`Could not read Transaction Result of: ${meta}`);
      }

      meta = meta as TransactionMetadata<TicketCreate>;

      const affectedNodes = meta.AffectedNodes;
      const createdNodes = affectedNodes
        .filter((node): node is CreatedNode => 'CreatedNode' in node)
        .map(node => node.CreatedNode);

      return createdNodes.map(node => node.NewFields.TicketSequence) as string[];
    } catch (error) {
      throw new RippleError(`Could not submit Ticket Transaction: ${error}`);
    }
  }

  async setupVault(
    uuid: string,
    userAddress: string,
    timeStamp: number,
    btcMintFeeBasisPoints: number,
    btcRedeemFeeBasisPoints: number
  ): Promise<string> {
    try {
      await connectRippleClient(this.client);

      const newVault = buildDefaultNftVault();
      newVault.uuid = uuid;
      newVault.creator = userAddress;
      newVault.timestamp = BigNumber.from(timeStamp);
      newVault.btcMintFeeBasisPoints = BigNumber.from(btcMintFeeBasisPoints);
      newVault.btcRedeemFeeBasisPoints = BigNumber.from(btcRedeemFeeBasisPoints);
      return await this.mintNFT(newVault);
    } catch (error) {
      throw new RippleError(`Could not setup Ripple Vault: ${error}`);
    }
  }

  async withdraw(uuid: string, withdrawAmount: bigint): Promise<string[]> {
    // Things like withdraw and deposit should get the existing NFT vault
    // then burn the NFT, and mint a new one with the updated value
    // putting the UUID into the URI
    try {
      await connectRippleClient(this.client);

      console.log(`Performing Withdraw for User: ${uuid}`);
      let nftUUID = uuid.substring(0, 2) === '0x' ? uuid.slice(2) : uuid;
      nftUUID = nftUUID.toUpperCase();
      const thisVault = await this.getRawVault(nftUUID);
      const burnSig = await this.burnNFT(nftUUID, 1);

      thisVault.valueMinted = thisVault.valueMinted.sub(BigNumber.from(withdrawAmount));
      const mintSig = await this.mintNFT(thisVault, 2);
      return [burnSig, mintSig];
    } catch (error) {
      throw new RippleError(`Unable to perform Withdraw for User: ${error}`);
    }
  }

  async setVaultStatusFunded(
    burnNFTSignedTxBlobs: string[],
    mintTokensSignedTxBlobs: string[], // this can be a set of empty string is no tokens are being minted
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    try {
      await connectRippleClient(this.client);

      console.log('Doing the burn for SSF');
      const burn_multisig_tx = xrpl.multisign(burnNFTSignedTxBlobs);
      const burnTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(burn_multisig_tx);
      const burnMeta: NFTokenMintMetadata = burnTx.result.meta! as NFTokenMintMetadata;
      if (burnMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(
          `Could not burn temporary Ripple Vault: ${burnMeta!.TransactionResult}`
        );
      }

      // multisig mint
      if (mintTokensSignedTxBlobs.every(sig => sig !== '')) {
        console.log('Success! Now minting the actual tokens!! How fun $$');

        const mint_token_multisig_tx = xrpl.multisign(mintTokensSignedTxBlobs);
        const mintTokenTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
          await this.client.submitAndWait(mint_token_multisig_tx);
        const mintTokenMeta: NFTokenMintMetadata = mintTokenTx.result.meta! as NFTokenMintMetadata;
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
      const mint_multisig_tx = xrpl.multisign(mintNFTSignedTxBlobs);
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
  }

  async performCheckCashAndNftUpdate(
    cashCheckSignedTxBlobs: string[],
    burnNFTSignedTxBlobs: string[],
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    try {
      await connectRippleClient(this.client);

      console.log('Doing the check cashing');
      // multisig burn
      const cash_check_tx = xrpl.multisign(cashCheckSignedTxBlobs);
      const cashCheckTx: xrpl.TxResponse<xrpl.SubmittableTransaction> =
        await this.client.submitAndWait(cash_check_tx); // add timeouts
      const cashCheckMeta: NFTokenMintMetadata = cashCheckTx.result.meta! as NFTokenMintMetadata;
      if (cashCheckMeta!.TransactionResult !== 'tesSUCCESS') {
        throw new RippleError(`Could not cash check: ${cashCheckMeta!.TransactionResult}`);
      }

      console.log('Doing the burn for SSP');
      // multisig burn
      const burn_multisig_tx = xrpl.multisign(burnNFTSignedTxBlobs);
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
      const mint_multisig_tx = xrpl.multisign(mintNFTSignedTxBlobs);
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
  }

  async setVaultStatusPending(
    burnNFTSignedTxBlobs: string[],
    mintNFTSignedTxBlobs: string[]
  ): Promise<void> {
    try {
      await connectRippleClient(this.client);

      console.log('Doing the burn for SSP');
      // multisig burn
      const burn_multisig_tx = xrpl.multisign(burnNFTSignedTxBlobs);
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
      const mint_multisig_tx = xrpl.multisign(mintNFTSignedTxBlobs);
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
  }

  async getContractVaults(): Promise<RawVault[]> {
    try {
      await connectRippleClient(this.client);

      return await getAllRippleVaults(this.client, this.issuerAddress);
    } catch (error) {
      throw new RippleError(`Could not fetch All Vaults: ${error}`);
    }
  }

  async getNFTokenIdForVault(uuid: string): Promise<string> {
    console.log(`Getting NFTokenId for vault: ${uuid}`);
    try {
      await connectRippleClient(this.client);

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
  }

  async burnNFT(nftUUID: string, incrementBy: number = 0): Promise<string> {
    try {
      await connectRippleClient(this.client);

      console.log(`Getting sig for Burning Ripple Vault, vault: ${nftUUID}`);
      const nftTokenId = await this.getNFTokenIdForVault(nftUUID);
      const burnTransactionJson: SubmittableTransaction = {
        TransactionType: 'NFTokenBurn',
        Account: this.issuerAddress,
        NFTokenID: nftTokenId,
      };
      const preparedBurnTx = await this.client.autofill(burnTransactionJson, this.minSigners); // this hardcoded number should match the number of active signers

      // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
      // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
      preparedBurnTx.LastLedgerSequence =
        Math.ceil(preparedBurnTx.LastLedgerSequence! / 10000 + 1) * 10000; // Better way?!?

      if (incrementBy > 0) {
        preparedBurnTx.Sequence = preparedBurnTx.Sequence! + incrementBy;
      }

      console.log('preparedBurnTx ', preparedBurnTx);

      const sig = this.wallet.sign(preparedBurnTx, true);
      // console.log('tx_one_sig: ', sig);
      return sig.tx_blob;
    } catch (error) {
      throw new RippleError(`Could not burn Vault: ${error}`);
    }
  }

  async mintNFT(vault: RawVault, incrementBy: number = 0): Promise<string> {
    try {
      await connectRippleClient(this.client);

      console.log(`Getting sig for Minting Ripple Vault, vault: ${JSON.stringify(vault, null, 2)}`);
      const newURI = encodeURI(vault);
      console.log('newURI: ', newURI);
      const mintTransactionJson: SubmittableTransaction = {
        TransactionType: 'NFTokenMint',
        Account: this.issuerAddress,
        URI: newURI,
        NFTokenTaxon: 0,
      };
      const preparedMintTx = await this.client.autofill(mintTransactionJson, this.minSigners);

      // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
      // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
      preparedMintTx.LastLedgerSequence =
        Math.ceil(preparedMintTx.LastLedgerSequence! / 10000 + 1) * 10000;
      if (incrementBy > 0) {
        preparedMintTx.Sequence = preparedMintTx.Sequence! + incrementBy;
      }

      console.log('preparedMintTx ', preparedMintTx);

      const sig = this.wallet.sign(preparedMintTx, true);
      console.log('tx_one_sig: ', sig);
      return sig.tx_blob;
    } catch (error) {
      throw new RippleError(`Could not mint Vault: ${error}`);
    }
  }

  async getSigUpdateVaultForSSP(uuid: string, updates: SSPVaultUpdate): Promise<string> {
    try {
      await connectRippleClient(this.client);

      console.log(`Getting sig for getSigUpdateVaultForSSP, vault uuid: ${uuid}`);
      const nftUUID = uuid;
      const thisVault = await this.getRawVault(nftUUID);
      console.log(`the vault, vault: `, thisVault);
      const updatedVault = {
        ...thisVault,
        status: updates.status,
        wdTxId: updates.wdTxId,
        taprootPubKey: updates.taprootPubKey,
      };
      console.log(`the updated vault, vault: `, updatedVault);
      return await this.mintNFT(updatedVault, 1);
    } catch (error) {
      throw new RippleError(`Could not update Vault: ${error}`);
    }
  }

  async getSigUpdateVaultForSSF(
    uuid: string,
    updates: SSFVaultUpdate,
    updateSequenceBy: number
  ): Promise<string> {
    try {
      await connectRippleClient(this.client);

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
      return await this.mintNFT(updatedVault, updateSequenceBy);
    } catch (error) {
      throw new RippleError(`Could not update Vault: ${error}`);
    }
  }

  async getAllChecks(): Promise<AccountObject[]> {
    try {
      await connectRippleClient(this.client);

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
  }

  async getCashCheckAndWithdrawSignatures(txHash: string): Promise<string[]> {
    try {
      await connectRippleClient(this.client);

      const check = await getCheckByTXHash(this.client, this.issuerAddress, txHash);
      const invoiceID = check.InvoiceID;

      if (!invoiceID) {
        throw new RippleError(`Could not find Invoice ID for Check with TX Hash: ${txHash}`);
      }

      const vault = await this.getRawVault(`0x${invoiceID}`.toLowerCase());

      if (!vault) {
        throw new RippleError(`Could not find Vault for Check with Invoice ID: ${check.InvoiceID}`);
      }

      const checkSendMax = check.SendMax as IssuedCurrencyAmount;

      const checkCashSignatures = await this.cashCheck(check.index, checkSendMax.value);

      const mintAndBurnSignatures = await this.withdraw(
        vault.uuid,
        BigInt(shiftValue(Number(checkSendMax.value)))
      );
      return [checkCashSignatures, ...mintAndBurnSignatures];
    } catch (error) {
      throw new RippleError(`Could not get Cash Check and Withdraw Signatures: ${error}`);
    }
  }

  async cashCheck(checkID: string, dlcBTCAmount: string): Promise<string> {
    try {
      await connectRippleClient(this.client);

      console.log(`Cashing Check of Check ID ${checkID} for an amount of ${dlcBTCAmount}`);

      const cashCheckTransactionJSON: CheckCash = {
        TransactionType: 'CheckCash',
        Account: this.issuerAddress,
        CheckID: checkID,
        Amount: {
          currency: XRPL_DLCBTC_CURRENCY_HEX,
          value: dlcBTCAmount,
          issuer: this.issuerAddress,
        },
      };

      const updatedCashCheckTransactionJSON: CheckCash = await this.client.autofill(
        cashCheckTransactionJSON,
        this.minSigners
      );

      // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
      // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
      updatedCashCheckTransactionJSON.LastLedgerSequence =
        Math.ceil(updatedCashCheckTransactionJSON.LastLedgerSequence! / 10000 + 1) * 10000;

      console.log(
        'Issuer is about to sign the following cashCheck tx: ',
        updatedCashCheckTransactionJSON
      );

      const signCashCheckTransactionSig: SignResponse = this.wallet.sign(
        updatedCashCheckTransactionJSON,
        true
      );

      return signCashCheckTransactionSig.tx_blob;
    } catch (error) {
      throw new RippleError(`Could not cash Check: ${error}`);
    }
  }

  async mintTokens(
    updatedValueMinted: number,
    destinationAddress: string,
    valueMinted: number,
    incrementBy: number = 0
  ): Promise<string> {
    try {
      await connectRippleClient(this.client);

      if (updatedValueMinted === 0 || valueMinted >= updatedValueMinted) {
        console.log('No need to mint tokens, because this is a withdraw SSF');
        return '';
      }
      const mintValue = unshiftValue(new Decimal(updatedValueMinted).minus(valueMinted).toNumber());
      const dlcBTCAmount = mintValue.toString();
      console.log(`Minting ${dlcBTCAmount} dlcBTC to ${destinationAddress} address`);

      const sendTokenTransactionJSON: Payment = {
        TransactionType: 'Payment',
        Account: this.issuerAddress,
        Destination: destinationAddress,
        DestinationTag: 1,
        Amount: {
          currency: XRPL_DLCBTC_CURRENCY_HEX,
          value: dlcBTCAmount,
          issuer: this.issuerAddress,
        },
      };

      const updatedSendTokenTransactionJSON: Payment = await this.client.autofill(
        sendTokenTransactionJSON,
        this.minSigners
      );

      // set the LastLedgerSequence to equal LastLedgerSequence plus 5 and then rounded up to the nearest 10
      // this is to ensure that the transaction is valid for a while, and that the different attestors all use a matching LLS value to have matching sigs
      updatedSendTokenTransactionJSON.LastLedgerSequence =
        Math.ceil(updatedSendTokenTransactionJSON.LastLedgerSequence! / 10000 + 1) * 10000;

      if (incrementBy > 0) {
        updatedSendTokenTransactionJSON.Sequence =
          updatedSendTokenTransactionJSON.Sequence! + incrementBy;
      }

      console.log(
        'Issuer is about to sign the following mintTokens tx: ',
        updatedSendTokenTransactionJSON
      );

      const signSendTokenTransactionResponse: SignResponse = this.wallet.sign(
        updatedSendTokenTransactionJSON,
        true
      );

      return signSendTokenTransactionResponse.tx_blob;
    } catch (error) {
      throw new RippleError(`Could not mint tokens: ${error}`);
    }
  }
}
