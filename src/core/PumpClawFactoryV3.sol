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

/// @title PumpClawFactoryV3
/// @notice Fair launch tokens with configurable initial FDV
/// @dev Simplified - no minimums, let market decide
contract PumpClawFactoryV3 is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant TOKEN_SUPPLY = 1_000_000_000e18; // Fixed 1B supply
    uint256 public constant DEFAULT_FDV = 30 ether; // Default FDV (~$90k at $3k ETH)
    uint24 public constant LP_FEE = 10000; // 1% fee
    int24 public constant TICK_SPACING = 200;
    
    uint128 constant MAX_SLIPPAGE = type(uint128).max;

    IPoolManager public immutable poolManager;
    IPositionManager public immutable positionManager;
    IPumpClawLPLocker public immutable lpLocker;
    address public immutable weth;

    struct TokenInfo {
        address token;
        address creator;
        uint256 positionId;
        uint256 initialFdv;
        uint256 ethLiquidity;
        uint256 tokenLiquidity;
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
        uint256 initialFdv,
        uint256 ethLiquidity,
        uint256 tokenLiquidity
    );

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

    /// @notice Create token with default FDV (30 ETH)
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl
    ) external payable returns (address token, uint256 positionId) {
        return _createToken(name, symbol, imageUrl, DEFAULT_FDV, msg.sender);
    }

    /// @notice Create token with custom FDV
    /// @param initialFdv Initial fully diluted valuation in ETH
    function createTokenWithFdv(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        uint256 initialFdv
    ) external payable returns (address token, uint256 positionId) {
        return _createToken(name, symbol, imageUrl, initialFdv, msg.sender);
    }

    /// @notice Create token on behalf of creator
    function createTokenFor(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        uint256 initialFdv,
        address creator
    ) external payable returns (address token, uint256 positionId) {
        return _createToken(name, symbol, imageUrl, initialFdv, creator);
    }

    function _createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        uint256 initialFdv,
        address creator
    ) internal nonReentrant returns (address token, uint256 positionId) {
        require(msg.value > 0, "ETH required");
        require(initialFdv > 0, "FDV required");
        require(creator != address(0), "Invalid creator");

        // Calculate token amount for liquidity based on FDV
        // tokenLiquidity = (ethDeposited / fdv) * totalSupply
        uint256 tokenLiquidity = (msg.value * TOKEN_SUPPLY) / initialFdv;
        require(tokenLiquidity > 0, "Token liquidity zero");
        require(tokenLiquidity <= TOKEN_SUPPLY, "Token liquidity exceeds supply");

        // Deploy token - mints full supply to this contract
        PumpClawToken newToken = new PumpClawToken(
            name,
            symbol,
            TOKEN_SUPPLY,
            creator,
            imageUrl
        );
        token = address(newToken);

        // Burn excess tokens for fair distribution
        uint256 tokensToBurn = TOKEN_SUPPLY - tokenLiquidity;
        if (tokensToBurn > 0) {
            IERC20(token).safeTransfer(address(0xdead), tokensToBurn);
        }

        // Setup pool
        bool tokenIsToken0 = token < weth;
        Currency currency0 = tokenIsToken0 ? Currency.wrap(token) : Currency.wrap(weth);
        Currency currency1 = tokenIsToken0 ? Currency.wrap(weth) : Currency.wrap(token);

        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });

        // Calculate sqrt price based on FDV
        uint160 sqrtPriceX96;
        if (tokenIsToken0) {
            sqrtPriceX96 = _calculateSqrtPrice(initialFdv, TOKEN_SUPPLY);
        } else {
            sqrtPriceX96 = _calculateSqrtPrice(TOKEN_SUPPLY, initialFdv);
        }

        // Initialize pool
        positionManager.initializePool(poolKey, sqrtPriceX96);

        // Full range liquidity
        int24 tickLower = TickMath.minUsableTick(TICK_SPACING);
        int24 tickUpper = TickMath.maxUsableTick(TICK_SPACING);

        // Calculate liquidity
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            tokenIsToken0 ? tokenLiquidity : msg.value,
            tokenIsToken0 ? msg.value : tokenLiquidity
        );

        // Transfer tokens to PositionManager
        IERC20(token).safeTransfer(address(positionManager), tokenLiquidity);

        // Build actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.WRAP),
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE),
            uint8(Actions.SETTLE),
            uint8(Actions.SWEEP)
        );

        bytes[] memory params = new bytes[](5);
        params[0] = abi.encode(ActionConstants.CONTRACT_BALANCE);
        params[1] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            MAX_SLIPPAGE,
            MAX_SLIPPAGE,
            address(lpLocker),
            bytes("")
        );
        params[2] = abi.encode(Currency.wrap(weth), ActionConstants.OPEN_DELTA, false);
        params[3] = abi.encode(Currency.wrap(token), ActionConstants.OPEN_DELTA, false);
        params[4] = abi.encode(Currency.wrap(weth), msg.sender);

        // Execute
        positionId = positionManager.nextTokenId();
        positionManager.modifyLiquidities{value: msg.value}(
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
            initialFdv: initialFdv,
            ethLiquidity: msg.value,
            tokenLiquidity: tokenLiquidity,
            createdAt: block.timestamp,
            name: name,
            symbol: symbol
        }));
        tokenIndex[token] = tokens.length;
        tokensByCreator[creator].push(tokens.length - 1);

        emit TokenCreated(token, creator, name, symbol, positionId, initialFdv, msg.value, tokenLiquidity);
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

    receive() external payable {}
}
