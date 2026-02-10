import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { createPublicClient, http, formatUnits, formatEther, isAddress } from 'viem';
import { base } from 'viem/chains';
import { PUMPCLAW_FACTORY, FACTORY_ABI, BASE_RPC } from '../constants.js';

/**
 * GET_TOKEN_INFO action — get details about a specific PumpClaw token.
 */
export const getTokenInfoAction: Action = {
  name: 'GET_PUMPCLAW_TOKEN',
  similes: [
    'TOKEN_INFO',
    'PUMPCLAW_INFO',
    'CHECK_TOKEN',
    'TOKEN_DETAILS',
    'LOOKUP_TOKEN',
  ],
  description:
    'Get details about a specific token created on PumpClaw, including creator, supply, and trade links.',

  validate: async (): Promise<boolean> => true,

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const text = message.content.text || '';

      // Extract address from message
      const addrMatch = text.match(/(0x[a-fA-F0-9]{40})/);
      if (!addrMatch || !isAddress(addrMatch[1])) {
        const errMsg = 'Please provide a valid token address. Example: "Get info for 0x5A6977D392a8De5Bc86179CAbEbc37FC992A2E26"';
        if (callback) {
          await callback({ text: errMsg, actions: ['GET_PUMPCLAW_TOKEN'], source: message.content.source });
        }
        return { text: errMsg, success: false };
      }

      const tokenAddress = addrMatch[1] as `0x${string}`;

      const client = createPublicClient({
        chain: base,
        transport: http(BASE_RPC),
      });

      const info = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getTokenInfo',
        args: [tokenAddress],
      }) as any;

      if (!info || info.token === '0x0000000000000000000000000000000000000000') {
        const msg = `Token ${tokenAddress} was not found on PumpClaw.`;
        if (callback) {
          await callback({ text: msg, actions: ['GET_PUMPCLAW_TOKEN'], source: message.content.source });
        }
        return { text: msg, success: false };
      }

      const supply = formatUnits(info.totalSupply, 18);
      const shortSupply = Number(supply) >= 1e9
        ? `${(Number(supply) / 1e9).toFixed(0)}B`
        : Number(supply) >= 1e6
        ? `${(Number(supply) / 1e6).toFixed(0)}M`
        : supply;
      const fdv = formatEther(info.initialFdv);
      const date = new Date(Number(info.createdAt) * 1000).toISOString().replace('T', ' ').split('.')[0] + ' UTC';
      const tradeUrl = `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;

      const response = [
        `📋 **${info.name}** ($${info.symbol})`,
        '',
        `• Address: \`${tokenAddress}\``,
        `• Creator: \`${info.creator}\``,
        `• Supply: ${shortSupply}`,
        `• Initial FDV: ${fdv} ETH`,
        `• Created: ${date}`,
        '',
        `💱 [Trade on Matcha](${tradeUrl})`,
        `🔍 [Basescan](https://basescan.org/token/${tokenAddress})`,
        `📈 [DexScreener](https://dexscreener.com/base/${tokenAddress})`,
        '',
        '• LP locked forever on Uniswap V4',
        '• 80% trading fees → creator',
      ].join('\n');

      if (callback) {
        await callback({
          text: response,
          actions: ['GET_PUMPCLAW_TOKEN'],
          source: message.content.source,
        });
      }

      return {
        text: response,
        success: true,
        data: {
          address: tokenAddress,
          name: info.name,
          symbol: info.symbol,
          creator: info.creator,
          totalSupply: info.totalSupply.toString(),
          initialFdv: info.initialFdv.toString(),
          createdAt: Number(info.createdAt),
          tradeUrl,
        },
      };
    } catch (error) {
      const errMsg = `❌ Failed to get token info: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ error }, 'GET_PUMPCLAW_TOKEN error');
      if (callback) {
        await callback({ text: errMsg, actions: ['GET_PUMPCLAW_TOKEN'], source: message.content.source });
      }
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Get info about 0x5A6977D392a8De5Bc86179CAbEbc37FC992A2E26',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '📋 **PumpClaw** ($PUMPCLAW)\n\n• Supply: 1B\n• LP locked forever on Uniswap V4\n• 80% trading fees → creator',
          actions: ['GET_PUMPCLAW_TOKEN'],
        },
      },
    ],
  ],
};
