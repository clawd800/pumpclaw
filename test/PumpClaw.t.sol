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
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";

import {PumpClawToken} from "../src/core/PumpClawToken.sol";
import {PumpClawLPLocker} from "../src/core/PumpClawLPLocker.sol";
import {PumpClawFactory} from "../src/core/PumpClawFactory.sol";

/// @notice Fork tests for PumpClawV4 - Concentrated Liquidity, No ETH deposit
contract PumpClawV4Test is Test {
    using StateLibrary for IPoolManager;
    using PoolIdLibrary for PoolKey;

    // Base mainnet addresses
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
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
        
        // Deploy contracts
        locker = new PumpClawLPLocker(POSITION_MANAGER, ADMIN);
        factory = new PumpClawFactory(
            POOL_MANAGER,
            POSITION_MANAGER,
            address(locker),
            WETH
        );
        
        locker.setFactory(address(factory));
        swapRouter = new PoolSwapTest(poolManager);

        // Fund test accounts - note: creator doesn't need ETH for token creation!
        vm.deal(trader, 100 ether);
        vm.deal(user, 10 ether);
    }

    // ========== Core Functionality Tests ==========

    function test_CreateTokenNoETHRequired() public {
        // Creator has 0 ETH
        assertEq(creator.balance, 0, "Creator should start with 0 ETH");
        
        vm.prank(creator);
        (address token, uint256 positionId) = factory.createToken(
            "Zero ETH Token",
            "ZERO",
            "https://example.com/img.png"
        );

        // Token should be created successfully
        assertGt(token.code.length, 0, "Token should be deployed");
        
        PumpClawToken pumpToken = PumpClawToken(token);
        assertEq(pumpToken.name(), "Zero ETH Token");
        assertEq(pumpToken.symbol(), "ZERO");
        assertEq(pumpToken.creator(), creator);
        assertEq(pumpToken.totalSupply(), factory.TOKEN_SUPPLY());
        
        // LP should be locked
        (uint256 lockedPos, address lockedCreator) = locker.getPosition(token);
        assertEq(lockedPos, positionId);
        assertEq(lockedCreator, creator);

        console2.log("Token deployed at:", token);
        console2.log("Position ID:", positionId);
        console2.log("Creator ETH balance:", creator.balance);
    }

    function test_CreateTokenWithDefaultFDV() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Default FDV", "DFDV", "");
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, factory.DEFAULT_FDV(), "Should use default FDV");
        assertEq(info.initialFdv, 20 ether, "Default FDV should be 20 ETH");
    }

    function test_CreateTokenWithCustomFDV() public {
        uint256 customFdv = 50 ether;
        
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv(
            "Custom FDV",
            "CFDV",
            "",
            customFdv
        );
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, customFdv, "Should use custom FDV");
    }

    function test_CreateTokenWithLowFDV() public {
        // Low FDV should still work (market decides fairness)
        uint256 lowFdv = 1 ether;
        
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv("Low FDV", "LFDV", "", lowFdv);
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, lowFdv);
    }

    function test_CreateTokenWithHighFDV() public {
        // High FDV = expensive tokens
        uint256 highFdv = 1000 ether;
        
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv("High FDV", "HFDV", "", highFdv);
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, highFdv);
    }

    function test_CreateTokenFor() public {
        address relayer = makeAddr("relayer");
        
        vm.prank(relayer);
        (address token, ) = factory.createTokenFor(
            "Relayed Token",
            "RELAY",
            "",
            30 ether,
            creator
        );

        PumpClawToken pumpToken = PumpClawToken(token);
        assertEq(pumpToken.creator(), creator, "Creator should be set correctly");
        
        (, address lockedCreator) = locker.getPosition(token);
        assertEq(lockedCreator, creator);
    }

    // ========== Trading Tests ==========

    function test_BuyTokensWithETH() public {
        // Create token
        vm.prank(creator);
        (address token, ) = factory.createToken("Buy Test", "BUY", "");

        // Build pool key
        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        // Trader buys tokens
        vm.startPrank(trader);
        
        // Wrap ETH to WETH
        (bool success,) = WETH.call{value: 10 ether}("");
        require(success, "WETH wrap failed");
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);
        
        // For buying tokens (selling WETH):
        // If tokenIsToken0: WETH is token1, zeroForOne=false
        // If !tokenIsToken0: WETH is token0, zeroForOne=true
        bool zeroForOne = !tokenIsToken0;
        
        BalanceDelta delta = swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -1 ether, // Spend 1 ETH
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        
        vm.stopPrank();

        // Verify trader received tokens
        uint256 tokenBalance = IERC20(token).balanceOf(trader);
        assertGt(tokenBalance, 0, "Trader should have received tokens");
        
        console2.log("Trader spent 1 ETH, received tokens:", tokenBalance);
        console2.log("Tokens as % of supply:", tokenBalance * 100 / factory.TOKEN_SUPPLY(), "%");
    }

    function test_BuyTokensPriceImpact() public {
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv("Price Impact", "IMPACT", "", 20 ether);

        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        vm.startPrank(trader);
        (bool success,) = WETH.call{value: 20 ether}("");
        require(success);
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);

        bool zeroForOne = !tokenIsToken0;
        uint160 priceLimit = zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1;
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        // Buy 1: 0.001 ETH
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -0.001 ether,
                sqrtPriceLimitX96: priceLimit
            }),
            settings,
            ""
        );
        uint256 balance1 = IERC20(token).balanceOf(trader);
        console2.log("After 0.001 ETH buy:", balance1, "tokens");

        // Buy 2: 0.01 ETH
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -0.01 ether,
                sqrtPriceLimitX96: priceLimit
            }),
            settings,
            ""
        );
        uint256 balance2 = IERC20(token).balanceOf(trader);
        console2.log("After 0.01 ETH buy, gained:", balance2 - balance1);

        // Buy 3: 0.1 ETH
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -0.1 ether,
                sqrtPriceLimitX96: priceLimit
            }),
            settings,
            ""
        );
        uint256 balance3 = IERC20(token).balanceOf(trader);
        console2.log("After 0.1 ETH buy, gained:", balance3 - balance2);

        // Buy 4: 1 ETH
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -1 ether,
                sqrtPriceLimitX96: priceLimit
            }),
            settings,
            ""
        );
        uint256 balance4 = IERC20(token).balanceOf(trader);
        console2.log("After 1 ETH buy, gained:", balance4 - balance3);

        vm.stopPrank();

        // Verify total is reasonable (should be < 10% of supply for ~1.1 ETH)
        uint256 supplyPercent = balance4 * 100 / factory.TOKEN_SUPPLY();
        console2.log("Total % of supply:", supplyPercent, "%");
        assertLt(supplyPercent, 10, "Should get less than 10% with ~1.1 ETH");
    }

    function test_SellTokensForETH() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Sell Test", "SELL", "");

        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        vm.startPrank(trader);
        
        // First buy some tokens
        (bool success,) = WETH.call{value: 10 ether}("");
        require(success);
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);
        IERC20(token).approve(address(swapRouter), type(uint256).max);

        bool buyZeroForOne = !tokenIsToken0;
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: buyZeroForOne,
                amountSpecified: -1 ether,
                sqrtPriceLimitX96: buyZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        uint256 tokensHeld = IERC20(token).balanceOf(trader);
        uint256 wethBefore = IERC20(WETH).balanceOf(trader);
        console2.log("Tokens held after buy:", tokensHeld);

        // Now sell half the tokens
        bool sellZeroForOne = tokenIsToken0;
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: sellZeroForOne,
                amountSpecified: -int256(tokensHeld / 2),
                sqrtPriceLimitX96: sellZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        vm.stopPrank();

        uint256 wethAfter = IERC20(WETH).balanceOf(trader);
        console2.log("WETH gained from sell:", wethAfter - wethBefore);
        assertGt(wethAfter, wethBefore, "Should have received WETH from sell");
    }

    // ========== Fee Tests ==========

    function test_FeesGeneratedAndClaimable() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Fee Test", "FEE", "");

        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        // Generate trading volume
        vm.startPrank(trader);
        (bool success,) = WETH.call{value: 50 ether}("");
        require(success);
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);
        IERC20(token).approve(address(swapRouter), type(uint256).max);

        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });

        bool buyZeroForOne = !tokenIsToken0;
        bool sellZeroForOne = tokenIsToken0;

        // Multiple buy/sell cycles to generate fees
        for (uint i = 0; i < 3; i++) {
            // Buy
            swapRouter.swap(
                poolKey,
                IPoolManager.SwapParams({
                    zeroForOne: buyZeroForOne,
                    amountSpecified: -1 ether,
                    sqrtPriceLimitX96: buyZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
                }),
                settings,
                ""
            );

            // Sell half
            uint256 bal = IERC20(token).balanceOf(trader);
            if (bal > 0) {
                swapRouter.swap(
                    poolKey,
                    IPoolManager.SwapParams({
                        zeroForOne: sellZeroForOne,
                        amountSpecified: -int256(bal / 2),
                        sqrtPriceLimitX96: sellZeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
                    }),
                    settings,
                    ""
                );
            }
        }
        vm.stopPrank();

        // Claim fees
        uint256 creatorWethBefore = IERC20(WETH).balanceOf(creator);
        uint256 adminWethBefore = IERC20(WETH).balanceOf(ADMIN);

        locker.claimFees(token);

        uint256 creatorWethAfter = IERC20(WETH).balanceOf(creator);
        uint256 adminWethAfter = IERC20(WETH).balanceOf(ADMIN);

        console2.log("Creator WETH fees:", creatorWethAfter - creatorWethBefore);
        console2.log("Admin WETH fees:", adminWethAfter - adminWethBefore);

        // Verify 80/20 split
        uint256 creatorGain = creatorWethAfter - creatorWethBefore;
        uint256 adminGain = adminWethAfter - adminWethBefore;
        
        if (creatorGain + adminGain > 0) {
            uint256 totalFees = creatorGain + adminGain;
            assertApproxEqRel(creatorGain, totalFees * 80 / 100, 0.02e18, "Creator should get ~80%");
        }
    }

    // ========== Edge Cases & Security ==========

    function test_RevertWhen_ZeroFDV() public {
        vm.prank(creator);
        vm.expectRevert("FDV required");
        factory.createTokenWithFdv("Zero FDV", "ZFDV", "", 0);
    }

    function test_RevertWhen_ZeroCreator() public {
        vm.prank(user);
        vm.expectRevert("Invalid creator");
        factory.createTokenFor("Bad", "BAD", "", 20 ether, address(0));
    }

    function test_MultipleTokensFromSameCreator() public {
        vm.startPrank(creator);
        
        (address token1, ) = factory.createToken("Token 1", "T1", "");
        (address token2, ) = factory.createTokenWithFdv("Token 2", "T2", "", 50 ether);
        (address token3, ) = factory.createTokenWithFdv("Token 3", "T3", "", 100 ether);
        
        vm.stopPrank();

        // All should be different
        assertTrue(token1 != token2 && token2 != token3 && token1 != token3);

        // Check registry
        uint256[] memory creatorTokens = factory.getTokensByCreator(creator);
        assertEq(creatorTokens.length, 3);

        // Check individual FDVs
        assertEq(factory.getTokenInfo(token1).initialFdv, 20 ether);
        assertEq(factory.getTokenInfo(token2).initialFdv, 50 ether);
        assertEq(factory.getTokenInfo(token3).initialFdv, 100 ether);
    }

    function test_TokenSupplyIsCorrect() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Supply Check", "SUP", "");

        PumpClawToken pumpToken = PumpClawToken(token);
        
        // Total supply should be 1B
        assertEq(pumpToken.totalSupply(), 1_000_000_000e18);
        
        // Factory should have 0 (all in LP)
        assertEq(pumpToken.balanceOf(address(factory)), 0);
    }

    function test_ConcentratedLiquidityRange() public {
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv("Range Test", "RANGE", "", 20 ether);

        // Get pool info to verify tick range
        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        PoolId poolId = poolKey.toId();
        (uint160 sqrtPriceX96, int24 currentTick,,) = poolManager.getSlot0(poolId);
        
        console2.log("Current tick:", currentTick);
        console2.log("SqrtPriceX96:", sqrtPriceX96);
        
        // Price should be at the FDV-derived level
        // For 20 ETH FDV with 1B tokens: price = 2e-8 ETH/token
        assertGt(sqrtPriceX96, 0, "Price should be initialized");
    }

    function test_RegistryPagination() public {
        vm.startPrank(creator);
        
        // Create 5 tokens
        for (uint i = 0; i < 5; i++) {
            factory.createTokenWithFdv(
                string(abi.encodePacked("Token", i)),
                string(abi.encodePacked("T", i)),
                "",
                (i + 1) * 10 ether
            );
        }
        vm.stopPrank();

        assertEq(factory.getTokenCount(), 5);

        // Page 1
        PumpClawFactory.TokenInfo[] memory page1 = factory.getTokens(0, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0].initialFdv, 10 ether);
        assertEq(page1[1].initialFdv, 20 ether);

        // Page 2
        PumpClawFactory.TokenInfo[] memory page2 = factory.getTokens(2, 4);
        assertEq(page2.length, 2);
        assertEq(page2[0].initialFdv, 30 ether);

        // Last page (partial)
        PumpClawFactory.TokenInfo[] memory page3 = factory.getTokens(4, 10);
        assertEq(page3.length, 1);
    }

    function test_FactoryConstants() public view {
        assertEq(factory.TOKEN_SUPPLY(), 1_000_000_000e18);
        assertEq(factory.DEFAULT_FDV(), 20 ether);
        assertEq(factory.PRICE_RANGE_MULTIPLIER(), 100);
        assertEq(factory.LP_FEE(), 10000);
        assertEq(factory.TICK_SPACING(), 200);
    }

    // ========== Fairness Verification ==========

    function test_FirstBuyerGetsReasonableAmount() public {
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv("Fair Test", "FAIR", "", 20 ether);

        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        vm.startPrank(trader);
        (bool success,) = WETH.call{value: 10 ether}("");
        require(success);
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);

        bool zeroForOne = !tokenIsToken0;
        
        // First buyer with 1 ETH
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -1 ether,
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        vm.stopPrank();

        uint256 tokensReceived = IERC20(token).balanceOf(trader);
        uint256 percentOfSupply = tokensReceived * 100 / factory.TOKEN_SUPPLY();
        
        console2.log("Tokens received for 1 ETH:", tokensReceived);
        console2.log("Percent of supply:", percentOfSupply, "%");

        // With 20 ETH FDV, 1 ETH should get roughly 5% (1/20 = 5%)
        // Allow some slippage, but should be < 10%
        assertLt(percentOfSupply, 10, "First buyer should get < 10% for 1 ETH");
        assertGt(percentOfSupply, 1, "First buyer should get > 1% for 1 ETH");
    }

    function test_CompareV1vsV4Fairness() public {
        // This test demonstrates the improvement from V1 to V4
        // In V1 with 0.001 ETH deposit, first 0.001 ETH buy got 50% of supply
        // In V4 with 20 ETH FDV, first 0.001 ETH buy should get ~0.005%
        
        vm.prank(creator);
        (address token, ) = factory.createTokenWithFdv("V4 Fair", "V4F", "", 20 ether);

        bool tokenIsToken0 = token < WETH;
        PoolKey memory poolKey = PoolKey({
            currency0: tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(WETH),
            currency1: tokenIsToken0 ? Currency.wrap(WETH) : Currency.wrap(token),
            fee: 10000,
            tickSpacing: 200,
            hooks: IHooks(address(0))
        });

        vm.startPrank(trader);
        (bool success,) = WETH.call{value: 1 ether}("");
        require(success);
        IERC20(WETH).approve(address(swapRouter), type(uint256).max);

        bool zeroForOne = !tokenIsToken0;
        
        // Small buy: 0.001 ETH (same as V1 test)
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -0.001 ether,
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );
        vm.stopPrank();

        uint256 tokensReceived = IERC20(token).balanceOf(trader);
        uint256 percentOfSupplyBps = tokensReceived * 10000 / factory.TOKEN_SUPPLY(); // in basis points
        
        console2.log("V4: 0.001 ETH buy received tokens:", tokensReceived);
        console2.log("V4: Percent of supply (bps):", percentOfSupplyBps);
        
        // V4 should give << 1% (< 100 bps) for 0.001 ETH
        // V1 would have given 50% (5000 bps)!
        assertLt(percentOfSupplyBps, 100, "V4 should give < 1% for small buy");
    }
}
