// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";

/// @notice Chain-specific constructor params for RatingController deploys.
contract HelperConfig is Script {
    error HelperConfig__UnsupportedChainId(uint256 chainId);

    struct NetworkConfig {
        address oracleAgent;
    }

    uint256 public constant ANVIL_CHAIN_ID = 31337;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;

    NetworkConfig public activeNetworkConfig;
    NetworkConfig private localNetworkConfig;

    constructor() {
        activeNetworkConfig = getConfig();
    }

    function getConfig() public returns (NetworkConfig memory) {
        return getConfigByChainId(block.chainid);
    }

    function getConfigByChainId(uint256 chainId) public returns (NetworkConfig memory) {
        if (chainId == BASE_SEPOLIA_CHAIN_ID) {
            return getBaseSepoliaConfig();
        }
        if (chainId == ANVIL_CHAIN_ID) {
            return getOrCreateAnvilConfig();
        }
        revert HelperConfig__UnsupportedChainId(chainId);
    }

    function getBaseSepoliaConfig() public view returns (NetworkConfig memory) {
        return NetworkConfig({oracleAgent: vm.envAddress("ORACLE_AGENT")});
    }

    function getOrCreateAnvilConfig() public returns (NetworkConfig memory) {
        if (localNetworkConfig.oracleAgent != address(0)) {
            return localNetworkConfig;
        }

        localNetworkConfig = NetworkConfig({oracleAgent: makeAddr("oracle")});
        return localNetworkConfig;
    }
}
