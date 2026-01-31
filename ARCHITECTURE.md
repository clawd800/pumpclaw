# PumpClaw Architecture

> pump.fun for AI agents - A simplified Clanker V4 fork

## Overview

PumpClaw lets AI agents (and humans) deploy tokens on Base with automatic liquidity, locked LP, and fee distribution. Strip away Clanker's complexity, keep the battle-tested core.

## Core Contracts

### 1. PumpClaw.sol (Factory)
The main entry point. Deploys tokens and orchestrates everything.

```solidity
// Simplified from Clanker's DeploymentConfig
struct TokenConfig {
    string name;
    string symbol;
    string image;        // IPFS or URL
    string metadata;     // JSON metadata
    address creator;     // Fee recipient
    bytes32 salt;        // For deterministic addresses
}

struct PoolConfig {
    address pairedToken; // Usually WETH
    uint24 fee;          // Static fee tier (3000 = 0.3%)
    int24 initialTick;   // Starting price
}

function deployToken(
    TokenConfig calldata token,
    PoolConfig calldata pool
) external payable returns (
    address tokenAddress,
    address poolAddress
);
```

**Responsibilities:**
- Deploy new ERC20 token (PumpClawToken)
- Create Uniswap V4 pool with static fee hook
- Mint total supply to pool (or configurable split)
- Register with LpLocker for fee collection
- Emit events for indexing

### 2. PumpClawToken.sol (ERC20)
Standard ERC20 with metadata. Based on Clanker's ClankerToken.

```solidity
contract PumpClawToken is ERC20 {
    string public image;
    string public metadata;
    address public creator;
    uint256 public deployedAt;
    
    // Immutable after deployment
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _image,
        string memory _metadata,
        address _creator,
        uint256 _totalSupply
    );
}
```

### 3. PumpClawLpLocker.sol
Manages LP positions and collects fees. Simplified from ClankerLpLockerFeeConversion.

```solidity
struct LockedPosition {
    address token;
    address creator;
    uint256 positionId;    // Uniswap V4 position NFT
    uint256 lockedUntil;   // Permanent lock = type(uint256).max
    uint16 creatorFeeBps;  // e.g., 8000 = 80% to creator
    uint16 protocolFeeBps; // e.g., 2000 = 20% to protocol
}

// Called by Factory after pool creation
function lockPosition(
    address token,
    address creator,
    uint256 positionId
) external;

// Anyone can trigger fee collection (gas incentive?)
function collectFees(address token) external;

// Creator claims accumulated fees
function claimFees(address token) external;
```

**Fee Flow:**
1. Swaps happen on Uniswap → fees accrue to LP position
2. `collectFees()` harvests from Uniswap → splits to FeeLocker
3. Creator calls `claimFees()` to withdraw their share

### 4. PumpClawFeeLocker.sol
Accumulates and distributes fees. From ClankerFeeLocker.

```solidity
// Tracks claimable fees per token per recipient
mapping(address token => mapping(address recipient => uint256)) public claimable;

// Called by LpLocker when fees collected
function depositFees(
    address token,
    address recipient,
    uint256 amount
) external;

// Recipient withdraws their fees
function claim(address token) external;

// View pending fees
function pendingFees(address token, address recipient) external view returns (uint256);
```

### 5. PumpClawHook.sol (Uniswap V4 Hook)
Static fee hook. Simplified from ClankerHookStaticFee.

```solidity
// Implements IHooks for Uniswap V4
contract PumpClawHook is BaseHook {
    // Fixed fee for all PumpClaw pools
    uint24 public constant SWAP_FEE = 10000; // 1%
    
    // Protocol fee on top (goes to PumpClaw treasury)
    uint24 public constant PROTOCOL_FEE = 1000; // 0.1%
    
    // Hook callbacks
    function beforeSwap(...) external returns (bytes4);
    function afterSwap(...) external returns (bytes4);
}
```

## Simplified vs Clanker

| Feature | Clanker V4 | PumpClaw |
|---------|-----------|----------|
| Token deployment | ✅ | ✅ |
| Uniswap V4 pools | ✅ | ✅ |
| LP locking | ✅ | ✅ |
| Fee distribution | ✅ | ✅ |
| Static fees | ✅ | ✅ |
| Dynamic fees | ✅ | ❌ |
| MEV protection | ✅ | ❌ |
| Sniper auctions | ✅ | ❌ |
| Vault/vesting | ✅ | ❌ |
| Airdrops | ✅ | ❌ |
| Extensions | ✅ | ❌ |
| Multi-chain | ✅ | ❌ (Base only) |

## Deployment Flow

```
User calls deployToken(config)
         │
         ▼
┌─────────────────────┐
│   PumpClaw Factory  │
│                     │
│ 1. Deploy token     │
│ 2. Create V4 pool   │
│ 3. Add liquidity    │
│ 4. Lock LP position │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   PumpClawLpLocker  │
│                     │
│ - Holds LP NFT      │
│ - Collects fees     │
│ - Splits to locker  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  PumpClawFeeLocker  │
│                     │
│ - Accumulates fees  │
│ - Creator claims    │
└─────────────────────┘
```

## Fee Structure

```
Swap Fee: 1% (configurable per deployment?)
    │
    ├── 80% → Token Creator
    │
    └── 20% → Protocol Treasury
```

## Token Supply Distribution

Simple fixed allocation:
```
Total Supply: 1,000,000,000 (1B tokens)
    │
    └── 100% → Liquidity Pool (fully liquid from start)
```

Or with creator allocation:
```
Total Supply: 1,000,000,000 (1B tokens)
    │
    ├── 90% → Liquidity Pool
    │
    └── 10% → Creator wallet (optional, configurable)
```

## Contract Addresses (TBD)

```
Base Mainnet:
- PumpClaw Factory:    0x...
- PumpClawLpLocker:    0x...
- PumpClawFeeLocker:   0x...
- PumpClawHook:        0x...

Base Sepolia (testnet):
- PumpClaw Factory:    0x...
- ...
```

## Next Steps

1. [ ] Clone Clanker V4 contracts
2. [ ] Strip out: MEV modules, dynamic fees, extensions, airdrops, vaults
3. [ ] Simplify: Single static fee hook, basic LP locker
4. [ ] Test on Base Sepolia
5. [ ] Deploy to Base Mainnet
6. [ ] Build simple frontend at pumpclaw.com

## References

- Clanker V4: https://github.com/clanker-devco/v4-contracts
- Clanker Docs: https://clanker.gitbook.io/clanker-documentation
- Uniswap V4: https://docs.uniswap.org/contracts/v4/overview
