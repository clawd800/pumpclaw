import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { PUMPCLAW_FACTORY, FACTORY_ABI, BASE_RPC } from '../constants.js';

/**
 * LIST_TOKENS action — lists recent tokens created via PumpClaw.
 */
export const listTokensAction: Action = {
  name: 'LIST_PUMPCLAW_TOKENS',
  similes: [
    'SHOW_TOKENS',
    'GET_TOKENS',
    'PUMPCLAW_LIST',
    'BROWSE_TOKENS',
    'RECENT_TOKENS',
  ],
  description:
    'List tokens created on PumpClaw (Base, Uniswap V4). Shows name, symbol, creator, and trade links.',

  validate: async (): Promise<boolean> => true,

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(BASE_RPC),
      });

      // Get total count
      const count = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getTokenCount',
      }) as bigint;

      const total = Number(count);
      if (total === 0) {
        const msg = 'No tokens have been created on PumpClaw yet. Be the first!';
        if (callback) {
          await callback({ text: msg, actions: ['LIST_PUMPCLAW_TOKENS'], source: message.content.source });
        }
        return { text: msg, success: true, data: { total: 0, tokens: [] } };
      }

      // Parse limit from message
      const limitMatch = message.content.text?.match(/(?:last|recent|show|list)\s+(\d+)/i);
      const limit = Math.min(limitMatch ? parseInt(limitMatch[1]) : 10, 20);
      const start = Math.max(0, total - limit);

      // Fetch tokens
      const tokens = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getTokens',
        args: [BigInt(start), BigInt(total)],
      }) as any[];

      const tokenLines = tokens
        .slice()
        .reverse()
        .map((t: any, i: number) => {
          const addr = t.token as string;
          const date = new Date(Number(t.createdAt) * 1000).toISOString().split('T')[0];
          const supply = formatUnits(t.totalSupply, 18);
          const shortSupply = Number(supply) >= 1e9
            ? `${(Number(supply) / 1e9).toFixed(0)}B`
            : Number(supply) >= 1e6
            ? `${(Number(supply) / 1e6).toFixed(0)}M`
            : supply;
          return `${start + tokens.length - i}. **${t.name}** ($${t.symbol}) — ${shortSupply} supply — [Trade](https://matcha.xyz/tokens/base/${addr}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) | [Basescan](https://basescan.org/token/${addr}) — ${date}`;
        });

      const response = [
        `📊 **PumpClaw Tokens** (${total} total, showing last ${tokens.length})`,
        '',
        ...tokenLines,
        '',
        `🌐 Browse all: https://pumpclaw.com`,
      ].join('\n');

      if (callback) {
        await callback({
          text: response,
          actions: ['LIST_PUMPCLAW_TOKENS'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          total,
          tokens: tokens.map((t: any) => ({
            address: t.token,
            name: t.name,
            symbol: t.symbol,
            creator: t.creator,
            totalSupply: t.totalSupply.toString(),
            createdAt: Number(t.createdAt),
          })),
        },
      };
    } catch (error) {
      const errMsg = `❌ Failed to list tokens: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ error }, 'LIST_PUMPCLAW_TOKENS error');
      if (callback) {
        await callback({ text: errMsg, actions: ['LIST_PUMPCLAW_TOKENS'], source: message.content.source });
      }
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: { text: 'Show me the latest PumpClaw tokens', actions: [] },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '📊 **PumpClaw Tokens** (27 total, showing last 10)\n\n27. **clawdnews** ($clawdnews) — 1B supply\n26. **ClawspeedGO** ($ClawspeedGo) — 1B supply\n...',
          actions: ['LIST_PUMPCLAW_TOKENS'],
        },
      },
    ],
  ],
};
