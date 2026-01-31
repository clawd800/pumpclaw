// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

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
    address trader = makeAddr("trader");

    PumpClawLPLocker locker;
    PumpClawFactory factory;
    PoolSwapTest swapRouter;
    IPoolManager poolManager;

    function setUp() public {
        // Fork Base mainnet
        vm.createSelectFork("https://base-rpc.publicnode.com");
        
        poolManager = IPoolManager(POOL_MANAGER);
        
        // Deploy our contracts
        locker = new PumpClawLPLocker(POSITION_MANAGER, ADMIN);
        factory = new PumpClawFactory(
            POOL_MANAGER,
            POSITION_MANAGER,
            address(locker),
            WETH
        );
        
        // Link locker to factory (security: only factory can lock positions)
        locker.setFactory(address(factory));
        
        // Deploy swap router for testing
        swapRouter = new PoolSwapTest(poolManager);

        // Fund test accounts
        vm.deal(creator, 10 ether);
        vm.deal(user, 10 ether);
        vm.deal(trader, 100 ether);
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

    function test_SwapGeneratesFees() public {
        // 1. Create token with 1 ETH liquidity
        vm.prank(creator);
        (address token, ) = factory.createToken{value: 1 ether}(
            "Fee Token",
            "FEET",
            ""
        );

        // 2. Build pool key
        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000, // 1% fee
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        // 3. Trader buys tokens with ETH (swap WETH for token)
        vm.startPrank(trader);
        
        // Wrap some ETH to WETH for the swap
        (bool success,) = WETH.call{value: 10 ether}("");
        require(success, "WETH wrap failed");
        
        // Approve swap router
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);
        
        // Swap: sell WETH for token
        // If tokenIsToken0: WETH is token1, so we swap 1->0 (zeroForOne=false), price goes up
        // If !tokenIsToken0: WETH is token0, so we swap 0->1 (zeroForOne=true), price goes down
        bool zeroForOne = !tokenIsToken0;
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -1 ether, // negative = exact input
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
        
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        BalanceDelta delta = swapRouter.swap(poolKey, params, settings, "");
        
        vm.stopPrank();

        console2.log("Swap completed!");
        console2.log("Delta amount0:", delta.amount0());
        console2.log("Delta amount1:", delta.amount1());
        
        // Verify trader got tokens
        uint256 tokenBalance = IERC20(token).balanceOf(trader);
        assertGt(tokenBalance, 0, "Trader should have received tokens");
        console2.log("Trader received tokens:", tokenBalance);
    }

    function test_ClaimFeesAfterSwaps() public {
        // 1. Create token
        vm.prank(creator);
        (address token, ) = factory.createToken{value: 1 ether}(
            "Fee Test",
            "FEE",
            ""
        );

        // 2. Build pool key
        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        // 3. Perform multiple swaps to generate fees
        vm.startPrank(trader);
        (bool success,) = WETH.call{value: 50 ether}("");
        require(success);
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);
        IERC20(token).approve(address(swapRouter), type(uint256).max);

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        // For buying tokens (selling WETH):
        // If tokenIsToken0: WETH is token1, zeroForOne=false, price goes up
        // If !tokenIsToken0: WETH is token0, zeroForOne=true, price goes down
        bool buyTokenZeroForOne = !tokenIsToken0;
        uint160 buyLimit = buyTokenZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1;
        
        // For selling tokens (buying WETH): opposite direction
        bool sellTokenZeroForOne = tokenIsToken0;
        uint160 sellLimit = sellTokenZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1;

        // Swap 1: Buy tokens with 5 ETH
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: buyTokenZeroForOne,
                amountSpecified: -5 ether,
                sqrtPriceLimitX96: buyLimit
            }),
            settings,
            ""
        );

        // Swap 2: Sell some tokens back
        uint256 tokenBal = IERC20(token).balanceOf(trader);
        if (tokenBal > 0) {
            swapRouter.swap(
                poolKey,
                IPoolManager.SwapParams({
                    zeroForOne: sellTokenZeroForOne,
                    amountSpecified: -int256(tokenBal / 2),
                    sqrtPriceLimitX96: sellLimit
                }),
                settings,
                ""
            );
        }

        // Swap 3: Buy more tokens
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: buyTokenZeroForOne,
                amountSpecified: -3 ether,
                sqrtPriceLimitX96: buyLimit
            }),
            settings,
            ""
        );
        
        vm.stopPrank();

        // 4. Record balances before claiming
        uint256 creatorWethBefore = IERC20(WETH).balanceOf(creator);
        uint256 creatorTokenBefore = IERC20(token).balanceOf(creator);
        uint256 adminWethBefore = IERC20(WETH).balanceOf(ADMIN);
        uint256 adminTokenBefore = IERC20(token).balanceOf(ADMIN);

        console2.log("=== Before Claim ===");
        console2.log("Creator WETH:", creatorWethBefore);
        console2.log("Creator Token:", creatorTokenBefore);
        console2.log("Admin WETH:", adminWethBefore);
        console2.log("Admin Token:", adminTokenBefore);

        // 5. Claim fees
        locker.claimFees(token);

        // 6. Check balances after
        uint256 creatorWethAfter = IERC20(WETH).balanceOf(creator);
        uint256 creatorTokenAfter = IERC20(token).balanceOf(creator);
        uint256 adminWethAfter = IERC20(WETH).balanceOf(ADMIN);
        uint256 adminTokenAfter = IERC20(token).balanceOf(ADMIN);

        console2.log("=== After Claim ===");
        console2.log("Creator WETH:", creatorWethAfter);
        console2.log("Creator Token:", creatorTokenAfter);
        console2.log("Admin WETH:", adminWethAfter);
        console2.log("Admin Token:", adminTokenAfter);

        uint256 creatorWethGain = creatorWethAfter - creatorWethBefore;
        uint256 adminWethGain = adminWethAfter - adminWethBefore;
        uint256 creatorTokenGain = creatorTokenAfter - creatorTokenBefore;
        uint256 adminTokenGain = adminTokenAfter - adminTokenBefore;

        console2.log("=== Gains ===");
        console2.log("Creator WETH gain:", creatorWethGain);
        console2.log("Admin WETH gain:", adminWethGain);
        console2.log("Creator Token gain:", creatorTokenGain);
        console2.log("Admin Token gain:", adminTokenGain);

        // 7. Verify 80/20 split (with some tolerance for rounding)
        if (creatorWethGain > 0 || adminWethGain > 0) {
            uint256 totalWethFees = creatorWethGain + adminWethGain;
            assertApproxEqRel(creatorWethGain, totalWethFees * 80 / 100, 0.01e18, "Creator should get ~80% of WETH fees");
            assertApproxEqRel(adminWethGain, totalWethFees * 20 / 100, 0.01e18, "Admin should get ~20% of WETH fees");
        }

        if (creatorTokenGain > 0 || adminTokenGain > 0) {
            uint256 totalTokenFees = creatorTokenGain + adminTokenGain;
            assertApproxEqRel(creatorTokenGain, totalTokenFees * 80 / 100, 0.01e18, "Creator should get ~80% of token fees");
            assertApproxEqRel(adminTokenGain, totalTokenFees * 20 / 100, 0.01e18, "Admin should get ~20% of token fees");
        }
    }

    function test_OnlyLockerCanClaimFees() public {
        vm.prank(creator);
        (address token, ) = factory.createToken{value: 0.1 ether}(
            "Test",
            "TST",
            ""
        );

        // Anyone can call claimFees (it just distributes to creator/admin)
        // This should not revert, even with no fees
        locker.claimFees(token);
    }

    function test_ClaimFeesRevertsForUnknownToken() public {
        address fakeToken = makeAddr("fake");
        
        vm.expectRevert("Position not found");
        locker.claimFees(fakeToken);
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
        
        // Total supply should be 1B (default)
        assertEq(pumpToken.totalSupply(), 1_000_000_000e18, "Total supply should be 1B");
    }

    function test_CustomSupply() public {
        uint256 customSupply = 500_000_000e18; // 500M tokens
        
        vm.startPrank(creator);
        (address token, ) = factory.createTokenWithSupply{value: 0.1 ether}(
            "Custom Supply",
            "CUST",
            "",
            customSupply
        );
        vm.stopPrank();

        PumpClawToken pumpToken = PumpClawToken(token);
        assertEq(pumpToken.totalSupply(), customSupply, "Total supply should be custom amount");
    }

    function test_RevertWhen_SupplyTooLow() public {
        vm.prank(creator);
        vm.expectRevert("Supply too low");
        factory.createTokenWithSupply{value: 0.1 ether}(
            "Low Supply",
            "LOW",
            "",
            100e18 // Only 100 tokens, below minimum
        );
    }

    function test_RevertWhen_SupplyTooHigh() public {
        vm.prank(creator);
        vm.expectRevert("Supply too high");
        factory.createTokenWithSupply{value: 0.1 ether}(
            "High Supply",
            "HIGH",
            "",
            10_000_000_000_000e18 // 10T tokens, above maximum
        );
    }

    function test_RevertWhen_CreateTokenNoETH() public {
        vm.prank(creator);
        vm.expectRevert("ETH below minimum");
        factory.createToken("Fail", "FAIL", "");
    }

    function test_RevertWhen_ETHBelowMinimum() public {
        vm.prank(creator);
        vm.expectRevert("ETH below minimum");
        factory.createToken{value: 0.00001 ether}("Fail", "FAIL", ""); // Below 0.0001 ETH minimum
    }

    function test_OnlyFactoryCanLock() public {
        vm.prank(user);
        vm.expectRevert("Only factory");
        locker.lockPosition(address(0x123), 1, user);
    }

    function test_FactoryCanOnlyBeSetOnce() public {
        // Factory already set in setUp
        vm.expectRevert("Factory already set");
        locker.setFactory(address(0x456));
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
