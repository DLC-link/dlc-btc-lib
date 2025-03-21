// import {
//   getStarknetAccount,
//   getStarknetContract,
//   mintTokens,
//   setMinterOnTokenContract,
// } from '../../src/functions/starknet/starknet.functions';
// import {
//   StarknetContract,
//   StarknetKeypairHandler,
// } from '../../src/network-handlers/starknet-keypair-handler';

// describe('Starknet Functions', () => {
//   describe('Starknet Keypair Handler', () => {
//     let handler: StarknetKeypairHandler;
//     it('should initialize the Starknet keypair handler', async () => {
//       handler = await StarknetKeypairHandler.create(
//         '0x01e8c6c17efa3a047506c0b1610bd188aa3e3dd6c5d9227549b65428de24de78',
//         '',
//         'http://localhost:5050',
//         {
//           [StarknetContract.VAULT_MANAGER]:
//             '0x55ae31e345940ad168780b637a2a829c07d3589c712264b1b87e80777521cd9',
//           [StarknetContract.STRK]:
//             '0x4718F5A0FC34CC1AF16A1CDEE98FFB20C31F5CD61D6AB07201858F4287C938D',
//           [StarknetContract.ETH]:
//             '0x49D36570D4E46F48E99674BD3FCC84644DDD6B96F7C741B1562B82F9E004DC7',
//           [StarknetContract.IBTC]:
//             '0x4da23a2b4bc101f5279a70b1c3e8132aed82872a195f3158126a1d2d8fcce3b',
//         }
//       );
//       // const deployerAccount = await getStarknetAccount(
//       //   'http://localhost:5050',
//       //   '0x064b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691',
//       //   ''
//       // );
//       // const managerContract = await getStarknetContract(
//       //   'http://localhost:5050',
//       //   '0x55ae31e345940ad168780b637a2a829c07d3589c712264b1b87e80777521cd9'
//       // );
//       // const tokenContract = await getStarknetContract(
//       //   'http://localhost:5050',
//       //   '0x4da23a2b4bc101f5279a70b1c3e8132aed82872a195f3158126a1d2d8fcce3b'
//       // );
//       // await setMinterOnTokenContract(
//       //   deployerAccount,
//       //   managerContract,
//       //   '0x01e8c6c17efa3a047506c0b1610bd188aa3e3dd6c5d9227549b65428de24de78'
//       // );
//       // await mintTokens(
//       //   handler.getAccount(),
//       //   tokenContract,
//       //   '0x01e8c6c17efa3a047506c0b1610bd188aa3e3dd6c5d9227549b65428de24de78',
//       //   '1000000000000000000'
//       // );
//       expect(handler).toBeDefined();
//     }, 100000000);
//     it('should get the balance of the starknet token', async () => {
//       const balance = await handler.getFeeTokenBalance(StarknetContract.STRK);
//       console.log('STRK balance', balance);
//       expect(balance).toBeDefined();
//     });
//     it('should get the balance of the eth token', async () => {
//       const balance = await handler.getFeeTokenBalance(StarknetContract.ETH);
//       console.log('ETH balance', balance);
//       expect(balance).toBeDefined();
//     });
//     it('should get the balance of the ibtc token', async () => {
//       const balance = await handler.getIBTCBalance();
//       console.log('IBTC balance', balance);
//       expect(balance).toBeDefined();
//     });
//     // it('should setup a new vault', async () => {
//     //   const vaultResult = await handler.setupVault();
//     //   console.log(
//     //     'Vault result',
//     //     vaultResult.events.map(event => event.data)
//     //   );
//     //   expect(vaultResult).toBeDefined();
//     // }, 100000000);
//     it('should fetch the vaults for the address', async () => {
//       const vaults = await handler.getVaultsForAddress();
//       console.log('Vaults', vaults);
//       expect(vaults).toBeDefined();
//     });
//     // it('should withdraw from the vault', async () => {
//     //   const vaultResult = await handler.withdraw(
//     //     '0x0000000000000000000000000000000000000000000000000000000000000000',
//     //     '1000000000000000000'
//     //   );
//     //   console.log('Vault result', vaultResult);
//     //   expect(vaultResult).toBeDefined();
//     // });
//   });
// });
