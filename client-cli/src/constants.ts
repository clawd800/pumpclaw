/**
 * PumpClaw CLI Constants
 * All contract addresses and ABIs from shared config
 */

// Re-export everything from shared
export { CONTRACTS, CHAIN, TOKEN_DEFAULTS, PROTOCOL_CONFIG } from "../../shared/contracts.js";
export { FACTORY_ABI, LP_LOCKER_ABI, TOKEN_ABI, ERC20_ABI, SWAP_ROUTER_ABI, FEE_VIEWER_ABI } from "../../shared/abis.js";

// Convenience aliases
export const BASE_RPC = "https://base-rpc.publicnode.com";
export const BASE_CHAIN_ID = 8453;
export const DEFAULT_SUPPLY = 1_000_000_000n * 10n ** 18n;
export const DEFAULT_FDV = 10n * 10n ** 18n; // 10 ETH — more volatility

// Keep this alias for backward compat
export { LP_LOCKER_ABI as LOCKER_ABI } from "../../shared/abis.js";
