// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPositionManager} from "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {Actions} from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import {PositionInfo} from "@uniswap/v4-periphery/src/libraries/PositionInfoLibrary.sol";

import {IPumpClawLPLocker} from "../interfaces/IPumpClawLPLocker.sol";

/// @title PumpClawLPLocker
/// @notice Permanently locks LP positions and distributes fees 80/20 between creator and admin
contract PumpClawLPLocker is IPumpClawLPLocker, IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant CREATOR_FEE_BPS = 8000; // 80%
    uint256 public constant BPS = 10000;

    IPositionManager public immutable positionManager;
    address public admin;
    address public pendingAdmin;
    address public factory;

    struct LockedPosition {
        uint256 positionId;
        address creator;
        bool exists;
    }

    // token address => locked position
    mapping(address => LockedPosition) public positions;

    constructor(address _positionManager, address _admin) {
        positionManager = IPositionManager(_positionManager);
        admin = _admin;
    }

    /// @notice Set the factory address (can only be set once)
    function setFactory(address _factory) external {
        require(factory == address(0), "Factory already set");
        require(_factory != address(0), "Invalid factory");
        factory = _factory;
    }

    /// @notice Initiate admin transfer (two-step for safety)
    function transferAdmin(address newAdmin) external {
        require(msg.sender == admin, "Only admin");
        require(newAdmin != address(0), "Invalid new admin");
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }

    /// @notice Accept admin transfer (must be called by pending admin)
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Only pending admin");
        address oldAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(oldAdmin, admin);
    }

    /// @notice Lock an LP position - can only be called by factory
    function lockPosition(address token, uint256 positionId, address creator) external override {
        require(msg.sender == factory, "Only factory");
        require(!positions[token].exists, "Already locked");
        require(creator != address(0), "Invalid creator");
        // Verify we own the position NFT
        require(IERC721(address(positionManager)).ownerOf(positionId) == address(this), "Position not owned");
        
        positions[token] = LockedPosition({
            positionId: positionId,
            creator: creator,
            exists: true
        });

        emit PositionLocked(token, positionId, creator);
    }

    /// @notice Collect fees and distribute 80% to creator, 20% to admin
    function claimFees(address token) external override nonReentrant {
        LockedPosition memory pos = positions[token];
        require(pos.exists, "Position not found");

        // Get pool key and position info
        (PoolKey memory poolKey, ) = positionManager.getPoolAndPositionInfo(pos.positionId);

        address token0 = Currency.unwrap(poolKey.currency0);
        address token1 = Currency.unwrap(poolKey.currency1);

        // Snapshot balances BEFORE fee collection to avoid accumulated balance bug
        uint256 balanceBefore0 = token0 == address(0) ? address(this).balance : IERC20(token0).balanceOf(address(this));
        uint256 balanceBefore1 = token1 == address(0) ? address(this).balance : IERC20(token1).balanceOf(address(this));

        // Build actions to collect fees (decrease liquidity by 0)
        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.TAKE_PAIR)
        );

        bytes[] memory params = new bytes[](2);
        
        // DECREASE_LIQUIDITY params: tokenId, liquidity (0 = just collect fees), minAmount0, minAmount1, hookData
        params[0] = abi.encode(pos.positionId, 0, 0, 0, bytes(""));
        
        // TAKE_PAIR params: currency0, currency1, recipient
        params[1] = abi.encode(poolKey.currency0, poolKey.currency1, address(this));

        // Execute fee collection
        positionManager.modifyLiquidities(abi.encode(actions, params), block.timestamp + 60);

        // Calculate actual fees collected (balance after - balance before)
        uint256 balanceAfter0 = token0 == address(0) ? address(this).balance : IERC20(token0).balanceOf(address(this));
        uint256 balanceAfter1 = token1 == address(0) ? address(this).balance : IERC20(token1).balanceOf(address(this));
        
        uint256 balance0 = balanceAfter0 - balanceBefore0;
        uint256 balance1 = balanceAfter1 - balanceBefore1;

        if (balance0 > 0 || balance1 > 0) {
            uint256 creatorShare0 = (balance0 * CREATOR_FEE_BPS) / BPS;
            uint256 creatorShare1 = (balance1 * CREATOR_FEE_BPS) / BPS;
            uint256 adminShare0 = balance0 - creatorShare0;
            uint256 adminShare1 = balance1 - creatorShare1;

            // Transfer to creator
            _transfer(token0, pos.creator, creatorShare0);
            _transfer(token1, pos.creator, creatorShare1);

            // Transfer to admin
            _transfer(token0, admin, adminShare0);
            _transfer(token1, admin, adminShare1);

            emit FeesClaimed(token, balance0, balance1, creatorShare0, creatorShare1);
        }
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool success,) = to.call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /// @notice Get position info
    function getPosition(address token) external view override returns (uint256 positionId, address creator) {
        LockedPosition memory pos = positions[token];
        return (pos.positionId, pos.creator);
    }

    /// @notice Required for receiving LP position NFTs
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /// @notice Accept ETH (for WETH unwrapping)
    receive() external payable {}
}
