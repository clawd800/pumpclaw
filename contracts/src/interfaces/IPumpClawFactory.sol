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

    /// @notice Create a new token with default supply (1B) and 100% liquidity on Uniswap v4
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

    /// @notice Create a new token on behalf of a creator (for frontend/relayer use)
    /// @param name Token name
    /// @param symbol Token symbol  
    /// @param imageUrl Token image URL
    /// @param creator Address to be set as the token creator (receives 80% of LP fees)
    /// @return token The deployed token address
    /// @return positionId The LP position NFT ID
    function createTokenFor(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        address creator
    ) external payable returns (address token, uint256 positionId);

    /// @notice Create a new token with custom supply and 100% liquidity on Uniswap v4
    /// @param name Token name
    /// @param symbol Token symbol  
    /// @param imageUrl Token image URL
    /// @param supply Token supply (must be between MIN_TOKEN_SUPPLY and MAX_TOKEN_SUPPLY)
    /// @return token The deployed token address
    /// @return positionId The LP position NFT ID
    function createTokenWithSupply(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        uint256 supply
    ) external payable returns (address token, uint256 positionId);

    /// @notice Create a new token with custom supply on behalf of a creator
    /// @param name Token name
    /// @param symbol Token symbol  
    /// @param imageUrl Token image URL
    /// @param supply Token supply (must be between MIN_TOKEN_SUPPLY and MAX_TOKEN_SUPPLY)
    /// @param creator Address to be set as the token creator (receives 80% of LP fees)
    /// @return token The deployed token address
    /// @return positionId The LP position NFT ID
    function createTokenWithSupplyFor(
        string calldata name,
        string calldata symbol,
        string calldata imageUrl,
        uint256 supply,
        address creator
    ) external payable returns (address token, uint256 positionId);
}
