// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {PumpClawSwapRouter} from "../src/helpers/PumpClawSwapRouter.sol";

contract DeployRouter is Script {
    // Base mainnet addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;

    function run() external {
        vm.startBroadcast();

        PumpClawSwapRouter router = new PumpClawSwapRouter(POOL_MANAGER);
        console2.log("PumpClawSwapRouter deployed at:", address(router));

        vm.stopBroadcast();
    }
}
