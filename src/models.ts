/** @format */

export interface BitGoAddress {
  id: string;
  address: string;
  chain: number;
  index: number;
  coin: string;
  wallet: string;
  label: string;
  coinSpecific: Record<string, unknown>;
}
