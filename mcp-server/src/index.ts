#!/usr/bin/env node
/**
 * PumpClaw MCP Server
 *
 * Model Context Protocol server for PumpClaw — the free token launcher on Base (Uniswap V4).
 * Allows any MCP-compatible AI agent to list, inspect, and deploy tokens.
 *
 * Read-only tools (no key needed): list_tokens, get_token, get_stats
 * Write tools (BASE_PRIVATE_KEY env): deploy_token
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  type Address,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ─── Constants ──────────────────────────────────────────────────────────────

const BASE_RPC = "https://base-rpc.publicnode.com";

const CONTRACTS = {
  FACTORY: "0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90" as Address,
  LP_LOCKER: "0x6e4D241957074475741Ff42ec352b8b00217Bf5d" as Address,
  SWAP_ROUTER: "0x3A9c65f4510de85F1843145d637ae895a2Fe04BE" as Address,
  FEE_VIEWER: "0xd25Da746946531F6d8Ba42c4bC0CbF25A39b4b39" as Address,
};

const DEFAULT_SUPPLY = 1_000_000_000n * 10n ** 18n; // 1B tokens
const DEFAULT_FDV = 2n * 10n ** 18n; // 2 ETH

// ─── ABIs (minimal, only what we need) ──────────────────────────────────────

const FACTORY_ABI = [
  {
    type: "function",
    name: "getTokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokens",
    inputs: [
      { name: "startIndex", type: "uint256" },
      { name: "endIndex", type: "uint256" },
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
          { name: "symbol", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
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
          { name: "symbol", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokenMetadata",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "imageUrl", type: "string" },
      { name: "websiteUrl", type: "string" },
    ],
    stateMutability: "view",
  },
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
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
] as const;

const TOKEN_ABI = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ─── Clients ────────────────────────────────────────────────────────────────

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

function getWalletClient() {
  const key = process.env.BASE_PRIVATE_KEY;
  if (!key) throw new Error("BASE_PRIVATE_KEY env var required for deploy_token");
  const privateKey = (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({ account, chain: base, transport: http(BASE_RPC) });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatToken(t: any) {
  return {
    address: t.token,
    name: t.name,
    symbol: t.symbol,
    creator: t.creator,
    totalSupply: formatEther(t.totalSupply),
    initialFdv: `${formatEther(t.initialFdv)} ETH`,
    createdAt: new Date(Number(t.createdAt) * 1000).toISOString(),
    links: {
      pumpclaw: `https://pumpclaw.com/token/${t.token}/`,
      dexscreener: `https://dexscreener.com/base/${t.token}`,
      basescan: `https://basescan.org/token/${t.token}`,
      matcha: `https://matcha.xyz/tokens/base/${t.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
    },
  };
}

// ─── MCP Server ─────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "pumpclaw",
  version: "1.0.0",
});

// ─── Resources ──────────────────────────────────────────────────────────────

server.resource("protocol-info", "pumpclaw://info", async (uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "text/markdown",
      text: `# PumpClaw — Free Token Launcher on Base

## What is PumpClaw?
PumpClaw lets anyone launch a token on Base (Ethereum L2) for free using Uniswap V4.

## Key Features
- **Free to launch** — 0 ETH cost, no upfront payment
- **80% creator fees** — earn 80% of trading fees (vs 40% on Clanker)
- **LP locked forever** — no rug pulls, liquidity is permanent
- **Uniswap V4** — latest DEX infrastructure, full-range liquidity
- **On-chain registry** — all tokens discoverable via smart contract

## Contracts (Base Mainnet)
- Factory: ${CONTRACTS.FACTORY}
- SwapRouter: ${CONTRACTS.SWAP_ROUTER}
- LPLocker: ${CONTRACTS.LP_LOCKER}

## Links
- Website: https://pumpclaw.com
- GitHub: https://github.com/clawd800/pumpclaw
- API: https://pumpclaw.com/api/v1/tokens.json

## Protocol Config
- Default supply: 1,000,000,000 tokens
- Default FDV: 2 ETH
- Fee split: 80% creator / 20% protocol
- Price range: 100x multiplier
- LP fee: 1%
`,
    },
  ],
}));

// ─── Tools ──────────────────────────────────────────────────────────────────

// 1. list_tokens
server.tool(
  "list_tokens",
  "List all tokens launched on PumpClaw. Returns name, symbol, address, creator, and trade links.",
  {
    limit: z.number().optional().describe("Max tokens to return (default: all)"),
    offset: z.number().optional().describe("Starting offset (default: 0)"),
  },
  async ({ limit, offset }) => {
    const count = (await publicClient.readContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "getTokenCount",
    })) as bigint;

    const start = BigInt(offset ?? 0);
    const end = limit ? BigInt(Math.min(Number(start) + limit, Number(count))) : count;

    const tokens = (await publicClient.readContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "getTokens",
      args: [start, end],
    })) as any[];

    const formatted = tokens.map(formatToken);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            { totalTokens: Number(count), showing: formatted.length, tokens: formatted },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 2. get_token
server.tool(
  "get_token",
  "Get detailed info about a specific PumpClaw token by its contract address.",
  {
    address: z.string().describe("Token contract address (0x...)"),
  },
  async ({ address }) => {
    const tokenAddr = address as Address;

    const [info, metadata, supply] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddr],
      }) as Promise<any>,
      publicClient
        .readContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "getTokenMetadata",
          args: [tokenAddr],
        })
        .catch(() => ["", ""]),
      publicClient.readContract({
        address: tokenAddr,
        abi: TOKEN_ABI,
        functionName: "totalSupply",
      }) as Promise<bigint>,
    ]);

    const [imageUrl, websiteUrl] = metadata as [string, string];
    const formatted = formatToken(info);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              ...formatted,
              imageUrl: imageUrl || null,
              websiteUrl: websiteUrl || null,
              circulatingSupply: formatEther(supply),
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 3. get_stats
server.tool(
  "get_stats",
  "Get PumpClaw protocol statistics: total tokens, unique creators, fee structure.",
  {},
  async () => {
    const count = (await publicClient.readContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "getTokenCount",
    })) as bigint;

    const tokens = (await publicClient.readContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "getTokens",
      args: [0n, count],
    })) as any[];

    const uniqueCreators = new Set(tokens.map((t: any) => t.creator.toLowerCase()));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              totalTokens: Number(count),
              uniqueCreators: uniqueCreators.size,
              chain: "Base (8453)",
              dex: "Uniswap V4",
              launchCost: "0 ETH (free)",
              creatorFeeShare: "80%",
              lpLocked: "forever",
              factory: CONTRACTS.FACTORY,
              website: "https://pumpclaw.com",
              api: "https://pumpclaw.com/api/v1/tokens.json",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 4. deploy_token
server.tool(
  "deploy_token",
  "Deploy a new token on PumpClaw (Base, Uniswap V4). Requires BASE_PRIVATE_KEY env var. Free — no ETH cost.",
  {
    name: z.string().describe("Token name (e.g. 'My Cool Token')"),
    symbol: z.string().describe("Token ticker symbol (e.g. 'MCT')"),
    imageUrl: z.string().optional().describe("Token logo URL (optional)"),
    websiteUrl: z.string().optional().describe("Project website URL (optional)"),
    totalSupply: z.string().optional().describe("Total supply in tokens (default: 1000000000)"),
    initialFdv: z.string().optional().describe("Initial FDV in ETH (default: 2)"),
    creator: z.string().optional().describe("Creator address for fee attribution (default: deployer wallet)"),
  },
  async ({ name, symbol, imageUrl, websiteUrl, totalSupply, initialFdv, creator }) => {
    try {
      const wallet = getWalletClient();
      const deployerAddr = wallet.account.address;
      const creatorAddr = (creator || deployerAddr) as Address;
      const supply = totalSupply ? parseEther(totalSupply) : DEFAULT_SUPPLY;
      const fdv = initialFdv ? parseEther(initialFdv) : DEFAULT_FDV;

      const hash = await wallet.writeContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [name, symbol, imageUrl ?? "", websiteUrl ?? "", supply, fdv, creatorAddr],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // Parse the token address from logs
      let tokenAddress = "";
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === CONTRACTS.FACTORY.toLowerCase() && log.topics.length >= 3) {
          // TokenCreated event: topic[1] = token address
          tokenAddress = `0x${log.topics[1]!.slice(26)}`;
          break;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                token: {
                  address: tokenAddress,
                  name,
                  symbol,
                  totalSupply: formatEther(supply),
                  initialFdv: `${formatEther(fdv)} ETH`,
                  creator: creatorAddr,
                },
                transaction: hash,
                links: {
                  pumpclaw: `https://pumpclaw.com/token/${tokenAddress}/`,
                  dexscreener: `https://dexscreener.com/base/${tokenAddress}`,
                  basescan: `https://basescan.org/tx/${hash}`,
                  matcha: `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
                },
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: false, error: err.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("PumpClaw MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
