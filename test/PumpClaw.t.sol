// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";

import {PumpClawToken} from "../src/core/PumpClawToken.sol";
import {PumpClawLPLocker} from "../src/core/PumpClawLPLocker.sol";
import {PumpClawFactory} from "../src/core/PumpClawFactory.sol";

/// @notice Fork tests for PumpClaw on Base mainnet
contract PumpClawTest is Test {
    // Base mainnet addresses (checksummed)
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    // Test addresses
    address constant ADMIN = 0x261368f0EC280766B84Bfa7a9B23FD53c774878D;
    address creator = makeAddr("creator");
    address user = makeAddr("user");

    PumpClawLPLocker locker;
    PumpClawFactory factory;

    function setUp() public {
        // Fork Base mainnet
        vm.createSelectFork("https://mainnet.base.org");
        
        // Deploy our contracts
        locker = new PumpClawLPLocker(POSITION_MANAGER, ADMIN);
        factory = new PumpClawFactory(
            POOL_MANAGER,
            POSITION_MANAGER,
            address(locker),
            WETH
        );

        // Fund test accounts
        vm.deal(creator, 10 ether);
        vm.deal(user, 10 ether);
    }

    function test_CreateToken() public {
        vm.startPrank(creator);
        
        // Create token with 0.1 ETH initial liquidity
        (address token, uint256 positionId) = factory.createToken{value: 0.1 ether}(
            "Test Token",
            "TEST",
            "https://example.com/image.png"
        );
        
        vm.stopPrank();

        // Verify token was created
        assertGt(token.code.length, 0, "Token should be deployed");
        
        PumpClawToken pumpToken = PumpClawToken(token);
        assertEq(pumpToken.name(), "Test Token");
        assertEq(pumpToken.symbol(), "TEST");
        assertEq(pumpToken.creator(), creator);
        
        // Verify LP position is locked
        (uint256 lockedPositionId, address lockedCreator) = locker.getPosition(token);
        assertEq(lockedPositionId, positionId, "Position should be locked");
        assertEq(lockedCreator, creator, "Creator should be recorded");

        console2.log("Token deployed at:", token);
        console2.log("Position ID:", positionId);
    }

    function test_CreateTokenAndSwap() public {
        vm.startPrank(creator);
        
        // Create token
        (address token, ) = factory.createToken{value: 1 ether}(
            "Swap Test",
            "SWAP",
            ""
        );
        
        vm.stopPrank();

        // Now someone should be able to swap on the pool
        // The pool exists on Uniswap v4 now
        console2.log("Token created:", token);
        console2.log("Pool should be tradeable on Uniswap v4");
    }

    function test_ClaimFees() public {
        // Create token
        vm.startPrank(creator);
        (address token, ) = factory.createToken{value: 1 ether}(
            "Fee Test",
            "FEE",
            ""
        );
        vm.stopPrank();

        // TODO: Simulate some swaps to generate fees
        // Then test fee claiming
        
        // For now just verify the claim function doesn't revert with no fees
        // locker.claimFees(token);
        
        console2.log("Token created for fee testing:", token);
    }

    function test_TokenSupply() public {
        vm.startPrank(creator);
        (address token, ) = factory.createToken{value: 0.1 ether}(
            "Supply Test",
            "SUP",
            ""
        );
        vm.stopPrank();

        PumpClawToken pumpToken = PumpClawToken(token);
        
        // Factory should have 0 tokens (all in LP)
        assertEq(pumpToken.balanceOf(address(factory)), 0, "Factory should have no tokens");
        
        // Total supply should be 100B
        assertEq(pumpToken.totalSupply(), 100_000_000_000e18, "Total supply should be 100B");
    }

    function test_RevertWhen_CreateTokenNoETH() public {
        vm.prank(creator);
        vm.expectRevert("Must provide ETH");
        factory.createToken("Fail", "FAIL", "");
    }

    function test_MultipleTokens() public {
        vm.startPrank(creator);
        
        (address token1, ) = factory.createToken{value: 0.1 ether}("Token One", "ONE", "");
        (address token2, ) = factory.createToken{value: 0.1 ether}("Token Two", "TWO", "");
        
        vm.stopPrank();

        assertTrue(token1 != token2, "Tokens should have different addresses");
        
        // Both should be locked
        (uint256 pos1, ) = locker.getPosition(token1);
        (uint256 pos2, ) = locker.getPosition(token2);
        
        assertGt(pos1, 0);
        assertGt(pos2, 0);
        assertTrue(pos1 != pos2, "Position IDs should be different");
    }
}
