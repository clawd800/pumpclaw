// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPumpClawLPLocker {
    event PositionLocked(address indexed token, uint256 indexed positionId, address indexed creator);
    event FeesClaimed(address indexed token, uint256 amount0, uint256 amount1, uint256 creatorShare0, uint256 creatorShare1);
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    /// @notice Set the factory address (can only be set once)
    function setFactory(address _factory) external;

    /// @notice Initiate admin transfer (two-step for safety)
    function transferAdmin(address newAdmin) external;

    /// @notice Accept admin transfer (must be called by pending admin)
    function acceptAdmin() external;

    /// @notice Lock an LP position for a token (only callable by factory)
    function lockPosition(address token, uint256 positionId, address creator) external;

    /// @notice Collect and distribute fees for a token's LP position
    function claimFees(address token) external;

    /// @notice Get position info for a token
    function getPosition(address token) external view returns (uint256 positionId, address creator);
}
