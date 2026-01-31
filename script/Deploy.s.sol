// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {PumpClawLPLocker} from "../src/core/PumpClawLPLocker.sol";
import {PumpClawFactory} from "../src/core/PumpClawFactory.sol";

contract DeployScript is Script {
    // Base mainnet addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    function run() external {
        // Admin address provided
        address admin = 0x261368f0EC280766B84Bfa7a9B23FD53c774878D;
        
        uint256 deployerPrivateKey = vm.envUint("BASE_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy LPLocker
        PumpClawLPLocker locker = new PumpClawLPLocker(POSITION_MANAGER, admin);
        console2.log("LPLocker deployed at:", address(locker));

        // 2. Deploy Factory
        PumpClawFactory factory = new PumpClawFactory(
            POOL_MANAGER,
            POSITION_MANAGER,
            address(locker),
            WETH
        );
        console2.log("Factory deployed at:", address(factory));

        // 3. Link locker to factory (CRITICAL!)
        locker.setFactory(address(factory));
        console2.log("Factory linked to locker");

        vm.stopBroadcast();

        // Summary
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("Admin:", admin);
        console2.log("LPLocker:", address(locker));
        console2.log("Factory:", address(factory));
    }
}
