// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PositionInfo} from "@uniswap/v4-periphery/src/libraries/PositionInfoLibrary.sol";
import {FullMath} from "@uniswap/v4-core/src/libraries/FullMath.sol";
import {FixedPoint128} from "@uniswap/v4-core/src/libraries/FixedPoint128.sol";

import {IPumpClawLPLocker} from "../interfaces/IPumpClawLPLocker.sol";

/// @title PumpClawFeeViewer
/// @notice Helper contract to view pending fees for PumpClaw positions
contract PumpClawFeeViewer {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    IPositionManager public immutable positionManager;
    IPoolManager public immutable poolManager;
    IPumpClawLPLocker public immutable lpLocker;

    uint256 public constant CREATOR_FEE_BPS = 8000; // 80%
    uint256 public constant BPS = 10000;

    struct PendingFees {
        address token0;
        address token1;
        uint256 amount0;
        uint256 amount1;
        uint256 creatorAmount0;
        uint256 creatorAmount1;
        uint256 adminAmount0;
        uint256 adminAmount1;
    }

    constructor(address _positionManager, address _poolManager, address _lpLocker) {
        positionManager = IPositionManager(_positionManager);
        poolManager = IPoolManager(_poolManager);
        lpLocker = IPumpClawLPLocker(_lpLocker);
    }

    /// @notice Get pending fees for a token's locked LP position
    /// @param token The token address
    /// @return fees The pending fees breakdown
    function getPendingFees(address token) external view returns (PendingFees memory fees) {
        // Get position from locker
        (uint256 positionId, ) = lpLocker.getPosition(token);
        if (positionId == 0) return fees;

        // Get pool key and position info
        (PoolKey memory poolKey, PositionInfo posInfo) = positionManager.getPoolAndPositionInfo(positionId);
        
        fees.token0 = Currency.unwrap(poolKey.currency0);
        fees.token1 = Currency.unwrap(poolKey.currency1);

        int24 tickLower = posInfo.tickLower();
        int24 tickUpper = posInfo.tickUpper();
        
        // Get position liquidity
        uint128 liquidity = positionManager.getPositionLiquidity(positionId);
        if (liquidity == 0) return fees;

        // Calculate position key for the pool manager
        PoolId poolId = poolKey.toId();
        bytes32 positionKey = _calculatePositionKey(address(positionManager), tickLower, tickUpper, bytes32(positionId));

        // Get fee growth inside from pool manager
        (uint256 feeGrowthInside0X128, uint256 feeGrowthInside1X128) = poolManager.getFeeGrowthInside(poolId, tickLower, tickUpper);

        // Get position's last recorded fee growth
        (, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128) = poolManager.getPositionInfo(poolId, positionKey);

        // Calculate pending fees
        fees.amount0 = FullMath.mulDiv(
            feeGrowthInside0X128 - feeGrowthInside0LastX128,
            liquidity,
            FixedPoint128.Q128
        );
        fees.amount1 = FullMath.mulDiv(
            feeGrowthInside1X128 - feeGrowthInside1LastX128,
            liquidity,
            FixedPoint128.Q128
        );

        // Calculate creator/admin split
        fees.creatorAmount0 = (fees.amount0 * CREATOR_FEE_BPS) / BPS;
        fees.creatorAmount1 = (fees.amount1 * CREATOR_FEE_BPS) / BPS;
        fees.adminAmount0 = fees.amount0 - fees.creatorAmount0;
        fees.adminAmount1 = fees.amount1 - fees.creatorAmount1;
    }

    /// @notice Get pending fees for multiple tokens
    /// @param tokens Array of token addresses
    /// @return fees Array of pending fees
    function getPendingFeesBatch(address[] calldata tokens) external view returns (PendingFees[] memory fees) {
        fees = new PendingFees[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            fees[i] = this.getPendingFees(tokens[i]);
        }
    }

    /// @dev Calculate the position key for PoolManager.positions mapping
    function _calculatePositionKey(
        address owner,
        int24 tickLower,
        int24 tickUpper,
        bytes32 salt
    ) internal pure returns (bytes32 positionKey) {
        // positionKey = keccak256(abi.encodePacked(owner, tickLower, tickUpper, salt))
        assembly {
            let fmp := mload(0x40)
            mstore(add(fmp, 0x26), salt) // [0x26, 0x46)
            mstore(add(fmp, 0x06), tickUpper) // [0x23, 0x26)
            mstore(add(fmp, 0x03), tickLower) // [0x20, 0x23)
            mstore(fmp, owner) // [0x0c, 0x20)
            positionKey := keccak256(add(fmp, 0x0c), 0x3a) // len is 58 bytes
        }
    }
}
