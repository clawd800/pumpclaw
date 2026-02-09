#!/usr/bin/env npx tsx
/**
 * Generate static API files for pumpclaw.com/api/v1/
 * 
 * Outputs:
 *   public/api/v1/tokens.json   - All tokens with metadata
 *   public/api/v1/stats.json    - Aggregate stats
 * 
 * Usage: npx tsx scripts/generate-api.ts
 */

import { createPublicClient, http, formatEther, type Address } from "viem";
import { base } from "viem/chains";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const FACTORY = "0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90" as const;
const POOL_MANAGER = "0x498581fF718922c3f8e6A244956aF099B2652b2b" as const;

// Matches the actual contract ABI (factory returns struct WITHOUT imageUrl/websiteUrl)
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
] as const;

// imageUrl and websiteUrl live on individual token contracts
const TOKEN_METADATA_ABI = [
  {
    type: "function",
    name: "imageUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "websiteUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const client = createPublicClient({
  chain: base,
  transport: http("https://base-rpc.publicnode.com"),
});

interface TokenApiEntry {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  websiteUrl: string;
  totalSupply: string;
  initialFdv: string;
  initialFdvEth: number;
  creator: string;
  createdAt: string;
  createdAtUnix: number;
  percentPurchased: number;
  links: {
    pumpclaw: string;
    trade: string;
    basescan: string;
    geckoTerminal: string;
    dexScreener: string;
  };
}

async function main() {
  console.log("🦞 Generating PumpClaw API...\n");

  const count = await client.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  });
  console.log(`Total tokens: ${count}`);

  if (count === 0n) {
    console.log("No tokens found.");
    return;
  }

  // Fetch all tokens from factory
  const tokens = await client.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokens",
    args: [0n, count],
  });

  console.log(`Fetched ${tokens.length} tokens from factory`);

  // Batch: pool balances + imageUrl + websiteUrl for each token
  const multicallContracts = tokens.flatMap((t) => [
    {
      address: t.token as Address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf" as const,
      args: [POOL_MANAGER as Address],
    },
    {
      address: t.token as Address,
      abi: TOKEN_METADATA_ABI,
      functionName: "imageUrl" as const,
    },
    {
      address: t.token as Address,
      abi: TOKEN_METADATA_ABI,
      functionName: "websiteUrl" as const,
    },
  ]);

  console.log(`Fetching metadata for ${tokens.length} tokens (${multicallContracts.length} calls)...`);
  const results = await client.multicall({ contracts: multicallContracts });

  // Build API entries
  const apiTokens: TokenApiEntry[] = tokens.map((t, i) => {
    const poolBalance = results[i * 3]?.result as bigint | undefined;
    const imageUrl = (results[i * 3 + 1]?.result as string) || "";
    const websiteUrl = (results[i * 3 + 2]?.result as string) || "";

    const totalSupply = t.totalSupply;
    const purchased = poolBalance !== undefined ? totalSupply - poolBalance : 0n;
    const percentPurchased =
      poolBalance !== undefined
        ? Number((purchased * 10000n) / totalSupply) / 100
        : 0;

    return {
      address: t.token,
      name: t.name,
      symbol: t.symbol,
      imageUrl,
      websiteUrl,
      totalSupply: formatEther(t.totalSupply),
      initialFdv: formatEther(t.initialFdv),
      initialFdvEth: Number(formatEther(t.initialFdv)),
      creator: t.creator,
      createdAt: new Date(Number(t.createdAt) * 1000).toISOString(),
      createdAtUnix: Number(t.createdAt),
      percentPurchased: Math.round(percentPurchased * 100) / 100,
      links: {
        pumpclaw: `https://pumpclaw.com/#/token/${t.token}`,
        trade: `https://matcha.xyz/tokens/base/${t.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
        basescan: `https://basescan.org/token/${t.token}`,
        geckoTerminal: `https://www.geckoterminal.com/base/tokens/${t.token}`,
        dexScreener: `https://dexscreener.com/base/${t.token}`,
      },
    };
  });

  // Unique creators
  const uniqueCreators = new Set(apiTokens.map((t) => t.creator.toLowerCase()));

  // Stats
  const stats = {
    totalTokens: apiTokens.length,
    uniqueCreators: uniqueCreators.size,
    latestToken: apiTokens[apiTokens.length - 1]?.symbol || null,
    chain: "Base (8453)",
    dex: "Uniswap V4",
    factory: FACTORY,
    feeSplit: { creator: "80%", protocol: "20%" },
    lpStatus: "locked_forever",
    launchCost: "free",
    generatedAt: new Date().toISOString(),
    endpoints: {
      tokens: "https://pumpclaw.com/api/v1/tokens.json",
      stats: "https://pumpclaw.com/api/v1/stats.json",
    },
    links: {
      website: "https://pumpclaw.com",
      github: "https://github.com/clawd800/pumpclaw",
      npm: "https://www.npmjs.com/package/pumpclaw-cli",
      farcaster: "https://farcaster.xyz/clawd",
    },
  };

  // Write files
  const outDir = resolve(dirname(new URL(import.meta.url).pathname), "../public/api/v1");
  mkdirSync(outDir, { recursive: true });

  const tokensPath = resolve(outDir, "tokens.json");
  const statsPath = resolve(outDir, "stats.json");

  writeFileSync(
    tokensPath,
    JSON.stringify(
      {
        tokens: apiTokens,
        meta: {
          count: apiTokens.length,
          generatedAt: stats.generatedAt,
          factory: FACTORY,
          chain: "Base (8453)",
        },
      },
      null,
      2
    )
  );
  writeFileSync(statsPath, JSON.stringify(stats, null, 2));

  console.log(`\n✅ Written ${apiTokens.length} tokens to ${tokensPath}`);
  console.log(`✅ Written stats to ${statsPath}`);
  console.log(`\n📡 API endpoints (after deploy):`);
  console.log(`  GET https://pumpclaw.com/api/v1/tokens.json`);
  console.log(`  GET https://pumpclaw.com/api/v1/stats.json`);
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
