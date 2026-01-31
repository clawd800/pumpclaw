// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {PumpClawFactoryV2} from "../src/core/PumpClawFactoryV2.sol";

contract DeployV2 is Script {
    // Base mainnet addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant LP_LOCKER = 0x5b23417DE66C7795bCB294c4e0BfaBd1c290d0f3; // Existing locker

    function run() external {
        vm.startBroadcast();

        PumpClawFactoryV2 factory = new PumpClawFactoryV2(
            POOL_MANAGER,
            POSITION_MANAGER,
            LP_LOCKER,
            WETH
        );

        console2.log("PumpClawFactoryV2 deployed at:", address(factory));
        console2.log("MIN_ETH:", factory.MIN_ETH());
        console2.log("DEFAULT_FDV:", factory.DEFAULT_FDV());

        vm.stopBroadcast();
    }
}
