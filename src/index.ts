/** @format */

import dotenv from 'dotenv';
import { formatVaultsToDisplay, getAllVaults, setupEthereum } from './ethereum-functions.js';
import { showMenu } from './prompt-functions.js';

dotenv.config();

async function main() {
  try {
    const { ethereumContracts, ethereumNetworkName, ethereumUserAddress } = await setupEthereum();
    const { protocolContract, dlcBTCContract, dlcManagerContract } = ethereumContracts;
    await showMenu(protocolContract, ethereumNetworkName, ethereumUserAddress);

    // await runLedger();
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}

main();
