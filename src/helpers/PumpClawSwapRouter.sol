// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function transfer(address, uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/// @title PumpClawSwapRouter
/// @notice Simple swap router specifically for PumpClaw tokens on Uniswap V4
/// @dev Handles WETH wrapping and V4 settlement correctly
contract PumpClawSwapRouter is IUnlockCallback {
    using SafeERC20 for IERC20;

    IPoolManager public immutable poolManager;
    IWETH public immutable weth;
    
    uint24 public constant LP_FEE = 10000; // 1%
    int24 public constant TICK_SPACING = 200;
    uint160 constant MIN_SQRT_PRICE = 4295128740;
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341;

    struct SwapData {
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
        address payer;
        address recipient;
    }

    event TokensBought(address indexed buyer, address indexed token, uint256 ethIn, uint256 tokensOut);
    event TokensSold(address indexed seller, address indexed token, uint256 tokensIn, uint256 ethOut);

    constructor(address _poolManager, address _weth) {
        poolManager = IPoolManager(_poolManager);
        weth = IWETH(_weth);
    }

    /// @notice Buy tokens with ETH
    /// @param token The PumpClaw token to buy
    /// @param minTokensOut Minimum tokens to receive (slippage protection)
    function buyTokens(address token, uint256 minTokensOut) external payable returns (uint256 tokensOut) {
        require(msg.value > 0, "No ETH sent");
        
        // Wrap ETH to WETH
        weth.deposit{value: msg.value}();
        
        // Build pool key (sorted)
        (address t0, address t1) = address(weth) < token 
            ? (address(weth), token) 
            : (token, address(weth));
            
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(t0),
            currency1: Currency.wrap(t1),
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });
        
        // Swap direction: sell WETH (input), receive token (output)
        // If WETH is t0, we sell t0 to get t1 -> zeroForOne = true
        // If WETH is t1, we sell t1 to get t0 -> zeroForOne = false
        bool zeroForOne = address(weth) == t0;
        
        // Execute swap
        SwapData memory data = SwapData({
            key: key,
            zeroForOne: zeroForOne,
            amountSpecified: -int256(msg.value), // Negative = exact input
            payer: address(this),
            recipient: msg.sender
        });
        
        bytes memory result = poolManager.unlock(abi.encode(data));
        (int256 delta0, int256 delta1) = abi.decode(result, (int256, int256));
        
        // Calculate tokens received
        // Positive delta = we receive that currency (output)
        tokensOut = uint256(zeroForOne ? delta1 : delta0);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        
        // Transfer tokens to buyer
        IERC20(token).safeTransfer(msg.sender, tokensOut);
        
        emit TokensBought(msg.sender, token, msg.value, tokensOut);
    }

    /// @notice Sell tokens for ETH
    /// @param token The PumpClaw token to sell
    /// @param tokensIn Amount of tokens to sell
    /// @param minEthOut Minimum ETH to receive
    function sellTokens(address token, uint256 tokensIn, uint256 minEthOut) external returns (uint256 ethOut) {
        require(tokensIn > 0, "No tokens");
        
        // Transfer tokens from seller
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        
        // Build pool key
        (address t0, address t1) = address(weth) < token 
            ? (address(weth), token) 
            : (token, address(weth));
            
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(t0),
            currency1: Currency.wrap(t1),
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });
        
        // Swap direction: sell token (input), receive WETH (output)
        bool zeroForOne = token == t0;
        
        SwapData memory data = SwapData({
            key: key,
            zeroForOne: zeroForOne,
            amountSpecified: -int256(tokensIn),
            payer: address(this),
            recipient: address(this)
        });
        
        bytes memory result = poolManager.unlock(abi.encode(data));
        (int256 delta0, int256 delta1) = abi.decode(result, (int256, int256));
        
        // Calculate WETH received (positive delta = we receive)
        uint256 wethOut = uint256(zeroForOne ? delta1 : delta0);
        require(wethOut >= minEthOut, "Slippage exceeded");
        
        // Unwrap and send ETH
        weth.withdraw(wethOut);
        (bool success,) = msg.sender.call{value: wethOut}("");
        require(success, "ETH transfer failed");
        
        ethOut = wethOut;
        emit TokensSold(msg.sender, token, tokensIn, ethOut);
    }

    /// @notice Callback from PoolManager
    function unlockCallback(bytes calldata rawData) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        
        SwapData memory data = abi.decode(rawData, (SwapData));
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(
            data.key,
            IPoolManager.SwapParams({
                zeroForOne: data.zeroForOne,
                amountSpecified: data.amountSpecified,
                sqrtPriceLimitX96: data.zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE
            }),
            ""
        );
        
        int128 delta0 = delta.amount0();
        int128 delta1 = delta.amount1();
        
        // V4 delta signs are from pool's perspective:
        // Negative delta = pool's balance decreases = we take from pool
        // Positive delta = pool's balance increases = we pay to pool
        // But for the swapper, the semantics are inverted:
        // We need to settle what we OWE (negative = we spent input)
        // We need to take what we're OWED (positive = we receive output)
        _settleOrTake(data.key.currency0, delta0);
        _settleOrTake(data.key.currency1, delta1);
        
        return abi.encode(delta0, delta1);
    }
    
    function _settleOrTake(Currency currency, int128 delta) internal {
        if (delta < 0) {
            // Negative delta = we owe the pool (input token we're spending)
            // Settle by transferring tokens to pool
            poolManager.sync(currency);
            IERC20(Currency.unwrap(currency)).safeTransfer(address(poolManager), uint256(int256(-delta)));
            poolManager.settle();
        } else if (delta > 0) {
            // Positive delta = pool owes us (output token we're receiving)
            // Take tokens from pool
            poolManager.take(currency, address(this), uint256(int256(delta)));
        }
    }

    receive() external payable {}
}
