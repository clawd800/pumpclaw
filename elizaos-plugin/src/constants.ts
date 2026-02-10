/**
 * PumpClaw contract addresses on Base mainnet
 */
export const PUMPCLAW_FACTORY = '0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90' as const;
export const BASE_CHAIN_ID = 8453;
export const BASE_RPC = 'https://base-rpc.publicnode.com';

export const FACTORY_ABI = [
  {
    type: 'function',
    name: 'createToken',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'imageUrl', type: 'string' },
      { name: 'websiteUrl', type: 'string' },
      { name: 'totalSupply', type: 'uint256' },
      { name: 'initialFdv', type: 'uint256' },
      { name: 'creator', type: 'address' },
    ],
    outputs: [
      { name: 'token', type: 'address' },
      { name: 'positionId', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getTokenCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokens',
    inputs: [
      { name: 'startIndex', type: 'uint256' },
      { name: 'endIndex', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'token', type: 'address' },
          { name: 'creator', type: 'address' },
          { name: 'positionId', type: 'uint256' },
          { name: 'totalSupply', type: 'uint256' },
          { name: 'initialFdv', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokenInfo',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'creator', type: 'address' },
          { name: 'positionId', type: 'uint256' },
          { name: 'totalSupply', type: 'uint256' },
          { name: 'initialFdv', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'TokenCreated',
    inputs: [
      { name: 'token', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'symbol', type: 'string', indexed: false },
      { name: 'positionId', type: 'uint256', indexed: false },
      { name: 'totalSupply', type: 'uint256', indexed: false },
      { name: 'initialFdv', type: 'uint256', indexed: false },
      { name: 'tickLower', type: 'int24', indexed: false },
      { name: 'tickUpper', type: 'int24', indexed: false },
    ],
    anonymous: false,
  },
] as const;
