export enum VaultEventName {
  SETUP_COMPLETE = 'vaultSetup',
  WITHDRAW_PENDING = 'withdrawPending',
  MINT_PENDING = 'mintPending',
  MINT_COMPLETE = 'mintComplete',
  BURN_COMPLETE = 'burnComplete',
  WITHDRAW_COMPLETE = 'withdrawComplete',
}

export class VaultEvent {
  public readonly name: VaultEventName;
  public readonly uuid: string;
  public readonly value?: number;

  constructor(name: VaultEventName, uuid: string, value?: number) {
    this.name = name;
    this.uuid = uuid;
    this.value = value;
  }
}
