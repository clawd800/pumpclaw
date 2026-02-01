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
import {IPumpClawLPLocker} from "../interfaces/IPumpClawLPLocker.sol";

/// @title PumpClawFactory
/// @notice Fair launch with concentrated liquidity - NO ETH deposit required
/// @dev Uses single-sided liquidity: all tokens deposited, released as price rises
contract PumpClawFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PRICE_RANGE_MULTIPLIER = 100; // Price can go up to 100x FDV
    uint24 public constant LP_FEE = 10000; // 1% fee
    int24 public constant TICK_SPACING = 200;
    
    uint128 constant MAX_SLIPPAGE = type(uint128).max;

    IPoolManager public immutable poolManager;
    IPositionManager public immutable positionManager;
    IPumpClawLPLocker public immutable lpLocker;
    
    // Native ETH represented as address(0) in Uniswap V4
    address constant NATIVE_ETH = address(0);

    struct TokenInfo {
        address token;
        address creator;
        uint256 positionId;
        uint256 totalSupply;
        uint256 initialFdv;
        uint256 createdAt;
        string name;
        string symbol;
    }

    TokenInfo[] public tokens;
    mapping(address => uint256) public tokenIndex;
    mapping(address => uint256[]) public tokensByCreator;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 positionId,
        uint256 totalSupply,
        uint256 initialFdv,
        int24 tickLower,
        int24 tickUpper
    );

    constructor(
        address _poolManager,
        address _positionManager,
        address _lpLocker
    ) {
        poolManager = IPoolManager(_poolManager);
        positionManager = IPositionManager(_positionManager);
        lpLocker = IPumpClawLPLocker(_lpLocker);
    }

    /// @notice Create a new token with concentrated liquidity pool
    /// @param name Token name
    /// @param symbol Token symbol  
    /// @param imageUrl Token image URL
    /// @param websiteUrl Token website URL
    /// @param totalSupply Total token supply (e.g., 1_000_000_000e18)
    /// @param initialFdv Initial fully diluted valuation in wei (e.g., 20e18 for 20 ETH)
    /// @param creator Address that receives creator rights (fee claims)
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        string calldata websiteUrl,
        uint256 totalSupply,
        uint256 initialFdv,
        address creator
    ) external nonReentrant returns (address token, uint256 positionId) {
        require(totalSupply > 0, "Supply required");
        require(initialFdv > 0, "FDV required");
        require(creator != address(0), "Invalid creator");

        // Deploy token - mints full supply to this contract
        PumpClawToken newToken = new PumpClawToken(
            name,
            symbol,
            totalSupply,
            creator,
            imageUrl,
            websiteUrl
        );
        token = address(newToken);

        // Determine token order (V4 requires currency0 < currency1)
        // Native ETH (address(0)) is always < any token address, so ETH is always currency0
        bool tokenIsToken0 = token < NATIVE_ETH; // Always false since address(0) < any address
        Currency currency0 = Currency.wrap(NATIVE_ETH); // ETH
        Currency currency1 = Currency.wrap(token);      // Token

        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });

        // Calculate ticks for concentrated liquidity
        // ETH is always currency0 (address(0) < any token address)
        // Token is always currency1
        // 
        // price = token1/token0 = Token/ETH (tokens per ETH)
        // Low price = few tokens per ETH = token is valuable
        // At upper tick, position holds 100% token1 (Token)
        // So we set current price at upper tick for single-sided token deposit
        
        int24 tickLower;
        int24 tickUpper;
        uint160 sqrtPriceX96;
        
        // sqrtPrice for FDV: price = supply/FDV (tokens per ETH)
        sqrtPriceX96 = _calculateSqrtPrice(totalSupply, initialFdv);
        tickUpper = _getTickFromSqrtPrice(sqrtPriceX96);
        tickUpper = _alignTick(tickUpper, TICK_SPACING);
        
        // Lower tick: 100x price range (price goes down = token more valuable)
        int24 tickRange = _getTicksForMultiplier(PRICE_RANGE_MULTIPLIER);
        tickLower = tickUpper - tickRange;
        tickLower = _alignTick(tickLower, TICK_SPACING);
        
        // Ensure within bounds
        if (tickLower < TickMath.minUsableTick(TICK_SPACING)) {
            tickLower = TickMath.minUsableTick(TICK_SPACING);
        }
        
        // Set initial price exactly at upper tick (single-sided token)
        sqrtPriceX96 = TickMath.getSqrtPriceAtTick(tickUpper);

        // Initialize pool at the boundary price
        positionManager.initializePool(poolKey, sqrtPriceX96);

        // Calculate liquidity for single-sided deposit
        // At upper tick boundary, we deposit 100% token1 (Token), 0% ETH
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            0,           // amount0 (ETH) = 0
            totalSupply  // amount1 (Token) = full supply
        );

        // Transfer tokens to PositionManager
        IERC20(token).safeTransfer(address(positionManager), totalSupply);

        // Build actions - NO WRAP needed since no ETH
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE),
            uint8(Actions.SWEEP)
        );

        bytes[] memory params = new bytes[](3);
        
        // MINT_POSITION
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            MAX_SLIPPAGE,
            MAX_SLIPPAGE,
            address(lpLocker),
            bytes("")
        );
        
        // SETTLE token (from PositionManager's balance)
        params[1] = abi.encode(Currency.wrap(token), ActionConstants.OPEN_DELTA, false);
        
        // SWEEP any excess tokens back
        params[2] = abi.encode(Currency.wrap(token), msg.sender);

        // Execute - NO msg.value since no ETH needed!
        positionId = positionManager.nextTokenId();
        positionManager.modifyLiquidities(
            abi.encode(actions, params),
            block.timestamp + 60
        );

        // Lock LP
        lpLocker.lockPosition(token, positionId, creator);

        // Register
        tokens.push(TokenInfo({
            token: token,
            creator: creator,
            positionId: positionId,
            totalSupply: totalSupply,
            initialFdv: initialFdv,
            createdAt: block.timestamp,
            name: name,
            symbol: symbol
        }));
        tokenIndex[token] = tokens.length;
        tokensByCreator[creator].push(tokens.length - 1);

        emit TokenCreated(token, creator, name, symbol, positionId, totalSupply, initialFdv, tickLower, tickUpper);
    }

    // View functions
    function getTokenCount() external view returns (uint256) {
        return tokens.length;
    }

    function getTokens(uint256 startIndex, uint256 endIndex) external view returns (TokenInfo[] memory) {
        require(startIndex < endIndex, "Invalid range");
        if (endIndex > tokens.length) endIndex = tokens.length;
        
        uint256 length = endIndex - startIndex;
        TokenInfo[] memory result = new TokenInfo[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = tokens[startIndex + i];
        }
        return result;
    }

    function getTokenInfo(address token) external view returns (TokenInfo memory) {
        uint256 idx = tokenIndex[token];
        require(idx > 0, "Token not found");
        return tokens[idx - 1];
    }

    function getTokensByCreator(address creator) external view returns (uint256[] memory) {
        return tokensByCreator[creator];
    }

    // Internal helpers
    
    function _calculateSqrtPrice(uint256 amount1, uint256 amount0) internal pure returns (uint160) {
        require(amount0 > 0, "amount0 zero");
        uint256 ratio = (amount1 * 1e18) / amount0;
        uint256 sqrtRatio = _sqrt(ratio);
        return uint160((sqrtRatio * (1 << 96)) / 1e9);
    }

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
    
    function _getTickFromSqrtPrice(uint160 sqrtPriceX96) internal pure returns (int24) {
        return TickMath.getTickAtSqrtPrice(sqrtPriceX96);
    }
    
    function _alignTick(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        // Round down to nearest tick spacing
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--;
        return compressed * tickSpacing;
    }
    
    function _getTicksForMultiplier(uint256 multiplier) internal pure returns (int24) {
        // Each tick represents ~0.01% price change
        // 100x = 10000% = 1000000 basis points
        // log(100) / log(1.0001) ≈ 46052 ticks
        // Simplified: multiplier of N needs ~23026 * ln(N) ticks
        // For 100x: ~106000 ticks, but we'll use a simpler approximation
        
        // Approximate: 100x ≈ 92000 ticks (conservative)
        if (multiplier >= 100) return 92000;
        if (multiplier >= 10) return 23000;
        return 4600; // ~2x
    }

    receive() external payable {}
}
