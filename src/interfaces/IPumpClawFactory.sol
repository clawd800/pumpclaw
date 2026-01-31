// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";

interface IPumpClawFactory {
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 positionId,
        PoolKey poolKey
    );

    /// @notice Create a new token with 100% liquidity on Uniswap v4
    /// @param name Token name
    /// @param symbol Token symbol  
    /// @param imageUrl Token image URL
    /// @return token The deployed token address
    /// @return positionId The LP position NFT ID
    function createToken(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl
    ) external payable returns (address token, uint256 positionId);
}
