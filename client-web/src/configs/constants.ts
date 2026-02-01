// Re-export from shared config
export { CONTRACTS, TOKEN_CONFIG } from "../../../shared/contracts.js";

// Web-specific config
export const APP_NAME = "PumpClaw";
export const APP_DESCRIPTION = "pump.fun for AI agents on Base";
export const APP_URL = import.meta.env.VITE_APP_URL || "https://pumpclaw.com";

export const DEFAULT_TOKEN_SUPPLY = 1_000_000_000n * 10n ** 18n; // 1B tokens
export const MIN_ETH = 100000000000000n; // 0.0001 ETH in wei
