/** @format */

import { runLedger } from './ledger_test.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  try {
    await runLedger();
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}

main();
