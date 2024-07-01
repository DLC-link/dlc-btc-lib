export var EthereumNetworkID;
(function (EthereumNetworkID) {
    EthereumNetworkID["ArbitrumSepolia"] = "421614";
    EthereumNetworkID["Arbitrum"] = "42161";
})(EthereumNetworkID || (EthereumNetworkID = {}));
export var VaultState;
(function (VaultState) {
    VaultState[VaultState["READY"] = 0] = "READY";
    VaultState[VaultState["FUNDED"] = 1] = "FUNDED";
    VaultState[VaultState["CLOSING"] = 2] = "CLOSING";
    VaultState[VaultState["CLOSED"] = 3] = "CLOSED";
    VaultState[VaultState["PENDING"] = 4] = "PENDING";
    VaultState[VaultState["FUNDING"] = 5] = "FUNDING";
})(VaultState || (VaultState = {}));
