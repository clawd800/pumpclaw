export const CONTRACTS = {
  FACTORY: "0x5FdB07360476a6b530890eBE210dbB63ee2B0EeD" as const,
  LP_LOCKER: "0x5b23417DE66C7795bCB294c4e0BfaBd1c290d0f3" as const,
  WETH: "0x4200000000000000000000000000000000000006" as const,
} as const;

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
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "createTokenFor",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "createTokenWithSupply",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "supply", type: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "createTokenWithSupplyFor",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "supply", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "payable",
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
          { name: "supply", type: "uint256" },
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
          { name: "supply", type: "uint256" },
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
      { name: "supply", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DEFAULT_TOKEN_SUPPLY",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_ETH",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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
