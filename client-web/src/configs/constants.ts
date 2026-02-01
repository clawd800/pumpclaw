/**
 * PumpClaw Web Constants
 * Re-exported from shared config
 */

export { 
  CONTRACTS, 
  CHAIN, 
  TOKEN_DEFAULTS, 
  PROTOCOL_CONFIG 
} from "../../../shared/contracts.js";

// Web-specific config
export const APP_NAME = "PumpClaw";
export const APP_DESCRIPTION = "Fair launch memecoins on Base with Uniswap V4";
export const APP_URL = import.meta.env.VITE_APP_URL || "https://pumpclaw.com";

// Form defaults
export const DEFAULT_SUPPLY = "1000000000"; // 1B
export const DEFAULT_FDV = "20"; // 20 ETH
