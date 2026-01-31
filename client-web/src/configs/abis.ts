// PumpClaw Factory ABI
export const FACTORY_ABI = [
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
    ],
    name: "createToken",
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "supply", type: "uint256" },
    ],
    name: "createTokenWithSupply",
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getTokenCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "startIndex", type: "uint256" },
      { name: "endIndex", type: "uint256" },
    ],
    name: "getTokens",
    outputs: [
      {
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "supply", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "getTokenInfo",
    outputs: [
      {
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "supply", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "creator", type: "address" }],
    name: "getTokensByCreator",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "tokens",
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "positionId", type: "uint256" },
      { name: "supply", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
      { indexed: false, name: "positionId", type: "uint256" },
      {
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
        indexed: false,
        name: "poolKey",
        type: "tuple",
      },
    ],
    name: "TokenCreated",
    type: "event",
  },
] as const;

// PumpClaw LP Locker ABI
export const LP_LOCKER_ABI = [
  {
    inputs: [{ name: "token", type: "address" }],
    name: "claimFees",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }],
    name: "getPosition",
    outputs: [
      { name: "positionId", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "positions",
    outputs: [
      { name: "positionId", type: "uint256" },
      { name: "creator", type: "address" },
      { name: "exists", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount0", type: "uint256" },
      { indexed: false, name: "amount1", type: "uint256" },
      { indexed: false, name: "creatorShare0", type: "uint256" },
      { indexed: false, name: "creatorShare1", type: "uint256" },
    ],
    name: "FeesClaimed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "positionId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
    name: "PositionLocked",
    type: "event",
  },
] as const;

// PumpClaw Token ABI (ERC20 + extras)
export const TOKEN_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "creator",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "imageUrl",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
