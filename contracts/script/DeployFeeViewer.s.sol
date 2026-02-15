// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {PumpClawFeeViewer} from "../src/helpers/PumpClawFeeViewer.sol";

contract DeployFeeViewer is Script {
    // Base mainnet addresses
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant LP_LOCKER = 0x9047c0944c843d91951a6C91dc9f3944D826ACA8;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("BASE_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        PumpClawFeeViewer feeViewer = new PumpClawFeeViewer(
            POSITION_MANAGER,
            POOL_MANAGER,
            LP_LOCKER
        );

        console.log("FeeViewer deployed at:", address(feeViewer));

        vm.stopBroadcast();
    }
}
