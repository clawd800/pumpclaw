// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPumpClawLPLocker {
    event PositionLocked(address indexed token, uint256 indexed positionId, address indexed creator);
    event FeesClaimed(address indexed token, uint256 amount0, uint256 amount1, uint256 creatorShare0, uint256 creatorShare1);

    /// @notice Set the factory address (can only be set once)
    function setFactory(address _factory) external;

    /// @notice Lock an LP position for a token (only callable by factory)
    function lockPosition(address token, uint256 positionId, address creator) external;

    /// @notice Collect and distribute fees for a token's LP position
    function claimFees(address token) external;

    /// @notice Get position info for a token
    function getPosition(address token) external view returns (uint256 positionId, address creator);
}
