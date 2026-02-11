#!/usr/bin/env npx tsx
/**
 * Fetch trading volume data from DexScreener API for all PumpClaw tokens.
 * Outputs: public/api/v1/volume.json
 *
 * This runs at build time so the frontend can display volume badges
 * without making dozens of API calls at runtime.
 *
 * Usage: npx tsx scripts/generate-volume-data.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex/tokens";
const BATCH_SIZE = 30; // DexScreener supports multi-token queries

interface VolumeEntry {
  address: string;
  symbol: string;
  priceUsd: string | null;
  volume24h: number;
  txns24h: { buys: number; sells: number };
  fdvUsd: number | null;
  liquidityUsd: number | null;
  priceChange24h: number | null;
  pairUrl: string | null;
}

async function fetchBatch(addresses: string[]): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  // DexScreener supports comma-separated addresses
  const url = `${DEXSCREENER_API}/${addresses.join(",")}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠️ DexScreener returned ${res.status}`);
      return results;
    }
    const data = await res.json();
    const pairs = data.pairs || [];
    
    for (const pair of pairs) {
      const addr = pair.baseToken?.address?.toLowerCase();
      if (addr && !results.has(addr)) {
        results.set(addr, pair);
      }
    }
  } catch (e: any) {
    console.warn(`  ⚠️ Fetch error: ${e.message}`);
  }
  
  return results;
}

async function main() {
  console.log("📊 Fetching volume data from DexScreener...\n");
  
  // Read token list
  const tokensPath = resolve(dirname(new URL(import.meta.url).pathname), "../public/api/v1/tokens.json");
  let tokens: any[];
  try {
    const raw = readFileSync(tokensPath, "utf-8");
    tokens = JSON.parse(raw).tokens;
  } catch {
    console.error("❌ Could not read tokens.json — run generate-api.ts first");
    process.exit(1);
  }
  
  console.log(`  Found ${tokens.length} tokens`);
  
  // Fetch in batches
  const allPairs = new Map<string, any>();
  const addresses = tokens.map((t: any) => t.address);
  
  for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
    const batch = addresses.slice(i, i + BATCH_SIZE);
    console.log(`  Fetching batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(addresses.length / BATCH_SIZE)}...`);
    const results = await fetchBatch(batch);
    for (const [k, v] of results) {
      allPairs.set(k, v);
    }
    // Rate limit courtesy
    if (i + BATCH_SIZE < addresses.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Build volume entries
  const volumeData: VolumeEntry[] = tokens.map((t: any) => {
    const pair = allPairs.get(t.address.toLowerCase());
    
    if (pair) {
      return {
        address: t.address,
        symbol: t.symbol,
        priceUsd: pair.priceUsd || null,
        volume24h: Number(pair.volume?.h24 || 0),
        txns24h: {
          buys: Number(pair.txns?.h24?.buys || 0),
          sells: Number(pair.txns?.h24?.sells || 0),
        },
        fdvUsd: Number(pair.fdvUsd || 0) || null,
        liquidityUsd: Number(pair.liquidity?.usd || 0) || null,
        priceChange24h: pair.priceChange?.h24 != null ? Number(pair.priceChange.h24) : null,
        pairUrl: pair.url || null,
      };
    }
    
    return {
      address: t.address,
      symbol: t.symbol,
      priceUsd: null,
      volume24h: 0,
      txns24h: { buys: 0, sells: 0 },
      fdvUsd: null,
      liquidityUsd: null,
      priceChange24h: null,
      pairUrl: null,
    };
  });
  
  // Sort by volume (hot tokens first)
  const hot = volumeData
    .filter(v => v.volume24h > 0)
    .sort((a, b) => b.volume24h - a.volume24h);
  
  const output = {
    generatedAt: new Date().toISOString(),
    totalTokens: volumeData.length,
    activeTokens: hot.length,
    totalVolume24h: volumeData.reduce((s, v) => s + v.volume24h, 0),
    totalTxns24h: volumeData.reduce((s, v) => s + v.txns24h.buys + v.txns24h.sells, 0),
    hotTokens: hot,
    tokens: volumeData,
  };
  
  // Write
  const apiDir = resolve(dirname(new URL(import.meta.url).pathname), "../public/api/v1");
  mkdirSync(apiDir, { recursive: true });
  writeFileSync(resolve(apiDir, "volume.json"), JSON.stringify(output, null, 2) + "\n");
  
  console.log(`\n✅ Volume data updated:`);
  console.log(`   Active tokens: ${hot.length}/${volumeData.length}`);
  console.log(`   Total 24h volume: $${output.totalVolume24h.toFixed(2)}`);
  console.log(`   Total 24h txns: ${output.totalTxns24h}`);
  if (hot.length > 0) {
    console.log(`\n🔥 Hot tokens:`);
    for (const h of hot.slice(0, 5)) {
      console.log(`   $${h.symbol}: $${h.volume24h.toFixed(2)} vol, ${h.txns24h.buys}b/${h.txns24h.sells}s`);
    }
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
