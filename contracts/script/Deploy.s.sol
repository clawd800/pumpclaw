// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import {PumpClawFactory} from "../src/core/PumpClawFactory.sol";
import {PumpClawLPLocker} from "../src/core/PumpClawLPLocker.sol";
import {PumpClawSwapRouter} from "../src/helpers/PumpClawSwapRouter.sol";

contract Deploy is Script {
    // Base mainnet addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;

    function run() external {
        // Use the designated admin address for fee collection
        address admin = 0x261368f0EC280766B84Bfa7a9B23FD53c774878D;
        
        vm.startBroadcast();

        // 1. Deploy LP Locker first
        PumpClawLPLocker locker = new PumpClawLPLocker(
            POSITION_MANAGER,
            admin
        );
        console2.log("PumpClawLPLocker deployed at:", address(locker));

        // 2. Deploy Factory (uses native ETH, no WETH)
        PumpClawFactory factory = new PumpClawFactory(
            POOL_MANAGER,
            POSITION_MANAGER,
            address(locker)
        );
        console2.log("PumpClawFactory deployed at:", address(factory));

        // 3. Deploy SwapRouter
        PumpClawSwapRouter router = new PumpClawSwapRouter(POOL_MANAGER);
        console2.log("PumpClawSwapRouter deployed at:", address(router));

        // 4. Link factory to locker
        locker.setFactory(address(factory));
        console2.log("Factory linked to locker");

        // Log config
        console2.log("Uses native ETH (no WETH wrapping)");
        console2.log("LP_FEE:", factory.LP_FEE());
        console2.log("PRICE_RANGE_MULTIPLIER:", factory.PRICE_RANGE_MULTIPLIER());

        vm.stopBroadcast();
    }
}
