/**
 * PumpClaw CLI Constants
 * Contract addresses and ABIs from shared config
 */

// Re-export everything from shared
export { CONTRACTS, CHAIN, TOKEN_CONFIG } from "../../shared/contracts.js";
export { FACTORY_ABI, LP_LOCKER_ABI, TOKEN_ABI, ERC20_ABI } from "../../shared/abis.js";

// Convenience aliases
export const BASE_RPC = "https://base-rpc.publicnode.com";
export const BASE_CHAIN_ID = 8453;
export const DEFAULT_FDV = 20n * 10n ** 18n;

// Keep these as aliases for backward compat
export const LOCKER_ABI = LP_LOCKER_ABI;
