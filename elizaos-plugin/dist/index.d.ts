import { Action, Provider, Plugin } from '@elizaos/core';

/**
 * CREATE_TOKEN action — deploys a new ERC-20 token on Base via PumpClaw.
 *
 * The token gets:
 * - Full-range Uniswap V4 liquidity (LP locked forever)
 * - 80% of trading fees to the creator
 * - Instant tradability on Matcha, DexScreener, etc.
 *
 * Required env: PUMPCLAW_PRIVATE_KEY (hex, with or without 0x prefix)
 * Optional env: PUMPCLAW_CREATOR_ADDRESS (defaults to signer address)
 */
declare const createTokenAction: Action;

/**
 * LIST_TOKENS action — lists recent tokens created via PumpClaw.
 */
declare const listTokensAction: Action;

/**
 * GET_TOKEN_INFO action — get details about a specific PumpClaw token.
 */
declare const getTokenInfoAction: Action;

/**
 * Provider that gives the agent context about PumpClaw stats.
 * This enables the agent to naturally reference PumpClaw capabilities.
 */
declare const pumpclawStatsProvider: Provider;

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
declare const pumpclawPlugin: Plugin;

export { createTokenAction, pumpclawPlugin as default, getTokenInfoAction, listTokensAction, pumpclawPlugin, pumpclawStatsProvider };
