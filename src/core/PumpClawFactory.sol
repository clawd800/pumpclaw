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

import {PumpClawToken} from "./PumpClawToken.sol";
import {IPumpClawFactory} from "../interfaces/IPumpClawFactory.sol";
import {IPumpClawLPLocker} from "../interfaces/IPumpClawLPLocker.sol";

/// @title PumpClawFactory
/// @notice Creates tokens and immediately provides 100% liquidity on Uniswap v4
contract PumpClawFactory is IPumpClawFactory, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant TOKEN_SUPPLY = 100_000_000_000e18; // 100B tokens
    uint24 public constant LP_FEE = 10000; // 1% fee (in hundredths of bps, so 10000 = 1%)
    int24 public constant TICK_SPACING = 200; // Standard tick spacing for 1% fee

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

    /// @notice Create token with full liquidity on v4
    /// @dev Requires ETH to be sent for the WETH side of the pool
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl
    ) external payable override nonReentrant returns (address token, uint256 positionId) {
        require(msg.value > 0, "Must provide ETH");

        // 1. Deploy token (mints to this contract)
        PumpClawToken newToken = new PumpClawToken(
            name,
            symbol,
            TOKEN_SUPPLY,
            msg.sender,
            imageUrl
        );
        token = address(newToken);

        // 2. Determine token order (v4 requires token0 < token1)
        bool tokenIsToken0 = token < weth;
        Currency currency0 = tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(weth);
        Currency currency1 = tokenIsToken0 ? Currency.wrap(weth) : Currency.wrap(token);

        // 3. Create pool key (no hooks for simplicity)
        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });

        // 4. Calculate initial sqrt price based on ETH/token ratio
        // sqrtPriceX96 = sqrt(price) * 2^96
        // price = amount1/amount0 (how much token1 per token0)
        uint160 sqrtPriceX96;
        if (tokenIsToken0) {
            // price = WETH / TOKEN
            sqrtPriceX96 = _calculateSqrtPrice(msg.value, TOKEN_SUPPLY);
        } else {
            // price = TOKEN / WETH
            sqrtPriceX96 = _calculateSqrtPrice(TOKEN_SUPPLY, msg.value);
        }

        // 5. Initialize the pool
        positionManager.initializePool(poolKey, sqrtPriceX96);

        // 6. Approve tokens
        IERC20(token).approve(address(positionManager), TOKEN_SUPPLY);

        // 7. Build actions to mint position with full range liquidity
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE_PAIR)
        );

        bytes[] memory params = new bytes[](2);
        
        // MINT_POSITION params: poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, recipient, hookData
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        int24 tickUpper = TickMath.maxUsableTick(TICK_SPACING);
        
        // For full range, we provide max amounts and let v4 calculate liquidity
        uint256 amount0Max = tokenIsToken0 ? TOKEN_SUPPLY : msg.value;
        uint256 amount1Max = tokenIsToken0 ? msg.value : TOKEN_SUPPLY;
        
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            0, // liquidity (0 = auto-calculate from amounts)
            amount0Max,
            amount1Max,
            address(lpLocker), // LP position goes directly to locker
            bytes("")
        );
        
        // SETTLE_PAIR params: currency0, currency1
        params[1] = abi.encode(currency0, currency1);

        // 8. Execute - send ETH with the call
        positionId = positionManager.nextTokenId();
        positionManager.modifyLiquidities{value: msg.value}(
            abi.encode(actions, params),
            block.timestamp + 60
        );

        // 9. Register position in locker
        lpLocker.lockPosition(token, positionId, msg.sender);

        emit TokenCreated(token, msg.sender, name, symbol, positionId, poolKey);
    }

    /// @notice Calculate sqrt price X96 from amounts
    function _calculateSqrtPrice(uint256 amount1, uint256 amount0) internal pure returns (uint160) {
        // sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
        // To avoid overflow: sqrt(amount1 * 2^192 / amount0)
        require(amount0 > 0, "amount0 zero");
        
        // Use a simplified calculation that works for most cases
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
