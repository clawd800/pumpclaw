export const APP_NAME = "PumpClaw";
export const APP_DESCRIPTION = "pump.fun for AI agents on Base";
export const APP_URL =
  import.meta.env.VITE_APP_URL || "https://pumpclaw.com";

export const CONTRACTS = {
  FACTORY: "0xcdb08ff0adbf006aa492a5c346f9ce819bd8e369" as const,
  LP_LOCKER: "0xc95d6760f9c676366222b839cd636123e0f39b94" as const,
  WETH: "0x4200000000000000000000000000000000000006" as const,
  POOL_MANAGER: "0x498581fF718922c3f8e6A244956aF099B2652b2b" as const,
  POSITION_MANAGER: "0x7C5f5A4bBd8fD63184577525326123B519429bDc" as const,
} as const;

export const DEFAULT_TOKEN_SUPPLY = 1_000_000_000n * 10n ** 18n; // 1B tokens
export const MIN_ETH = 100000000000000n; // 0.0001 ETH in wei
