/**
 * PumpClaw Contract Addresses (Base Mainnet)
 * Single source of truth for all clients
 */

export const CONTRACTS = {
  FACTORY: "0x0AA1DB287745a2ad9c6Ac8C97C2c3DFefd4Fd2b6",
  LP_LOCKER: "0x9516F16F966191308871E97702777ddE004Da9ba",
  WETH: "0x4200000000000000000000000000000000000006",
  POOL_MANAGER: "0x498581fF718922c3f8e6A244956aF099B2652b2b",
  POSITION_MANAGER: "0x7C5f5A4bBd8fD63184577525326123B519429bDc",
} as const;

export const CHAIN = {
  ID: 8453,
  NAME: "Base",
  RPC: "https://base-rpc.publicnode.com",
} as const;

export const TOKEN_DEFAULTS = {
  SUPPLY: 1_000_000_000n * 10n ** 18n, // 1B tokens (default, configurable)
  FDV: 20n * 10n ** 18n, // 20 ETH (default, configurable)
} as const;

export const PROTOCOL_CONFIG = {
  PRICE_RANGE_MULTIPLIER: 100n, // 100x (fixed in contract)
  LP_FEE_BPS: 10000, // 1% (fixed in contract)
  CREATOR_FEE_BPS: 8000, // 80% of LP fees (fixed in contract)
} as const;

// Also export as JSON for non-TS consumers
export const CONTRACTS_JSON = JSON.stringify(CONTRACTS, null, 2);
