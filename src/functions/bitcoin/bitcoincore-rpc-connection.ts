import Client from 'bitcoin-core';
import { all, isNil } from 'ramda';

export class BitcoinCoreRpcConnection {
  private host: string;
  private port: number;
  private username: string;
  private password: string;
  private client: Client;

  constructor(baseUrl: string, username: string, password: string, port: number) {
    if (all(isNil, [username, password, baseUrl])) {
      throw new Error(
        'Username, password and base url are required to connect to the Bitcoin Core RPC Server'
      );
    }
    this.host = baseUrl;
    this.username = username;
    this.password = password;
    this.port = port;

    this.client = new Client({
      host: this.host,
      username: this.username,
      password: this.password,
      port: this.port,
    });
  }

  public getClient(): Client {
    return this.client;
  }
}
