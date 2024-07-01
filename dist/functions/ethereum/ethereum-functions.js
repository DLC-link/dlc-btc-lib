import { Contract, providers } from 'ethers';
import { GITHUB_SOLIDITY_URL, dlcContractNames, ethereumArbitrum, ethereumArbitrumSepolia, } from '../../constants/ethereum-constants.js';
import { EthereumError } from '../../models/errors.js';
import { VaultState, } from '../../models/ethereum-models.js';
export async function fetchEthereumDeploymentPlan(contractName, ethereumNetwork, deploymentBranch, deploymentPlanRootURL) {
    const deploymentPlanURL = `${deploymentPlanRootURL}/${deploymentBranch}/deploymentFiles/${ethereumNetwork.name.toLowerCase()}/${contractName}.json`;
    try {
        const response = await fetch(deploymentPlanURL);
        if (!response.ok) {
            throw new Error(`Failed to fetch deployment. Received a non-OK response. Status: ${response.status} ${response.statusText}`);
        }
        const contractData = await response.json();
        return contractData;
    }
    catch (error) {
        throw new EthereumError(`Could not fetch deployment info for ${contractName}`);
    }
}
export async function fetchEthereumDeploymentPlansByNetwork(network) {
    try {
        let ethereumNetwork;
        let deploymentBranch;
        switch (network) {
            case 'arbitrum':
                ethereumNetwork = ethereumArbitrum;
                deploymentBranch = 'dev';
                break;
            case 'arbitrum-sepolia-testnet':
                ethereumNetwork = ethereumArbitrumSepolia;
                deploymentBranch = 'testnet-rolling';
                break;
            case 'arbitrum-sepolia-devnet':
                ethereumNetwork = ethereumArbitrumSepolia;
                deploymentBranch = 'dev';
                break;
            default:
                throw new Error('Unsupported Network');
        }
        return Promise.all(dlcContractNames.map(async (contractName) => {
            return await fetchEthereumDeploymentPlan(contractName, ethereumNetwork, deploymentBranch, GITHUB_SOLIDITY_URL);
        }));
    }
    catch (error) {
        throw new EthereumError(`Could not fetch Ethereum Deployment Plans: ${error}`);
    }
}
export function getProvider(rpcEndpoint) {
    if (rpcEndpoint.startsWith('http') || rpcEndpoint.startsWith('https')) {
        return new providers.JsonRpcProvider(rpcEndpoint);
    }
    else if (rpcEndpoint.startsWith('ws') || rpcEndpoint.startsWith('wss')) {
        return new providers.WebSocketProvider(rpcEndpoint);
    }
    else {
        throw new Error('Invalid RPC endpoint. It should start with either http, https, ws, or wss.');
    }
}
export function getEthereumontract(ethereumDeploymentPlans, contractName, signerOrProvider) {
    try {
        const contractDeploymentPlan = ethereumDeploymentPlans.find(plan => plan.contract.name === contractName);
        if (!contractDeploymentPlan) {
            throw new Error(`${contractName} Contract not found in Deployment Plans`);
        }
        return new Contract(contractDeploymentPlan.contract.address, contractDeploymentPlan.contract.abi, signerOrProvider);
    }
    catch (error) {
        throw new EthereumError(`Could not find ${contractName} Contract in Deployment Plans: ${error}`);
    }
}
export function getEthereumContracts(ethereumDeploymentPlans, signer) {
    const dlcManagerContract = getEthereumontract(ethereumDeploymentPlans, 'DLCManager', signer);
    const dlcBTCContract = getEthereumontract(ethereumDeploymentPlans, 'DLCBTC', signer);
    return { dlcManagerContract, dlcBTCContract };
}
export function getReadOnlyEthereumContracts(ethereumDeploymentPlans, readOnlyProvider) {
    const protocolContract = getEthereumontract(ethereumDeploymentPlans, 'TokenManager', readOnlyProvider);
    const dlcManagerContract = getEthereumontract(ethereumDeploymentPlans, 'DLCManager', readOnlyProvider);
    const dlcBTCContract = getEthereumontract(ethereumDeploymentPlans, 'DLCBTC', readOnlyProvider);
    return { protocolContract, dlcManagerContract, dlcBTCContract };
}
export async function getLockedBTCBalance(userVaults) {
    try {
        const fundedVaults = userVaults.filter(vault => vault.status === VaultState.FUNDED);
        const totalCollateral = fundedVaults.reduce((sum, vault) => sum + vault.valueLocked.toNumber(), 0);
        return totalCollateral;
    }
    catch (error) {
        throw new EthereumError(`Could not fetch locked BTC balance: ${error}`);
    }
}
