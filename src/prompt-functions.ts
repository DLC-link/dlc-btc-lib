/** @format */

// @ts-ignore
import prompts from 'prompts';
import { DisplayVault, Vault, VaultState } from './models/ethereum-models.js';
import { Contract } from 'ethers';
import {
  closeVault,
  formatVaultToDisplay,
  formatVaultsToDisplay,
  getAllVaults,
  getVault,
  setupEthereum,
  setupVault,
} from './ethereum-functions.js';
import { runLedger } from './ledger_test.js';

enum CommandChoices {
  SHOW_ALL_VAULTS = 'Show All Vaults',
  CREATE_VAULT = 'Create Vault',
  CLOSE_VAULT = 'Close Vault',
  FUND_VAULT = 'Fund Vault',
  HANDLE_VAULT = 'Handle Vault',
  SHOW_VAULT_DETAILS = 'Show Vault Details',
  MAIN_MENU = 'Main Menu',
  EXIT = 'Exit',
}

interface Command {
  command: CommandChoices;
  vaultUUID?: string;
  vaultState?: VaultState;
}

export async function showMenu(protocolContract: Contract, ethereumNetworkName: string, ethereumUserAddress: string) {
  try {
    let command = await selectFromMenu();
    do {
      if (command.command === CommandChoices.MAIN_MENU) {
        command = await selectFromMenu();
      } else if (command.command !== CommandChoices.EXIT) {
        command = await callFunctionByCommand(command, protocolContract, ethereumNetworkName, ethereumUserAddress);
      }
    } while (command.command !== CommandChoices.EXIT);

    if (command.command === CommandChoices.EXIT) {
      process.exit(0);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

export async function callFunctionByCommand(
  command: Command,
  protocolContract: Contract,
  ethereumNetworkName: string,
  ethereumUserAddress: string
): Promise<Command> {
  switch (command.command) {
    case CommandChoices.SHOW_ALL_VAULTS:
      return showAllVaults(protocolContract, ethereumUserAddress);
    case CommandChoices.CREATE_VAULT:
      return createVault(protocolContract, ethereumNetworkName);
    case CommandChoices.CLOSE_VAULT:
      return requestVaultClosing(protocolContract, ethereumNetworkName, command.vaultUUID!);
    case CommandChoices.FUND_VAULT:
      return fundVault();
    case CommandChoices.HANDLE_VAULT:
      return fetchVault(protocolContract, command.vaultUUID!, command.vaultState!);
    default:
      throw new Error('Invalid Command');
  }
}

export async function selectFromMenu(): Promise<Command> {
  const menuCommands = [CommandChoices.SHOW_ALL_VAULTS, CommandChoices.CREATE_VAULT, CommandChoices.EXIT];
  const menuChoices = menuCommands.map((command) => ({ title: command, value: command }));

  const selectCommand = await prompts({
    type: 'select',
    name: 'menuCommand',
    message: `What would you like to do?`,
    choices: menuChoices,
  });
  return { command: selectCommand.menuCommand };
}

export async function showAllVaults(protocolContract: Contract, ethereumUserAddress: string) {
  const userVaults = await getAllVaults(protocolContract, ethereumUserAddress);

  let displayFormattedVaults: DisplayVault[] = [];

  const filterVaults = await prompts({
    type: 'select',
    name: 'filter',
    message: 'Which Vaults would you like to see?',
    choices: [
      { title: 'All Vaults', value: 'All' },
      { title: 'Ready Vaults', value: VaultState.Ready },
      { title: 'Funded Vaults', value: VaultState.Funded },
      { title: 'Closing Vaults', value: VaultState.Closing },
      { title: 'Closed Vaults', value: VaultState.Closed },
    ],
  });

  console.log('Filtering Vaults', filterVaults.filter);
  if (filterVaults.filter === 'All') {
    displayFormattedVaults = formatVaultsToDisplay(userVaults);
  } else {
    displayFormattedVaults = formatVaultsToDisplay(userVaults.filter((vault) => vault.state === filterVaults.filter));
  }

  const selectVault = await prompts({
    type: 'select',
    name: 'vault',
    message: 'Select a Vault to View Actions or Go Back to Main Menu',
    oncancel: () => ({ command: CommandChoices.MAIN_MENU }),
    choices: displayFormattedVaults
      .map((vault: DisplayVault) => ({
        title: `UUID: ${vault.uuid} | State: ${vault.state} | Collateral: ${vault.collateral} BTC | Created At: ${vault.createdAt}`,
        value: vault.uuid,
      }))
      .concat({ title: 'Go Back to Main Menu', value: CommandChoices.MAIN_MENU }),
  });
  const choice = selectVault.vault;
  if (choice === CommandChoices.MAIN_MENU) {
    console.log('Going back to Main Menu');
    return { command: CommandChoices.MAIN_MENU };
  }
  const selectVaultIndex = userVaults.findIndex((vault) => vault.uuid === selectVault.vault);
  if (selectVaultIndex === -1) {
    throw new Error('Invalid Vault Selection');
  }

  return {
    command: CommandChoices.HANDLE_VAULT,
    vaultUUID: selectVault.vault,
    vaultState: userVaults[selectVaultIndex].state,
  };
}

export async function fetchVault(protocolContract: Contract, vaultUUID: string, vaultState: VaultState) {
  const vault = await getVault(protocolContract, vaultUUID, vaultState);
  const displayVault = formatVaultToDisplay(vault);

  let choices;

  switch (vault.state) {
    case VaultState.Ready:
      choices = [
        { title: 'Fund the Vault', value: { command: CommandChoices.FUND_VAULT } },
        { title: 'Show Vault Details', value: { command: CommandChoices.SHOW_VAULT_DETAILS } },
        { title: 'Go Back to Main Menu', value: { command: CommandChoices.MAIN_MENU } },
      ];
      break;
    case VaultState.Funded:
      choices = [
        {
          title: 'Close the Vault',
          value: { command: CommandChoices.CLOSE_VAULT, vaultUUID: vaultUUID, vaultState: vault.state },
        },
        { title: 'Show Vault Details', value: { command: CommandChoices.SHOW_VAULT_DETAILS } },
        { title: 'Go Back to Main Menu', value: { command: CommandChoices.MAIN_MENU } },
      ];
      break;
    case VaultState.Funding:
    case VaultState.Closing:
    case VaultState.Closed:
    default:
      choices = [
        { title: 'Show Vault Details', value: { command: CommandChoices.SHOW_VAULT_DETAILS } },
        { title: 'Go Back to Main Menu', value: { command: CommandChoices.MAIN_MENU } },
      ];
      break;
  }

  let choice;
  do {
    const selectAction = await prompts({
      type: 'select',
      name: 'vault',
      message: `Vault UUID: ${displayVault.uuid} is in state: ${displayVault.state}. What would you like to do?`,
      choices: choices,
    });

    choice = selectAction.vault;

    if (choice.command === CommandChoices.SHOW_VAULT_DETAILS) {
      console.log('Vault Details:', vault);
    }
  } while (choice.command === CommandChoices.SHOW_VAULT_DETAILS);

  return choice;
}

export async function createVault(protocolContract: Contract, ethereumNetworkName: string) {
  const typeBitcoinAmount = await prompts({
    type: 'number',
    name: 'value',
    message: 'How much dlcBTC would you like to mint?',
    min: 0.01,
    max: 1,
    increment: 0.01,
    float: true,
    validate: (value: number) => (value < 0.01 || value > 1 ? `You can only mint between 0.01 and 1 dlcBTC` : true),
  });

  if (!typeBitcoinAmount.value) {
    return { command: CommandChoices.MAIN_MENU };
  }

  const confirmBitcoinAmount = await prompts({
    type: 'confirm',
    name: 'value',
    message: `You are minting ${typeBitcoinAmount.value} dlcBTC. Confirm?`,
  });

  if (confirmBitcoinAmount.value === false) {
    return { command: CommandChoices.CREATE_VAULT };
  }

  const transactionReceipt: any = await setupVault(protocolContract, ethereumNetworkName, typeBitcoinAmount.value);

  if (!transactionReceipt) {
    throw new Error('Error while creating Vault');
  }

  const vaultUUID = transactionReceipt.events.find((event: any) => event.event === 'SetupVault').args[0];

  return { command: CommandChoices.HANDLE_VAULT, vaultUUID: vaultUUID, vaultState: VaultState.Ready };
}

export async function requestVaultClosing(protocolContract: Contract, ethereumNetworkName: string, vaultUUID: string) {
  const transactionReceipt = await closeVault(protocolContract, ethereumNetworkName, vaultUUID);

  if (!transactionReceipt) {
    throw new Error('Error while closing Vault');
  }

  return { command: CommandChoices.HANDLE_VAULT, vaultUUID: vaultUUID, vaultState: VaultState.Closing };
}

export async function fundVault() {
  await runLedger();

  return { command: CommandChoices.MAIN_MENU };
}
