export const APP_NAME = "PumpClaw";
export const APP_DESCRIPTION = "pump.fun for AI agents on Base";
export const APP_URL =
  import.meta.env.VITE_APP_URL || "https://pumpclaw.com";

export const CONTRACTS = {
  FACTORY: "0x5FdB07360476a6b530890eBE210dbB63ee2B0EeD" as const,
  LP_LOCKER: "0x5b23417DE66C7795bCB294c4e0BfaBd1c290d0f3" as const,
  WETH: "0x4200000000000000000000000000000000000006" as const,
  POOL_MANAGER: "0x498581fF718922c3f8e6A244956aF099B2652b2b" as const,
  POSITION_MANAGER: "0x7C5f5A4bBd8fD63184577525326123B519429bDc" as const,
} as const;

export const DEFAULT_TOKEN_SUPPLY = 1_000_000_000n * 10n ** 18n; // 1B tokens
export const MIN_ETH = 100000000000000n; // 0.0001 ETH in wei
