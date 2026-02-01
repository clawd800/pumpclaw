// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {PumpClawFactory} from "../src/core/PumpClawFactory.sol";
import {PumpClawLPLocker} from "../src/core/PumpClawLPLocker.sol";

contract Deploy is Script {
    // Base mainnet addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant WETH = 0x4200000000000000000000000000000000000006;

    function run() external {
        address admin = msg.sender;
        
        vm.startBroadcast();

        // 1. Deploy LP Locker first
        PumpClawLPLocker locker = new PumpClawLPLocker(
            POSITION_MANAGER,
            admin
        );
        console2.log("PumpClawLPLocker deployed at:", address(locker));

        // 2. Deploy Factory with the new locker
        PumpClawFactory factory = new PumpClawFactory(
            POOL_MANAGER,
            POSITION_MANAGER,
            address(locker),
            WETH
        );
        console2.log("PumpClawFactory deployed at:", address(factory));

        // 3. Link factory to locker
        locker.setFactory(address(factory));
        console2.log("Factory linked to locker");

        // Log config
        console2.log("LP_FEE:", factory.LP_FEE());
        console2.log("PRICE_RANGE_MULTIPLIER:", factory.PRICE_RANGE_MULTIPLIER());

        vm.stopBroadcast();
    }
}
