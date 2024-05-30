import Transport from '@ledgerhq/hw-transport-node-hid';
import { AppClient } from 'ledger-bitcoin';

import { LEDGER_APPS_MAP } from '../../constants/ledger-constants.js';
import { delay } from '../../utilities/index.js';

type TransportInstance = Awaited<ReturnType<typeof Transport.default.create>>;

export async function getLedgerApp(appName: string) {
  const transport = await Transport.default.create();
  const ledgerApp = new AppClient(transport);
  const appAndVersion = await ledgerApp.getAppAndVersion();
  ledgerApp.transport.close();

  if (appAndVersion.name === appName) {
    return new AppClient(await Transport.default.create());
  }

  if (appAndVersion.name === LEDGER_APPS_MAP.MAIN_MENU) {
    await openApp(await Transport.default.create(), appName);
    await delay(1500);
    return new AppClient(await Transport.default.create());
  }

  if (appAndVersion.name !== appName) {
    await quitApp(await Transport.default.create());
    await delay(1500);
    await openApp(await Transport.default.create(), appName);
    await delay(1500);
    return new AppClient(await Transport.default.create());
  }
}

// Reference: https://github.com/LedgerHQ/ledger-live/blob/v22.0.1/src/hw/quitApp.ts
async function quitApp(transport: TransportInstance): Promise<void> {
  await transport.send(0xb0, 0xa7, 0x00, 0x00);
}

// Reference: https://github.com/LedgerHQ/ledger-live/blob/v22.0.1/src/hw/openApp.ts
async function openApp(transport: TransportInstance, name: string): Promise<void> {
  await transport.send(0xe0, 0xd8, 0x00, 0x00, Buffer.from(name, 'ascii'));
}
