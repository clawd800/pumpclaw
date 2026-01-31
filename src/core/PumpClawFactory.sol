// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {ActionConstants} from "@uniswap/v4-periphery/src/libraries/ActionConstants.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";

import {PumpClawToken} from "./PumpClawToken.sol";
import {IPumpClawFactory} from "../interfaces/IPumpClawFactory.sol";
import {IPumpClawLPLocker} from "../interfaces/IPumpClawLPLocker.sol";

/// @title PumpClawFactory
/// @notice Creates tokens and immediately provides 100% liquidity on Uniswap v4
contract PumpClawFactory is IPumpClawFactory, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant DEFAULT_TOKEN_SUPPLY = 1_000_000_000e18; // 1B tokens (default)
    uint256 public constant MIN_TOKEN_SUPPLY = 1_000_000e18; // 1M tokens minimum
    uint256 public constant MAX_TOKEN_SUPPLY = 1_000_000_000_000e18; // 1T tokens maximum
    uint256 public constant MIN_ETH = 0.0001 ether; // Minimum ETH to prevent price precision issues
    uint24 public constant LP_FEE = 10000; // 1% fee (in hundredths of bps, so 10000 = 1%)
    int24 public constant TICK_SPACING = 200; // Standard tick spacing for 1% fee
    
    // Max slippage for minting (very high since we control both sides)
    uint128 constant MAX_SLIPPAGE = type(uint128).max;

    IPoolManager public immutable poolManager;
    IPositionManager public immutable positionManager;
    IPumpClawLPLocker public immutable lpLocker;
    address public immutable weth;

    constructor(
        address _poolManager,
        address _positionManager,
        address _lpLocker,
        address _weth
    ) {
        poolManager = IPoolManager(_poolManager);
        positionManager = IPositionManager(_positionManager);
        lpLocker = IPumpClawLPLocker(_lpLocker);
        weth = _weth;
    }

    /// @notice Create token with full liquidity on v4 (default 1B supply)
    /// @dev Requires ETH to be sent for the WETH side of the pool
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl
    ) external payable returns (address token, uint256 positionId) {
        return createTokenWithSupply(name, symbol, imageUrl, DEFAULT_TOKEN_SUPPLY);
    }

    /// @notice Create token with custom supply and full liquidity on v4
    /// @dev Requires ETH to be sent for the WETH side of the pool
    /// @param supply Token supply (must be between MIN_TOKEN_SUPPLY and MAX_TOKEN_SUPPLY)
    function createTokenWithSupply(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        uint256 supply
    ) public payable nonReentrant returns (address token, uint256 positionId) {
        require(msg.value >= MIN_ETH, "ETH below minimum");
        require(supply >= MIN_TOKEN_SUPPLY, "Supply too low");
        require(supply <= MAX_TOKEN_SUPPLY, "Supply too high");

        // 1. Deploy token (mints to this contract)
        PumpClawToken newToken = new PumpClawToken(
            name,
            symbol,
            supply,
            msg.sender,
            imageUrl
        );
        token = address(newToken);

        // 2. Determine token order (v4 requires token0 < token1)
        bool tokenIsToken0 = token < weth;
        Currency currency0 = tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(weth);
        Currency currency1 = tokenIsToken0 ? Currency.wrap(weth) : Currency.wrap(token);
        Currency tokenCurrency = Currency.wrap(token);
        Currency wethCurrency = Currency.wrap(weth);

        // 3. Create pool key (no hooks for simplicity)
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });

        // 4. Calculate initial sqrt price based on ETH/token ratio
        uint160 sqrtPriceX96;
        if (tokenIsToken0) {
            // price = WETH / TOKEN
            sqrtPriceX96 = _calculateSqrtPrice(msg.value, supply);
        } else {
            // price = TOKEN / WETH
            sqrtPriceX96 = _calculateSqrtPrice(supply, msg.value);
        }

        // 5. Initialize the pool
        positionManager.initializePool(poolKey, sqrtPriceX96);

        // 6. Calculate tick range (full range)
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        int24 tickUpper = TickMath.maxUsableTick(TICK_SPACING);

        // 7. Calculate liquidity from our amounts
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            tokenIsToken0 ? supply : msg.value,
            tokenIsToken0 ? msg.value : supply
        );

        // 8. Transfer tokens to PositionManager (for settlement)
        IERC20(token).safeTransfer(address(positionManager), supply);

        // 9. Build actions:
        // - WRAP: wrap ETH to WETH (using contract balance from msg.value)
        // - MINT_POSITION: create the LP position
        // - SETTLE: settle WETH (from PositionManager's WETH balance after wrap)
        // - SETTLE: settle token (from PositionManager's token balance after transfer)
        // - SWEEP: return any excess WETH to creator
        bytes memory actions = abi.encodePacked(
            uint8(Actions.WRAP),
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE),
            uint8(Actions.SETTLE),
            uint8(Actions.SWEEP)
        );

        bytes[] memory params = new bytes[](5);
        
        // WRAP params: amount (CONTRACT_BALANCE = wrap all ETH sent)
        params[0] = abi.encode(ActionConstants.CONTRACT_BALANCE);
        
        // MINT_POSITION params: poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner, hookData
        params[1] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            MAX_SLIPPAGE,
            MAX_SLIPPAGE,
            address(lpLocker), // LP position goes directly to locker
            bytes("")
        );
        
        // SETTLE WETH params: currency, amount (OPEN_DELTA = settle exactly what's owed), payerIsUser (false = PositionManager pays)
        params[2] = abi.encode(wethCurrency, ActionConstants.OPEN_DELTA, false);
        
        // SETTLE token params: same pattern
        params[3] = abi.encode(tokenCurrency, ActionConstants.OPEN_DELTA, false);
        
        // SWEEP params: currency, recipient (sweep excess WETH back to creator)
        params[4] = abi.encode(wethCurrency, msg.sender);

        // 10. Execute - send ETH with the call
        positionId = positionManager.nextTokenId();
        positionManager.modifyLiquidities{value: msg.value}(
            abi.encode(actions, params),
            block.timestamp + 60
        );

        // 11. Register position in locker
        lpLocker.lockPosition(token, positionId, msg.sender);

        emit TokenCreated(token, msg.sender, name, symbol, positionId, poolKey);
    }

    /// @notice Calculate sqrt price X96 from amounts
    function _calculateSqrtPrice(uint256 amount1, uint256 amount0) internal pure returns (uint160) {
        require(amount0 > 0, "amount0 zero");
        
        // sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
        uint256 ratio = (amount1 * 1e18) / amount0;
        uint256 sqrtRatio = _sqrt(ratio);
        
        // Scale to X96 format (multiply by 2^96, divide by sqrt(1e18) = 1e9)
        return uint160((sqrtRatio * (1 << 96)) / 1e9);
    }

    /// @notice Babylonian sqrt
    function _sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    receive() external payable {}
}
