// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {RatingController} from "../src/RatingController.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

/// @notice Deploys RatingController; the broadcaster becomes `owner`.
contract RatingControllerScript is Script {
    function run() public returns (RatingController, HelperConfig) {
        HelperConfig helperConfig = new HelperConfig();
        address oracleAgent = helperConfig.getConfig().oracleAgent;

        vm.startBroadcast();
        RatingController controller = new RatingController(oracleAgent);
        vm.stopBroadcast();

        return (controller, helperConfig);
    }
}
