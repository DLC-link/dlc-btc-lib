export interface VaultEventPayload {
  name: VaultEvent;
  uuid: string;
  value?: number;
}

export enum VaultEvent {
  SETUP_COMPLETE = 'vaultSetup',
  WITHDRAW_PENDING = 'withdrawPending',
  MINT_PENDING = 'mintPending',
  MINT_COMPLETE = 'mintComplete',
  BURN_COMPLETE = 'burnComplete',
  WITHDRAW_COMPLETE = 'withdrawComplete',
}
