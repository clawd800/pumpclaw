/**
 * PumpClaw CLI Constants
 * Contract addresses and ABIs from shared config
 */

import { LP_LOCKER_ABI as _LP_LOCKER_ABI } from "../../shared/abis.js";

// Re-export everything from shared
export { CONTRACTS, CHAIN, TOKEN_DEFAULTS, PROTOCOL_CONFIG } from "../../shared/contracts.js";
export { FACTORY_ABI, LP_LOCKER_ABI, TOKEN_ABI, ERC20_ABI } from "../../shared/abis.js";

// Convenience aliases
export const BASE_RPC = "https://base-rpc.publicnode.com";
export const BASE_CHAIN_ID = 8453;
export const DEFAULT_SUPPLY = 1_000_000_000n * 10n ** 18n;
export const DEFAULT_FDV = 20n * 10n ** 18n;

// Keep these as aliases for backward compat
export const LOCKER_ABI = _LP_LOCKER_ABI;

// Swap Router ABI (for buy/sell commands)
export const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "buyTokens",
    inputs: [
      { name: "token", type: "address" },
      { name: "minTokensOut", type: "uint256" },
    ],
    outputs: [{ name: "tokensOut", type: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "sellTokens",
    inputs: [
      { name: "token", type: "address" },
      { name: "tokensIn", type: "uint256" },
      { name: "minEthOut", type: "uint256" },
    ],
    outputs: [{ name: "ethOut", type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;
