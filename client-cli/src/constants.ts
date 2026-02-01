export const CONTRACTS = {
  FACTORY: "0x492372BAD3CBdfB07fAe07e73E50801aAfA289FD" as const,
  LP_LOCKER: "0x8c4d636a6733F21442D2129D2d6995D091710525" as const,
  WETH: "0x4200000000000000000000000000000000000006" as const,
  POOL_MANAGER: "0x498581fF718922c3f8e6A244956aF099B2652b2b" as const,
  POSITION_MANAGER: "0x7C5f5A4bBd8fD63184577525326123B519429bDc" as const,
} as const;

export const DEFAULT_FDV = 20n * 10n ** 18n; // 20 ETH

export const BASE_RPC = "https://base-rpc.publicnode.com";
export const BASE_CHAIN_ID = 8453;

export const FACTORY_ABI = [
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenWithFdv",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "initialFdv", type: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenFor",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "initialFdv", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "DEFAULT_FDV",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "TOKEN_SUPPLY",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PRICE_RANGE_MULTIPLIER",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
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
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "positionId", type: "uint256" },
      { name: "initialFdv", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    stateMutability: "view",
  },
] as const;

export const LOCKER_ABI = [
  {
    type: "function",
    name: "claimFees",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
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
    name: "CREATOR_FEE_BPS",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const TOKEN_ABI = [
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
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
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
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;
