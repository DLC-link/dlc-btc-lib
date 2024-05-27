/** @format */

import dotenv from 'dotenv';
import { formatVaultsToDisplay, getAllVaults, setupEthereum } from './ethereum-functions.js';
import { showMenu } from './prompt-functions.js';
// import { createExtendedPublicKey } from './bitcoin-functions.js';
import { testnet } from 'bitcoinjs-lib/src/networks.js';
import { testCLI } from './non-binary-functions.js';

dotenv.config();

async function main() {
  try {
    // const { ethereumContracts, ethereumNetworkName, ethereumUserAddress } = await setupEthereum();
    // const { protocolContract, dlcBTCContract, dlcManagerContract } = ethereumContracts;
    // await showMenu(protocolContract, ethereumNetworkName, ethereumUserAddress);
    await testCLI(
      'tpubDCxafqK4v6UobS4i8giFRRdaDuMamE5UBJsE6bnpTUqKKFyXRDKCRARzMNzXSJSj4VBU54ahJ1b9YA6rBxBevnQu3vwFm6KnuQUUz2kpZtG'
    );
    // createExtendedPublicKey('0xe0ae55c4c5313e98844c1458a9790ca1e33b92143bf64597e713483397497315', testnet);
    // createExtendedPublicKey('0x801219b876413cef1b862e55c58fa2d69dc259f762b6013cd4983f250a7e0fc5', testnet);

    // await runLedger();
  } catch (error) {
    throw new Error(`Error: ${error}`);
  }
}

main();
