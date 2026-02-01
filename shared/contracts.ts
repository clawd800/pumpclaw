/**
 * PumpClaw Contract Addresses (Base Mainnet)
 * Single source of truth for all clients
 */

export const CONTRACTS = {
  FACTORY: "0x492372BAD3CBdfB07fAe07e73E50801aAfA289FD",
  LP_LOCKER: "0x8c4d636a6733F21442D2129D2d6995D091710525",
  WETH: "0x4200000000000000000000000000000000000006",
  POOL_MANAGER: "0x498581fF718922c3f8e6A244956aF099B2652b2b",
  POSITION_MANAGER: "0x7C5f5A4bBd8fD63184577525326123B519429bDc",
} as const;

export const CHAIN = {
  ID: 8453,
  NAME: "Base",
  RPC: "https://base-rpc.publicnode.com",
} as const;

export const TOKEN_CONFIG = {
  SUPPLY: 1_000_000_000n * 10n ** 18n, // 1B tokens
  DEFAULT_FDV: 20n * 10n ** 18n, // 20 ETH
  PRICE_RANGE_MULTIPLIER: 100n, // 100x
  LP_FEE_BPS: 10000, // 1%
  CREATOR_FEE_BPS: 8000, // 80% of LP fees
} as const;

// Also export as JSON for non-TS consumers
export const CONTRACTS_JSON = JSON.stringify(CONTRACTS, null, 2);
