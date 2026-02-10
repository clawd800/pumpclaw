// src/actions/createToken.ts
import { logger } from "@elizaos/core";
import { createPublicClient, createWalletClient, http, parseEther, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// src/constants.ts
var PUMPCLAW_FACTORY = "0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90";
var BASE_RPC = "https://base-rpc.publicnode.com";
var FACTORY_ABI = [
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "websiteUrl", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "initialFdv", type: "uint256" },
      { name: "creator", type: "address" }
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getTokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getTokens",
    inputs: [
      { name: "startIndex", type: "uint256" },
      { name: "endIndex", type: "uint256" }
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "initialFdv", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getTokenInfo",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "initialFdv", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "TokenCreated",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "name", type: "string", indexed: false },
      { name: "symbol", type: "string", indexed: false },
      { name: "positionId", type: "uint256", indexed: false },
      { name: "totalSupply", type: "uint256", indexed: false },
      { name: "initialFdv", type: "uint256", indexed: false },
      { name: "tickLower", type: "int24", indexed: false },
      { name: "tickUpper", type: "int24", indexed: false }
    ],
    anonymous: false
  }
];

// src/actions/createToken.ts
var createTokenAction = {
  name: "CREATE_TOKEN",
  similes: [
    "LAUNCH_TOKEN",
    "DEPLOY_TOKEN",
    "MINT_TOKEN",
    "CREATE_MEME_TOKEN",
    "LAUNCH_MEME_COIN",
    "PUMPCLAW_CREATE"
  ],
  description: "Deploy a new ERC-20 token on Base via PumpClaw with Uniswap V4 liquidity. FREE to deploy (0 ETH). 80% of trading fees go to the creator. LP locked forever.",
  validate: async (runtime, _message, _state) => {
    const key = runtime.getSetting("PUMPCLAW_PRIVATE_KEY");
    if (!key) {
      logger.warn("PUMPCLAW_PRIVATE_KEY not set \u2014 CREATE_TOKEN action disabled");
      return false;
    }
    return true;
  },
  handler: async (runtime, message, _state, _options, callback, _responses) => {
    try {
      const text = message.content.text || "";
      const params = parseTokenParams(text);
      if (!params.name || !params.symbol) {
        const errorMsg = 'Please provide at least a token name and symbol. Example: "Create a token called DogeClaw with symbol DCLAW"';
        if (callback) {
          await callback({
            text: errorMsg,
            actions: ["CREATE_TOKEN"],
            source: message.content.source
          });
        }
        return { text: errorMsg, success: false };
      }
      const privateKey = runtime.getSetting("PUMPCLAW_PRIVATE_KEY");
      const account = privateKeyToAccount(
        privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
      );
      const creatorAddress = runtime.getSetting("PUMPCLAW_CREATOR_ADDRESS") || account.address;
      const publicClient = createPublicClient({
        chain: base,
        transport: http(BASE_RPC)
      });
      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(BASE_RPC)
      });
      const totalSupply = params.totalSupply || parseUnits("1000000000", 18);
      const initialFdv = params.initialFdv || parseEther("20");
      logger.info(
        `Creating token: ${params.name} (${params.symbol}) \u2014 supply: ${totalSupply}, FDV: ${initialFdv}`
      );
      if (callback) {
        await callback({
          text: `\u{1F680} Deploying **${params.name}** ($${params.symbol}) on Base via PumpClaw...`,
          actions: ["CREATE_TOKEN"],
          source: message.content.source
        });
      }
      const hash = await walletClient.writeContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [
          params.name,
          params.symbol,
          params.imageUrl || "",
          params.websiteUrl || "",
          totalSupply,
          initialFdv,
          creatorAddress
        ]
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      let tokenAddress = "";
      for (const log of receipt.logs) {
        try {
          if (log.topics[0] === "0x2be0360fa5c8e8b3b02ebf0d14ecab191a2e7e52f1f1a15ee79e58e9a46b2812") {
            tokenAddress = `0x${log.topics[1]?.slice(26)}`;
            break;
          }
        } catch {
        }
      }
      const tradeUrl = tokenAddress ? `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` : "";
      const basescanUrl = tokenAddress ? `https://basescan.org/token/${tokenAddress}` : `https://basescan.org/tx/${hash}`;
      const successMsg = [
        `\u2705 **${params.name}** ($${params.symbol}) deployed on Base!`,
        "",
        tokenAddress ? `\u{1F4CD} Token: \`${tokenAddress}\`` : "",
        `\u{1F517} TX: ${basescanUrl}`,
        tradeUrl ? `\u{1F4B1} Trade: ${tradeUrl}` : "",
        "",
        "\u2022 LP locked forever on Uniswap V4",
        "\u2022 80% of trading fees \u2192 creator",
        "\u2022 FREE deployment (0 ETH cost)"
      ].filter(Boolean).join("\n");
      if (callback) {
        await callback({
          text: successMsg,
          actions: ["CREATE_TOKEN"],
          source: message.content.source
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
          basescanUrl
        }
      };
    } catch (error) {
      const errMsg = `\u274C Token creation failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error({ error }, "CREATE_TOKEN error");
      if (callback) {
        await callback({
          text: errMsg,
          actions: ["CREATE_TOKEN"],
          source: message.content.source
        });
      }
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  },
  examples: [
    [
      {
        name: "{{userName}}",
        content: {
          text: "Create a token called DogeClaw with symbol DCLAW",
          actions: []
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "\u2705 **DogeClaw** ($DCLAW) deployed on Base! LP locked forever on Uniswap V4. 80% of trading fees go to creator.",
          actions: ["CREATE_TOKEN"]
        }
      }
    ],
    [
      {
        name: "{{userName}}",
        content: {
          text: "Launch a meme coin called MoonCat, ticker MCAT, with 10 billion supply",
          actions: []
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "\u{1F680} Deploying **MoonCat** ($MCAT) on Base via PumpClaw... \u2705 Deployed! Trade on Matcha.",
          actions: ["CREATE_TOKEN"]
        }
      }
    ]
  ]
};
function parseTokenParams(text) {
  const result = { name: "", symbol: "" };
  const calledMatch = text.match(/called\s+["']?([^"']+?)["']?\s+(?:with\s+)?(?:symbol|ticker)\s+["']?\$?([A-Z0-9]+)/i);
  if (calledMatch) {
    result.name = calledMatch[1].trim();
    result.symbol = calledMatch[2].toUpperCase();
  }
  if (!result.name) {
    const nameMatch = text.match(/name\s*[:=]?\s*["']?([^"',]+?)["']?\s*(?:,|\s+)(?:symbol|ticker)\s*[:=]?\s*["']?\$?([A-Z0-9]+)/i);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
      result.symbol = nameMatch[2].toUpperCase();
    }
  }
  if (!result.name) {
    const symbolFirst = text.match(/\$([A-Z0-9]+)\s+(?:\()?([^)]+)(?:\))?/i);
    if (symbolFirst) {
      result.symbol = symbolFirst[1].toUpperCase();
      result.name = symbolFirst[2].trim();
    }
  }
  const supplyMatch = text.match(/(\d+)\s*(billion|million|trillion|[BMT])\b/i);
  if (supplyMatch) {
    const num = parseInt(supplyMatch[1]);
    const unit = supplyMatch[2].toLowerCase();
    let multiplier = 1n;
    if (unit === "million" || unit === "m") multiplier = 10n ** 6n;
    if (unit === "billion" || unit === "b") multiplier = 10n ** 9n;
    if (unit === "trillion" || unit === "t") multiplier = 10n ** 12n;
    result.totalSupply = BigInt(num) * multiplier * 10n ** 18n;
  }
  const imgMatch = text.match(/image\s*[:=]?\s*(https?:\/\/\S+)/i);
  if (imgMatch) result.imageUrl = imgMatch[1];
  const webMatch = text.match(/website\s*[:=]?\s*(https?:\/\/\S+)/i);
  if (webMatch) result.websiteUrl = webMatch[1];
  return result;
}

// src/actions/listTokens.ts
import { logger as logger2 } from "@elizaos/core";
import { createPublicClient as createPublicClient2, http as http2, formatUnits } from "viem";
import { base as base2 } from "viem/chains";
var listTokensAction = {
  name: "LIST_PUMPCLAW_TOKENS",
  similes: [
    "SHOW_TOKENS",
    "GET_TOKENS",
    "PUMPCLAW_LIST",
    "BROWSE_TOKENS",
    "RECENT_TOKENS"
  ],
  description: "List tokens created on PumpClaw (Base, Uniswap V4). Shows name, symbol, creator, and trade links.",
  validate: async () => true,
  handler: async (_runtime, message, _state, _options, callback) => {
    try {
      const client = createPublicClient2({
        chain: base2,
        transport: http2(BASE_RPC)
      });
      const count = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokenCount"
      });
      const total = Number(count);
      if (total === 0) {
        const msg = "No tokens have been created on PumpClaw yet. Be the first!";
        if (callback) {
          await callback({ text: msg, actions: ["LIST_PUMPCLAW_TOKENS"], source: message.content.source });
        }
        return { text: msg, success: true, data: { total: 0, tokens: [] } };
      }
      const limitMatch = message.content.text?.match(/(?:last|recent|show|list)\s+(\d+)/i);
      const limit = Math.min(limitMatch ? parseInt(limitMatch[1]) : 10, 20);
      const start = Math.max(0, total - limit);
      const tokens = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokens",
        args: [BigInt(start), BigInt(total)]
      });
      const tokenLines = tokens.slice().reverse().map((t, i) => {
        const addr = t.token;
        const date = new Date(Number(t.createdAt) * 1e3).toISOString().split("T")[0];
        const supply = formatUnits(t.totalSupply, 18);
        const shortSupply = Number(supply) >= 1e9 ? `${(Number(supply) / 1e9).toFixed(0)}B` : Number(supply) >= 1e6 ? `${(Number(supply) / 1e6).toFixed(0)}M` : supply;
        return `${start + tokens.length - i}. **${t.name}** ($${t.symbol}) \u2014 ${shortSupply} supply \u2014 [Trade](https://matcha.xyz/tokens/base/${addr}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) | [Basescan](https://basescan.org/token/${addr}) \u2014 ${date}`;
      });
      const response = [
        `\u{1F4CA} **PumpClaw Tokens** (${total} total, showing last ${tokens.length})`,
        "",
        ...tokenLines,
        "",
        `\u{1F310} Browse all: https://pumpclaw.com`
      ].join("\n");
      if (callback) {
        await callback({
          text: response,
          actions: ["LIST_PUMPCLAW_TOKENS"],
          source: message.content.source
        });
      }
      return {
        text: response,
        success: true,
        data: {
          total,
          tokens: tokens.map((t) => ({
            address: t.token,
            name: t.name,
            symbol: t.symbol,
            creator: t.creator,
            totalSupply: t.totalSupply.toString(),
            createdAt: Number(t.createdAt)
          }))
        }
      };
    } catch (error) {
      const errMsg = `\u274C Failed to list tokens: ${error instanceof Error ? error.message : String(error)}`;
      logger2.error({ error }, "LIST_PUMPCLAW_TOKENS error");
      if (callback) {
        await callback({ text: errMsg, actions: ["LIST_PUMPCLAW_TOKENS"], source: message.content.source });
      }
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
  examples: [
    [
      {
        name: "{{userName}}",
        content: { text: "Show me the latest PumpClaw tokens", actions: [] }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "\u{1F4CA} **PumpClaw Tokens** (27 total, showing last 10)\n\n27. **clawdnews** ($clawdnews) \u2014 1B supply\n26. **ClawspeedGO** ($ClawspeedGo) \u2014 1B supply\n...",
          actions: ["LIST_PUMPCLAW_TOKENS"]
        }
      }
    ]
  ]
};

// src/actions/getTokenInfo.ts
import { logger as logger3 } from "@elizaos/core";
import { createPublicClient as createPublicClient3, http as http3, formatUnits as formatUnits2, formatEther as formatEther2, isAddress } from "viem";
import { base as base3 } from "viem/chains";
var getTokenInfoAction = {
  name: "GET_PUMPCLAW_TOKEN",
  similes: [
    "TOKEN_INFO",
    "PUMPCLAW_INFO",
    "CHECK_TOKEN",
    "TOKEN_DETAILS",
    "LOOKUP_TOKEN"
  ],
  description: "Get details about a specific token created on PumpClaw, including creator, supply, and trade links.",
  validate: async () => true,
  handler: async (_runtime, message, _state, _options, callback) => {
    try {
      const text = message.content.text || "";
      const addrMatch = text.match(/(0x[a-fA-F0-9]{40})/);
      if (!addrMatch || !isAddress(addrMatch[1])) {
        const errMsg = 'Please provide a valid token address. Example: "Get info for 0x5A6977D392a8De5Bc86179CAbEbc37FC992A2E26"';
        if (callback) {
          await callback({ text: errMsg, actions: ["GET_PUMPCLAW_TOKEN"], source: message.content.source });
        }
        return { text: errMsg, success: false };
      }
      const tokenAddress = addrMatch[1];
      const client = createPublicClient3({
        chain: base3,
        transport: http3(BASE_RPC)
      });
      const info = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddress]
      });
      if (!info || info.token === "0x0000000000000000000000000000000000000000") {
        const msg = `Token ${tokenAddress} was not found on PumpClaw.`;
        if (callback) {
          await callback({ text: msg, actions: ["GET_PUMPCLAW_TOKEN"], source: message.content.source });
        }
        return { text: msg, success: false };
      }
      const supply = formatUnits2(info.totalSupply, 18);
      const shortSupply = Number(supply) >= 1e9 ? `${(Number(supply) / 1e9).toFixed(0)}B` : Number(supply) >= 1e6 ? `${(Number(supply) / 1e6).toFixed(0)}M` : supply;
      const fdv = formatEther2(info.initialFdv);
      const date = new Date(Number(info.createdAt) * 1e3).toISOString().replace("T", " ").split(".")[0] + " UTC";
      const tradeUrl = `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
      const response = [
        `\u{1F4CB} **${info.name}** ($${info.symbol})`,
        "",
        `\u2022 Address: \`${tokenAddress}\``,
        `\u2022 Creator: \`${info.creator}\``,
        `\u2022 Supply: ${shortSupply}`,
        `\u2022 Initial FDV: ${fdv} ETH`,
        `\u2022 Created: ${date}`,
        "",
        `\u{1F4B1} [Trade on Matcha](${tradeUrl})`,
        `\u{1F50D} [Basescan](https://basescan.org/token/${tokenAddress})`,
        `\u{1F4C8} [DexScreener](https://dexscreener.com/base/${tokenAddress})`,
        "",
        "\u2022 LP locked forever on Uniswap V4",
        "\u2022 80% trading fees \u2192 creator"
      ].join("\n");
      if (callback) {
        await callback({
          text: response,
          actions: ["GET_PUMPCLAW_TOKEN"],
          source: message.content.source
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
          tradeUrl
        }
      };
    } catch (error) {
      const errMsg = `\u274C Failed to get token info: ${error instanceof Error ? error.message : String(error)}`;
      logger3.error({ error }, "GET_PUMPCLAW_TOKEN error");
      if (callback) {
        await callback({ text: errMsg, actions: ["GET_PUMPCLAW_TOKEN"], source: message.content.source });
      }
      return { success: false, error: error instanceof Error ? error : new Error(String(error)) };
    }
  },
  examples: [
    [
      {
        name: "{{userName}}",
        content: {
          text: "Get info about 0x5A6977D392a8De5Bc86179CAbEbc37FC992A2E26",
          actions: []
        }
      },
      {
        name: "{{agentName}}",
        content: {
          text: "\u{1F4CB} **PumpClaw** ($PUMPCLAW)\n\n\u2022 Supply: 1B\n\u2022 LP locked forever on Uniswap V4\n\u2022 80% trading fees \u2192 creator",
          actions: ["GET_PUMPCLAW_TOKEN"]
        }
      }
    ]
  ]
};

// src/providers/tokenStats.ts
import { createPublicClient as createPublicClient4, http as http4 } from "viem";
import { base as base4 } from "viem/chains";
var pumpclawStatsProvider = {
  name: "PUMPCLAW_STATS",
  description: "Provides PumpClaw token launcher stats and context",
  get: async (_runtime, _message, _state) => {
    try {
      const client = createPublicClient4({
        chain: base4,
        transport: http4(BASE_RPC)
      });
      const count = await client.readContract({
        address: PUMPCLAW_FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokenCount"
      });
      const total = Number(count);
      return {
        text: `PumpClaw is a free token launcher on Base (Uniswap V4). ${total} tokens have been created. Key features: FREE deployment (0 ETH), 80% trading fees to creator (vs 40% on Clanker), LP locked forever. Factory: ${PUMPCLAW_FACTORY}. Website: https://pumpclaw.com`,
        values: {
          pumpclawTokenCount: total,
          pumpclawFactory: PUMPCLAW_FACTORY
        },
        data: {
          tokenCount: total,
          factory: PUMPCLAW_FACTORY,
          website: "https://pumpclaw.com"
        }
      };
    } catch {
      return {
        text: "PumpClaw is a free token launcher on Base (Uniswap V4). Features: FREE deployment, 80% creator fees, LP locked forever.",
        values: {},
        data: {}
      };
    }
  }
};

// src/index.ts
var pumpclawPlugin = {
  name: "plugin-pumpclaw",
  description: "Free token launcher on Base (Uniswap V4). Deploy ERC-20 tokens with LP locked forever and 80% creator fees.",
  config: {
    PUMPCLAW_PRIVATE_KEY: process.env.PUMPCLAW_PRIVATE_KEY,
    PUMPCLAW_CREATOR_ADDRESS: process.env.PUMPCLAW_CREATOR_ADDRESS
  },
  async init(config) {
    if (config.PUMPCLAW_PRIVATE_KEY) {
      process.env.PUMPCLAW_PRIVATE_KEY = config.PUMPCLAW_PRIVATE_KEY;
    }
    if (config.PUMPCLAW_CREATOR_ADDRESS) {
      process.env.PUMPCLAW_CREATOR_ADDRESS = config.PUMPCLAW_CREATOR_ADDRESS;
    }
  },
  actions: [createTokenAction, listTokensAction, getTokenInfoAction],
  providers: [pumpclawStatsProvider]
};
var index_default = pumpclawPlugin;
export {
  createTokenAction,
  index_default as default,
  getTokenInfoAction,
  listTokensAction,
  pumpclawPlugin,
  pumpclawStatsProvider
};
