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

/// @title PumpClawSwapRouter
/// @notice Simple swap router for PumpClaw tokens on Uniswap V4 using native ETH
/// @dev Uses native ETH (no WETH wrapping) for gas efficiency
contract PumpClawSwapRouter is IUnlockCallback {
    using SafeERC20 for IERC20;

    IPoolManager public immutable poolManager;
    
    // Native ETH represented as address(0) in Uniswap V4
    address constant NATIVE_ETH = address(0);
    
    uint24 public constant LP_FEE = 10000; // 1%
    int24 public constant TICK_SPACING = 200;
    uint160 constant MIN_SQRT_PRICE = 4295128740;
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341;

    struct SwapData {
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
        address recipient;
        uint256 ethAmount; // ETH sent with the swap (for buying)
    }

    event TokensBought(address indexed buyer, address indexed token, uint256 ethIn, uint256 tokensOut);
    event TokensSold(address indexed seller, address indexed token, uint256 tokensIn, uint256 ethOut);

    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }

    /// @notice Buy tokens with native ETH
    /// @param token The PumpClaw token to buy
    /// @param minTokensOut Minimum tokens to receive (slippage protection)
    function buyTokens(address token, uint256 minTokensOut) external payable returns (uint256 tokensOut) {
        require(msg.value > 0, "No ETH sent");
        
        // Build pool key - ETH (address(0)) is always currency0
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(NATIVE_ETH),
            currency1: Currency.wrap(token),
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });
        
        // Swap direction: sell ETH (currency0) to get tokens (currency1)
        // zeroForOne = true
        SwapData memory data = SwapData({
            key: key,
            zeroForOne: true,
            amountSpecified: -int256(msg.value), // Negative = exact input
            recipient: msg.sender,
            ethAmount: msg.value
        });
        
        bytes memory result = poolManager.unlock(abi.encode(data));
        (int256 delta0, int256 delta1) = abi.decode(result, (int256, int256));
        
        // delta1 is positive = tokens we receive
        tokensOut = uint256(delta1);
        require(tokensOut >= minTokensOut, "Slippage exceeded");
        
        emit TokensBought(msg.sender, token, msg.value, tokensOut);
    }

    /// @notice Sell tokens for native ETH
    /// @param token The PumpClaw token to sell
    /// @param tokensIn Amount of tokens to sell
    /// @param minEthOut Minimum ETH to receive
    function sellTokens(address token, uint256 tokensIn, uint256 minEthOut) external returns (uint256 ethOut) {
        require(tokensIn > 0, "No tokens");
        
        // Transfer tokens from seller to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);
        
        // Build pool key - ETH is always currency0
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(NATIVE_ETH),
            currency1: Currency.wrap(token),
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(address(0))
        });
        
        // Swap direction: sell tokens (currency1) to get ETH (currency0)
        // zeroForOne = false
        SwapData memory data = SwapData({
            key: key,
            zeroForOne: false,
            amountSpecified: -int256(tokensIn), // Negative = exact input
            recipient: msg.sender,
            ethAmount: 0
        });
        
        bytes memory result = poolManager.unlock(abi.encode(data));
        (int256 delta0, int256 delta1) = abi.decode(result, (int256, int256));
        
        // delta0 is positive = ETH we receive
        ethOut = uint256(delta0);
        require(ethOut >= minEthOut, "Slippage exceeded");
        
        // Transfer ETH to seller
        (bool success,) = msg.sender.call{value: ethOut}("");
        require(success, "ETH transfer failed");
        
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
        
        // Settle currency0 (ETH)
        _settleETH(delta0, data.ethAmount);
        
        // Settle currency1 (Token)
        _settleToken(data.key.currency1, delta1, data.recipient);
        
        return abi.encode(delta0, delta1);
    }
    
    function _settleETH(int128 delta, uint256 ethAvailable) internal {
        if (delta < 0) {
            // We owe ETH to the pool (buying tokens)
            uint256 amount = uint256(int256(-delta));
            poolManager.settle{value: amount}();
            
            // Refund excess ETH if any
            if (ethAvailable > amount) {
                // Note: refund happens after callback returns
            }
        } else if (delta > 0) {
            // Pool owes us ETH (selling tokens)
            poolManager.take(Currency.wrap(NATIVE_ETH), address(this), uint256(int256(delta)));
        }
    }
    
    function _settleToken(Currency currency, int128 delta, address recipient) internal {
        if (delta < 0) {
            // We owe tokens to the pool (selling tokens)
            uint256 amount = uint256(int256(-delta));
            poolManager.sync(currency);
            IERC20(Currency.unwrap(currency)).safeTransfer(address(poolManager), amount);
            poolManager.settle();
        } else if (delta > 0) {
            // Pool owes us tokens (buying tokens)
            poolManager.take(currency, recipient, uint256(int256(delta)));
        }
    }

    receive() external payable {}
}
