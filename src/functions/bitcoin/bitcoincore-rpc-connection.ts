import Client from 'bitcoin-core';
import { all, isNil } from 'ramda';

export class BitcoinCoreRpcConnection {
  private baseUrl: string;
  private username: string;
  private password: string;
  private client: Client;

  constructor(baseUrl: string, username: string, password: string) {
    if (all(isNil, [username, password, baseUrl])) {
      throw new Error(
        'Username, password and base url are required to connect to the Bitcoin Core RPC Server'
      );
    }
    this.baseUrl = baseUrl;
    this.username = username;
    this.password = password;

    this.client = new Client({
      host: this.baseUrl,
      username: this.username,
      password: this.password,
    });
  }

  public getClient(): Client {
    return this.client;
  }
}
