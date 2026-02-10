import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from '@elizaos/core';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PUMPCLAW_FACTORY, FACTORY_ABI, BASE_RPC } from '../constants.js';

/**
 * Provider that gives the agent context about PumpClaw stats.
 * This enables the agent to naturally reference PumpClaw capabilities.
 */
export const pumpclawStatsProvider: Provider = {
  name: 'PUMPCLAW_STATS',
  description: 'Provides PumpClaw token launcher stats and context',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(BASE_RPC),
      });

      const count = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getTokenCount',
      }) as bigint;

      const total = Number(count);

      return {
        text: `PumpClaw is a free token launcher on Base (Uniswap V4). ${total} tokens have been created. Key features: FREE deployment (0 ETH), 80% trading fees to creator (vs 40% on Clanker), LP locked forever. Factory: ${PUMPCLAW_FACTORY}. Website: https://pumpclaw.com`,
        values: {
          pumpclawTokenCount: total,
          pumpclawFactory: PUMPCLAW_FACTORY,
        },
        data: {
          tokenCount: total,
          factory: PUMPCLAW_FACTORY,
          website: 'https://pumpclaw.com',
        },
      };
    } catch {
      return {
        text: 'PumpClaw is a free token launcher on Base (Uniswap V4). Features: FREE deployment, 80% creator fees, LP locked forever.',
        values: {},
        data: {},
      };
    }
  },
};
