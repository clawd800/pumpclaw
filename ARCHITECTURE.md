# PumpClaw Architecture

> pump.fun for AI agents on Base with Uniswap V4

## Overview

PumpClaw lets anyone deploy tokens on Base with automatic liquidity, locked LP, and fee distribution. Uses native ETH (no WETH wrapping) for gas-efficient swaps.

## Core Contracts

### 1. PumpClawFactory.sol
The main entry point. Deploys tokens and creates Uniswap V4 pools.

```solidity
function createToken(
    string name,
    string symbol,
    string imageUrl,
    string websiteUrl,
    uint256 totalSupply,  // e.g., 1_000_000_000e18
    uint256 initialFdv,   // e.g., 20e18 for 20 ETH
    address creator       // receives 80% of fees
) returns (address token, uint256 positionId)
```

**What it does:**
1. Deploy new ERC20 token (PumpClawToken)
2. Create Uniswap V4 pool with ETH/Token pair
3. Mint entire supply and add as single-sided liquidity
4. Transfer LP NFT to LPLocker (locked forever)
5. Register creator for fee claims

### 2. PumpClawToken.sol
Standard ERC20 with metadata and creator-only setters.

```solidity
contract PumpClawToken is ERC20, ERC20Permit, ERC20Burnable {
    address public immutable creator;
    string public imageUrl;
    string public websiteUrl;
    
    function setImageUrl(string newUrl) external;    // creator only
    function setWebsiteUrl(string newUrl) external;  // creator only
}
```

### 3. PumpClawLPLocker.sol
Holds LP positions forever and distributes fees.

```solidity
function claimFees(address token) external {
    // Collect fees from Uniswap V4 position
    // Split 80% to creator, 20% to admin
    // Anyone can call - distribution is automatic
}
```

### 4. PumpClawSwapRouter.sol
Simple swap interface for buying/selling tokens.

```solidity
function buyTokens(address token, uint256 minOut) payable;
function sellTokens(address token, uint256 amount, uint256 minOut);
```

### 5. PumpClawFeeViewer.sol
View contract for checking pending fees without claiming.

```solidity
function getPendingFees(address token) view returns (PendingFees);
```

## Token Economics

- **Supply**: Configurable (default 1B)
- **Initial FDV**: Configurable (default 20 ETH)
- **LP Fee**: 1% on all swaps
- **Fee Split**: 80% creator, 20% protocol

## Price Mechanics

Uses Uniswap V4 concentrated liquidity:
- Initial price set at upper tick (all tokens, no ETH)
- Price range spans 100x from initial price
- As users buy, price increases along the curve
- Single-sided deposit means no ETH required to launch

## Data Flow

```
User → Factory.createToken()
         ↓
    Deploy Token
         ↓
    Create V4 Pool (ETH/Token)
         ↓
    Add Liquidity (all tokens)
         ↓
    Transfer LP NFT → LPLocker
         ↓
    Register in Factory registry
```

## Contract Addresses (Base Mainnet V2)

| Contract | Address |
|----------|---------|
| Factory | `0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90` |
| LP Locker | `0x9047c0944c843d91951a6C91dc9f3944D826ACA8` |
| Swap Router | `0x3A9c65f4510de85F1843145d637ae895a2Fe04BE` |
| Fee Viewer | `0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39` |

## External Dependencies

- Uniswap V4 PoolManager: `0x498581fF718922c3f8e6A244956aF099B2652b2b`
- Uniswap V4 PositionManager: `0x7C5f5A4bBd8fD63184577525326123B519429bDc`
