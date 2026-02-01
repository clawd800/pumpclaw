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

    // Default values (moved from contract to client-side)
    uint256 constant DEFAULT_SUPPLY = 1_000_000_000e18; // 1B tokens
    uint256 constant DEFAULT_FDV = 20 ether; // 20 ETH

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
            "https://example.com/img.png",
            DEFAULT_SUPPLY,
            DEFAULT_FDV,
            creator
        );

        // Token should be created successfully
        assertGt(token.code.length, 0, "Token should be deployed");
        
        PumpClawToken pumpToken = PumpClawToken(token);
        assertEq(pumpToken.name(), "Zero ETH Token");
        assertEq(pumpToken.symbol(), "ZERO");
        assertEq(pumpToken.creator(), creator);
        assertEq(pumpToken.totalSupply(), DEFAULT_SUPPLY);
        
        // LP should be locked
        (uint256 lockedPos, address lockedCreator) = locker.getPosition(token);
        assertEq(lockedPos, positionId);
        assertEq(lockedCreator, creator);

        console2.log("Token deployed at:", token);
        console2.log("Position ID:", positionId);
        console2.log("Creator ETH balance:", creator.balance);
    }

    function test_CreateTokenWithCustomSupply() public {
        uint256 customSupply = 100_000_000e18; // 100M tokens
        
        vm.prank(creator);
        (address token, ) = factory.createToken(
            "Custom Supply",
            "CSUP",
            "",
            customSupply,
            DEFAULT_FDV,
            creator
        );
        
        PumpClawToken pumpToken = PumpClawToken(token);
        assertEq(pumpToken.totalSupply(), customSupply, "Should use custom supply");
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.totalSupply, customSupply);
    }

    function test_CreateTokenWithCustomFDV() public {
        uint256 customFdv = 50 ether;
        
        vm.prank(creator);
        (address token, ) = factory.createToken(
            "Custom FDV",
            "CFDV",
            "",
            DEFAULT_SUPPLY,
            customFdv,
            creator
        );
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, customFdv, "Should use custom FDV");
    }

    function test_CreateTokenWithLowFDV() public {
        // Low FDV should still work (market decides fairness)
        uint256 lowFdv = 1 ether;
        
        vm.prank(creator);
        (address token, ) = factory.createToken("Low FDV", "LFDV", "", DEFAULT_SUPPLY, lowFdv, creator);
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, lowFdv);
    }

    function test_CreateTokenWithHighFDV() public {
        // High FDV = expensive tokens
        uint256 highFdv = 1000 ether;
        
        vm.prank(creator);
        (address token, ) = factory.createToken("High FDV", "HFDV", "", DEFAULT_SUPPLY, highFdv, creator);
        
        PumpClawFactory.TokenInfo memory info = factory.getTokenInfo(token);
        assertEq(info.initialFdv, highFdv);
    }

    function test_CreateTokenForDifferentCreator() public {
        address relayer = makeAddr("relayer");
        
        vm.prank(relayer);
        (address token, ) = factory.createToken(
            "Relayed Token",
            "RELAY",
            "",
            DEFAULT_SUPPLY,
            30 ether,
            creator  // creator is different from msg.sender
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
        (address token, ) = factory.createToken("Buy Test", "BUY", "", DEFAULT_SUPPLY, DEFAULT_FDV, creator);

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
        console2.log("Tokens as % of supply:", tokenBalance * 100 / DEFAULT_SUPPLY, "%");
    }

    function test_SellTokensForETH() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Sell Test", "SELL", "", DEFAULT_SUPPLY, DEFAULT_FDV, creator);

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
        (address token, ) = factory.createToken("Fee Test", "FEE", "", DEFAULT_SUPPLY, DEFAULT_FDV, creator);

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

    function test_RevertWhen_ZeroSupply() public {
        vm.prank(creator);
        vm.expectRevert("Supply required");
        factory.createToken("Zero Supply", "ZSUP", "", 0, DEFAULT_FDV, creator);
    }

    function test_RevertWhen_ZeroFDV() public {
        vm.prank(creator);
        vm.expectRevert("FDV required");
        factory.createToken("Zero FDV", "ZFDV", "", DEFAULT_SUPPLY, 0, creator);
    }

    function test_RevertWhen_ZeroCreator() public {
        vm.prank(user);
        vm.expectRevert("Invalid creator");
        factory.createToken("Bad", "BAD", "", DEFAULT_SUPPLY, DEFAULT_FDV, address(0));
    }

    function test_MultipleTokensFromSameCreator() public {
        vm.startPrank(creator);
        
        (address token1, ) = factory.createToken("Token 1", "T1", "", DEFAULT_SUPPLY, 10 ether, creator);
        (address token2, ) = factory.createToken("Token 2", "T2", "", DEFAULT_SUPPLY, 50 ether, creator);
        (address token3, ) = factory.createToken("Token 3", "T3", "", DEFAULT_SUPPLY, 100 ether, creator);
        
        vm.stopPrank();

        // All should be different
        assertTrue(token1 != token2 && token2 != token3 && token1 != token3);

        // Check registry
        uint256[] memory creatorTokens = factory.getTokensByCreator(creator);
        assertEq(creatorTokens.length, 3);

        // Check individual FDVs
        assertEq(factory.getTokenInfo(token1).initialFdv, 10 ether);
        assertEq(factory.getTokenInfo(token2).initialFdv, 50 ether);
        assertEq(factory.getTokenInfo(token3).initialFdv, 100 ether);
    }

    function test_VariableSupplyTokens() public {
        vm.startPrank(creator);
        
        uint256 supply1 = 100_000e18;        // 100K
        uint256 supply2 = 1_000_000_000e18;  // 1B
        uint256 supply3 = 21_000_000e18;     // 21M (Bitcoin-like)
        
        (address token1, ) = factory.createToken("Small", "SMOL", "", supply1, DEFAULT_FDV, creator);
        (address token2, ) = factory.createToken("Billion", "BILL", "", supply2, DEFAULT_FDV, creator);
        (address token3, ) = factory.createToken("Bitcoin", "BTC21", "", supply3, DEFAULT_FDV, creator);
        
        vm.stopPrank();

        assertEq(PumpClawToken(token1).totalSupply(), supply1);
        assertEq(PumpClawToken(token2).totalSupply(), supply2);
        assertEq(PumpClawToken(token3).totalSupply(), supply3);
        
        // Registry should also have the supply
        assertEq(factory.getTokenInfo(token1).totalSupply, supply1);
        assertEq(factory.getTokenInfo(token2).totalSupply, supply2);
        assertEq(factory.getTokenInfo(token3).totalSupply, supply3);
    }

    function test_TokenSupplyIsCorrect() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Supply Check", "SUP", "", DEFAULT_SUPPLY, DEFAULT_FDV, creator);

        PumpClawToken pumpToken = PumpClawToken(token);
        
        // Total supply should be 1B
        assertEq(pumpToken.totalSupply(), DEFAULT_SUPPLY);
        
        // Factory should have 0 (all in LP)
        assertEq(pumpToken.balanceOf(address(factory)), 0);
    }

    function test_RegistryPagination() public {
        vm.startPrank(creator);
        
        // Create 5 tokens
        for (uint i = 0; i < 5; i++) {
            factory.createToken(
                string(abi.encodePacked("Token", i)),
                string(abi.encodePacked("T", i)),
                "",
                DEFAULT_SUPPLY,
                (i + 1) * 10 ether,
                creator
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
        assertEq(factory.PRICE_RANGE_MULTIPLIER(), 100);
        assertEq(factory.LP_FEE(), 10000);
        assertEq(factory.TICK_SPACING(), 200);
    }

    // ========== Fairness Verification ==========

    function test_FirstBuyerGetsReasonableAmount() public {
        vm.prank(creator);
        (address token, ) = factory.createToken("Fair Test", "FAIR", "", DEFAULT_SUPPLY, DEFAULT_FDV, creator);

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
        uint256 percentOfSupply = tokensReceived * 100 / DEFAULT_SUPPLY;
        
        console2.log("Tokens received for 1 ETH:", tokensReceived);
        console2.log("Percent of supply:", percentOfSupply, "%");

        // With 20 ETH FDV, 1 ETH should get roughly 5% (1/20 = 5%)
        // Allow some slippage, but should be < 10%
        assertLt(percentOfSupply, 10, "First buyer should get < 10% for 1 ETH");
        assertGt(percentOfSupply, 1, "First buyer should get > 1% for 1 ETH");
    }
}
