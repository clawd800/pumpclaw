import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import { createPublicClient, createWalletClient, http, parseEther, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { PUMPCLAW_FACTORY, FACTORY_ABI, BASE_RPC } from '../constants.js';

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
export const createTokenAction: Action = {
  name: 'CREATE_TOKEN',
  similes: [
    'LAUNCH_TOKEN',
    'DEPLOY_TOKEN',
    'MINT_TOKEN',
    'CREATE_MEME_TOKEN',
    'LAUNCH_MEME_COIN',
    'PUMPCLAW_CREATE',
  ],
  description:
    'Deploy a new ERC-20 token on Base via PumpClaw with Uniswap V4 liquidity. FREE to deploy (0 ETH). 80% of trading fees go to the creator. LP locked forever.',

  validate: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const key = runtime.getSetting('PUMPCLAW_PRIVATE_KEY');
    if (!key) {
      logger.warn('PUMPCLAW_PRIVATE_KEY not set — CREATE_TOKEN action disabled');
      return false;
    }
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      // Parse token parameters from message
      const text = message.content.text || '';
      const params = parseTokenParams(text);

      if (!params.name || !params.symbol) {
        const errorMsg =
          'Please provide at least a token name and symbol. Example: "Create a token called DogeClaw with symbol DCLAW"';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ['CREATE_TOKEN'],
            source: message.content.source,
          });
        }
        return { text: errorMsg, success: false };
      }

      // Set up wallet
      const privateKey = runtime.getSetting('PUMPCLAW_PRIVATE_KEY') as `0x${string}`;
      const account = privateKeyToAccount(
        privateKey.startsWith('0x') ? privateKey as `0x${string}` : `0x${privateKey}`
      );

      const creatorAddress =
        (runtime.getSetting('PUMPCLAW_CREATOR_ADDRESS') as `0x${string}`) || account.address;

      const publicClient = createPublicClient({
        chain: base,
        transport: http(BASE_RPC),
      });

      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(BASE_RPC),
      });

      // Default values
      const totalSupply = params.totalSupply || parseUnits('1000000000', 18); // 1B tokens
      const initialFdv = params.initialFdv || parseEther('2'); // 2 ETH FDV

      logger.info(
        `Creating token: ${params.name} (${params.symbol}) — supply: ${totalSupply}, FDV: ${initialFdv}`
      );

      if (callback) {
        await callback({
          text: `🚀 Deploying **${params.name}** ($${params.symbol}) on Base via PumpClaw...`,
          actions: ['CREATE_TOKEN'],
          source: message.content.source,
        });
      }

      // Send transaction
      const hash = await walletClient.writeContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: 'createToken',
        args: [
          params.name,
          params.symbol,
          params.imageUrl || '',
          params.websiteUrl || '',
          totalSupply,
          initialFdv,
          creatorAddress,
        ],
      });

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse TokenCreated event
      let tokenAddress = '';
      for (const log of receipt.logs) {
        try {
          // TokenCreated event topic
          if (
            log.topics[0] ===
            '0x2be0360fa5c8e8b3b02ebf0d14ecab191a2e7e52f1f1a15ee79e58e9a46b2812'
          ) {
            tokenAddress = `0x${log.topics[1]?.slice(26)}`;
            break;
          }
        } catch {
          // skip non-matching logs
        }
      }

      const tradeUrl = tokenAddress
        ? `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`
        : '';
      const basescanUrl = tokenAddress
        ? `https://basescan.org/token/${tokenAddress}`
        : `https://basescan.org/tx/${hash}`;

      const successMsg = [
        `✅ **${params.name}** ($${params.symbol}) deployed on Base!`,
        '',
        tokenAddress ? `📍 Token: \`${tokenAddress}\`` : '',
        `🔗 TX: ${basescanUrl}`,
        tradeUrl ? `💱 Trade: ${tradeUrl}` : '',
        '',
        '• LP locked forever on Uniswap V4',
        '• 80% of trading fees → creator',
        '• FREE deployment (0 ETH cost)',
      ]
        .filter(Boolean)
        .join('\n');

      if (callback) {
        await callback({
          text: successMsg,
          actions: ['CREATE_TOKEN'],
          source: message.content.source,
        });
      }

      return {
        text: successMsg,
        success: true,
        data: {
          tokenAddress,
          transactionHash: hash,
          name: params.name,
          symbol: params.symbol,
          tradeUrl,
          basescanUrl,
        },
      };
    } catch (error) {
      const errMsg = `❌ Token creation failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ error }, 'CREATE_TOKEN error');
      if (callback) {
        await callback({
          text: errMsg,
          actions: ['CREATE_TOKEN'],
          source: message.content.source,
        });
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },

  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Create a token called DogeClaw with symbol DCLAW',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '✅ **DogeClaw** ($DCLAW) deployed on Base! LP locked forever on Uniswap V4. 80% of trading fees go to creator.',
          actions: ['CREATE_TOKEN'],
        },
      },
    ],
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Launch a meme coin called MoonCat, ticker MCAT, with 10 billion supply',
          actions: [],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: '🚀 Deploying **MoonCat** ($MCAT) on Base via PumpClaw... ✅ Deployed! Trade on Matcha.',
          actions: ['CREATE_TOKEN'],
        },
      },
    ],
  ],
};

/** Extract token params from natural language */
function parseTokenParams(text: string): {
  name: string;
  symbol: string;
  imageUrl?: string;
  websiteUrl?: string;
  totalSupply?: bigint;
  initialFdv?: bigint;
} {
  const result: ReturnType<typeof parseTokenParams> = { name: '', symbol: '' };

  // Try "called X with symbol Y" pattern
  const calledMatch = text.match(/called\s+["']?([^"']+?)["']?\s+(?:with\s+)?(?:symbol|ticker)\s+["']?\$?([A-Z0-9]+)/i);
  if (calledMatch) {
    result.name = calledMatch[1].trim();
    result.symbol = calledMatch[2].toUpperCase();
  }

  // Try "name X symbol Y" pattern
  if (!result.name) {
    const nameMatch = text.match(/name\s*[:=]?\s*["']?([^"',]+?)["']?\s*(?:,|\s+)(?:symbol|ticker)\s*[:=]?\s*["']?\$?([A-Z0-9]+)/i);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
      result.symbol = nameMatch[2].toUpperCase();
    }
  }

  // Try "$SYMBOL (Name)" or "$SYMBOL Name" pattern
  if (!result.name) {
    const symbolFirst = text.match(/\$([A-Z0-9]+)\s+(?:\()?([^)]+)(?:\))?/i);
    if (symbolFirst) {
      result.symbol = symbolFirst[1].toUpperCase();
      result.name = symbolFirst[2].trim();
    }
  }

  // Supply parsing
  const supplyMatch = text.match(/(\d+)\s*(billion|million|trillion|[BMT])\b/i);
  if (supplyMatch) {
    const num = parseInt(supplyMatch[1]);
    const unit = supplyMatch[2].toLowerCase();
    let multiplier = 1n;
    if (unit === 'million' || unit === 'm') multiplier = 10n ** 6n;
    if (unit === 'billion' || unit === 'b') multiplier = 10n ** 9n;
    if (unit === 'trillion' || unit === 't') multiplier = 10n ** 12n;
    result.totalSupply = BigInt(num) * multiplier * 10n ** 18n;
  }

  // Image URL
  const imgMatch = text.match(/image\s*[:=]?\s*(https?:\/\/\S+)/i);
  if (imgMatch) result.imageUrl = imgMatch[1];

  // Website URL
  const webMatch = text.match(/website\s*[:=]?\s*(https?:\/\/\S+)/i);
  if (webMatch) result.websiteUrl = webMatch[1];

  return result;
}
