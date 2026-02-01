/**
 * PumpClaw Contract ABIs
 * Auto-generated from build artifacts - do not edit manually
 * Regenerate with: forge build && extract ABIs
 */

export const FACTORY_ABI = [
  // Constants
  {
    type: "function",
    name: "PRICE_RANGE_MULTIPLIER",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "LP_FEE",
    inputs: [],
    outputs: [{ name: "", type: "uint24" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TICK_SPACING",
    inputs: [],
    outputs: [{ name: "", type: "int24" }],
    stateMutability: "view",
  },
  // Token creation (single function, all params configurable)
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "initialFdv", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  // Token queries
  {
    type: "function",
    name: "getTokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokens",
    inputs: [
      { name: "startIndex", type: "uint256" },
      { name: "endIndex", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "initialFdv", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenInfo",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "initialFdv", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokensByCreator",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokens",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "positionId", type: "uint256" },
      { name: "totalSupply", type: "uint256" },
      { name: "initialFdv", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokenIndex",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Contract references
  {
    type: "function",
    name: "lpLocker",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "poolManager",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionManager",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "weth",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "positionId", type: "uint256", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
      { name: "initialFdv", type: "uint256", indexed: false },
      { name: "tickLower", type: "int24", indexed: false },
      { name: "tickUpper", type: "int24", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export const LP_LOCKER_ABI = [
  // Constants
  {
    type: "function",
    name: "CREATOR_FEE_BPS",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "BPS",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // Fee claiming
  {
    type: "function",
    name: "claimFees",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Position queries
  {
    type: "function",
    name: "getPosition",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "positionId", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positions",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "positionId", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
  },
  // Admin
  {
    type: "function",
    name: "admin",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "factory",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "positionManager",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "FeesClaimed",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
      { name: "creatorShare0", type: "uint256", indexed: false },
      { name: "creatorShare1", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "PositionLocked",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "positionId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;

export const TOKEN_ABI = [
  // ERC20 standard
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  // PumpClaw extras
  {
    type: "function",
    name: "creator",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "imageUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "spender", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

// ERC20 minimal ABI for any token interactions
export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;
