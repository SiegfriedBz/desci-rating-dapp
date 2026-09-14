// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

////////////////////////////////////////////////////////////////////////////////
//                                                                            //
//                       HelperConfig — Forge Unit Tests                      //
//                                                                            //
//  Covers Anvil (31337) and Base Sepolia (84532) network config selection.   //
//  Groups: anvil | base sepolia | unsupported.                               //
//                                                                            //
////////////////////////////////////////////////////////////////////////////////

import {Test} from "forge-std/Test.sol";
import {HelperConfig} from "../script/HelperConfig.s.sol";

/// @dev Shared HelperConfig instance (constructed on Anvil / forge default chain).
abstract contract HelperConfigTestBase is Test {
    /*//////////////////////////////////////////////////////////////
                               FIXTURES
    //////////////////////////////////////////////////////////////*/

    HelperConfig internal helperConfig;

    /*//////////////////////////////////////////////////////////////
                                 SETUP
    //////////////////////////////////////////////////////////////*/

    function setUp() public virtual {
        helperConfig = new HelperConfig();
    }
}

/*//////////////////////////////////////////////////////////////
                           ANVIL (31337)
//////////////////////////////////////////////////////////////*/

contract HelperConfigAnvilTest is HelperConfigTestBase {
    function test_Constructor_UsesAnvilConfig() public {
        assertEq(block.chainid, helperConfig.ANVIL_CHAIN_ID());

        (address oracleAgent) = helperConfig.activeNetworkConfig();
        assertEq(oracleAgent, makeAddr("oracle"));
    }

    function test_GetConfig_ReturnsAnvilOracle() public {
        HelperConfig.NetworkConfig memory cfg = helperConfig.getConfig();
        assertEq(cfg.oracleAgent, makeAddr("oracle"));
    }

    function test_GetOrCreateAnvilConfig_CachesOracle() public {
        HelperConfig.NetworkConfig memory first = helperConfig.getOrCreateAnvilConfig();
        HelperConfig.NetworkConfig memory second = helperConfig.getOrCreateAnvilConfig();

        assertEq(first.oracleAgent, makeAddr("oracle"));
        assertEq(second.oracleAgent, first.oracleAgent);
    }
}

/*//////////////////////////////////////////////////////////////
                       BASE SEPOLIA (84532)
//////////////////////////////////////////////////////////////*/

contract HelperConfigBaseSepoliaTest is HelperConfigTestBase {
    function test_GetConfigByChainId_BaseSepolia() public {
        address expectedOracle = makeAddr("baseSepoliaOracle");
        vm.setEnv("ORACLE_AGENT", vm.toString(expectedOracle));

        HelperConfig.NetworkConfig memory cfg =
            helperConfig.getConfigByChainId(helperConfig.BASE_SEPOLIA_CHAIN_ID());

        assertEq(cfg.oracleAgent, expectedOracle);
    }

    function test_GetBaseSepoliaConfig() public {
        address expectedOracle = makeAddr("baseSepoliaOracle");
        vm.setEnv("ORACLE_AGENT", vm.toString(expectedOracle));

        HelperConfig.NetworkConfig memory cfg = helperConfig.getBaseSepoliaConfig();
        assertEq(cfg.oracleAgent, expectedOracle);
    }

    function test_Constructor_OnBaseSepolia() public {
        address expectedOracle = makeAddr("baseSepoliaOracle");
        vm.setEnv("ORACLE_AGENT", vm.toString(expectedOracle));
        vm.chainId(helperConfig.BASE_SEPOLIA_CHAIN_ID());

        HelperConfig baseHelper = new HelperConfig();
        (address oracleAgent) = baseHelper.activeNetworkConfig();
        assertEq(oracleAgent, expectedOracle);
    }
}

/*//////////////////////////////////////////////////////////////
                            UNSUPPORTED
//////////////////////////////////////////////////////////////*/

contract HelperConfigUnsupportedTest is HelperConfigTestBase {
    function test_GetConfigByChainId_RevertIf_Unsupported() public {
        uint256 unsupported = 1;
        vm.expectRevert(
            abi.encodeWithSelector(HelperConfig.HelperConfig__UnsupportedChainId.selector, unsupported)
        );
        helperConfig.getConfigByChainId(unsupported);
    }
}
