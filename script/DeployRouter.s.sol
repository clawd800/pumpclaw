// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {PumpClawSwapRouter} from "../src/helpers/PumpClawSwapRouter.sol";

contract DeployRouterScript is Script {
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("BASE_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        PumpClawSwapRouter router = new PumpClawSwapRouter(POOL_MANAGER, WETH);
        console2.log("PumpClawSwapRouter deployed at:", address(router));
        
        vm.stopBroadcast();
    }
}
