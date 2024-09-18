declare module 'bitcoin-core' {
  export = BitcoinCore;
  namespace BitcoinCore {
    class Client {
      constructor(options: {
        network?: 'mainnet' | 'testnet' | 'regtest';
        username: string;
        password: string;
        host?: string;
        port?: number;
        ssl?: boolean;
        timeout?: number;
      });

      command<T = any>(method: string, ...params: any[]): Promise<T>;
      getBlockCount(): Promise<number>;
      getBlock(blockhash: string): Promise<FetchedBlock>;
      getRawTransaction(txid: string): Promise<string>;
      sendRawTransaction(hex: string): Promise<string>;
      getBalance(bitcoinAddress: string): Promise<number>;
      listUnspent(): Promise<{ txid: string; vout: number; address: string; amount: number }[]>;
      estimateSmartFee(blocks: number): Promise<number>;
      validateAddress(userAddress: string): Promise<{ isvalid: boolean }>;
      // Add any additional method definitions you need
    }

    export default Client;
    export default FetchedRawTransaction;
    export default TxOut;

    export interface FetchedBlock {
      hash: string;
      confirmations: number;
      size: number;
      strippedsize: number;
      weight: number;
      height: number;
      version: number;
      versionHex: string;
      merkleroot: string;
      tx: string[]; // Array of transaction IDs (txids)
      time: number;
      mediantime: number;
      nonce: number;
      bits: string;
      difficulty: number;
      chainwork: string;
      previousblockhash?: string;
      nextblockhash?: string;
    }

    type DecodedRawTransaction = {
      txid: string;
      hash: string;
      size: number;
      vsize: number;
      version: number;
      locktime: number;
      vin: TxIn[];
      vout: TxOut[];
    };

    export interface FetchedRawTransaction extends DecodedRawTransaction {
      hex: string;
      blockhash: string;
      confirmations: number;
      time: number;
      blocktime: number;
    }

    export type TxIn = {
      txid: string;
      vout: number;
      scriptSig: {
        asm: string;
        hex: string;
      };
      txinwitness?: string[];
      sequence: number;
    };

    export type TxOut = {
      value: number;
      n: number;
      scriptPubKey: {
        asm: string;
        hex: string;
        reqSigs: number;
        type: string;
        addresses: string[];
      };
    };

    export type UTXO = {
      txid: string;
      vout: number;
      scriptPubkey: string;
      desc: string;
      amount: number;
      height: number;
      label: string;
    };
  }
}
