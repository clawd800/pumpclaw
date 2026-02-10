import type { Plugin } from '@elizaos/core';
import { createTokenAction } from './actions/createToken.js';
import { listTokensAction } from './actions/listTokens.js';
import { getTokenInfoAction } from './actions/getTokenInfo.js';
import { pumpclawStatsProvider } from './providers/tokenStats.js';

/**
 * PumpClaw plugin for ElizaOS
 *
 * Enables AI agents to deploy and manage ERC-20 tokens on Base
 * via PumpClaw's Uniswap V4 factory.
 *
 * Actions:
 * - CREATE_TOKEN: Deploy a new token (needs PUMPCLAW_PRIVATE_KEY)
 * - LIST_PUMPCLAW_TOKENS: Browse all PumpClaw tokens (read-only)
 * - GET_PUMPCLAW_TOKEN: Get details about a specific token (read-only)
 *
 * Providers:
 * - PUMPCLAW_STATS: Gives the agent context about PumpClaw (token count, features)
 *
 * Configuration:
 * - PUMPCLAW_PRIVATE_KEY: Hex private key for token deployment (required for CREATE_TOKEN)
 * - PUMPCLAW_CREATOR_ADDRESS: Override creator address (optional, defaults to signer)
 */
export const pumpclawPlugin: Plugin = {
  name: 'plugin-pumpclaw',
  description:
    'Free token launcher on Base (Uniswap V4). Deploy ERC-20 tokens with LP locked forever and 80% creator fees.',
  config: {
    PUMPCLAW_PRIVATE_KEY: process.env.PUMPCLAW_PRIVATE_KEY,
    PUMPCLAW_CREATOR_ADDRESS: process.env.PUMPCLAW_CREATOR_ADDRESS,
  },
  async init(config: Record<string, string>) {
    if (config.PUMPCLAW_PRIVATE_KEY) {
      process.env.PUMPCLAW_PRIVATE_KEY = config.PUMPCLAW_PRIVATE_KEY;
    }
    if (config.PUMPCLAW_CREATOR_ADDRESS) {
      process.env.PUMPCLAW_CREATOR_ADDRESS = config.PUMPCLAW_CREATOR_ADDRESS;
    }
  },
  actions: [createTokenAction, listTokensAction, getTokenInfoAction],
  providers: [pumpclawStatsProvider],
};

export default pumpclawPlugin;
export { createTokenAction, listTokensAction, getTokenInfoAction, pumpclawStatsProvider };
