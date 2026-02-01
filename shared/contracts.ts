/**
 * PumpClaw Contract Addresses (Base Mainnet)
 * Single source of truth for all clients
 */

export const CONTRACTS = {
  FACTORY: "0x39FF8c5aaCbd74D7F100D86515A88a0B1b808405",
  LP_LOCKER: "0x6e4D241957074475741Ff42ec358b8b00217Bf5d",
  SWAP_ROUTER: "0x19e9A3F50a1E11B610ECE37CC6bfCD091732e396",
  FEE_VIEWER: "0x40aa5e5e562174F578b82420ea0d6f04bBb67F9f",
  // Native ETH is used instead of WETH (address(0))
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
