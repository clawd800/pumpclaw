#!/usr/bin/env npx tsx
/**
 * PumpClaw Market Cap Tracker
 * Calculates total purchased % across all tokens as a proxy for market activity
 */

import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, FACTORY_ABI } from './constants.js';

const POOL_MANAGER = '0x498581fF718922c3f8e6A244956aF099B2652b2b';
const INITIAL_FDV_ETH = 2; // 2 ETH initial FDV per token

const client = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com'),
});

// Standard ERC20 ABI for the functions we need
const erc20Abi = parseAbi([
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
]);

async function getTokenStats(tokenAddress: `0x${string}`, symbol: string, name: string) {
  try {
    const [totalSupply, poolBalance] = await Promise.all([
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'totalSupply' }),
      client.readContract({ address: tokenAddress, abi: erc20Abi, functionName: 'balanceOf', args: [POOL_MANAGER] }),
    ]);

    const purchased = totalSupply - poolBalance;
    const purchasedPct = totalSupply > 0n 
      ? Number((purchased * 10000n) / totalSupply) / 100 
      : 0;
    
    // Estimated market cap based on bonding curve
    const multiplier = 1 + (purchasedPct / 100);
    const estimatedMcapEth = INITIAL_FDV_ETH * multiplier;

    return {
      address: tokenAddress,
      symbol,
      name,
      purchasedPct,
      estimatedMcapEth,
    };
  } catch (error: any) {
    console.error(`Error fetching ${symbol}:`, error.shortMessage || error.message);
    return null;
  }
}

async function main() {
  console.log('=== PumpClaw Market Stats ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('');

  // Get token count
  const count = await client.readContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokenCount',
  }) as bigint;

  console.log(`Total Tokens: ${count}`);
  console.log('');

  if (count === 0n) {
    console.log('No tokens found.');
    return;
  }

  // Get all tokens
  const tokens = await client.readContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [0n, count],
  }) as Array<{
    token: `0x${string}`;
    symbol: string;
    name: string;
    creator: `0x${string}`;
    initialFdv: bigint;
    createdAt: bigint;
  }>;

  // Get stats for all tokens (sequential to avoid rate limits)
  const validStats: NonNullable<Awaited<ReturnType<typeof getTokenStats>>>[] = [];
  
  for (const t of tokens) {
    const stat = await getTokenStats(t.token, t.symbol, t.name);
    if (stat) validStats.push(stat);
  }

  // Calculate totals
  let totalMcapEth = 0;
  let totalPurchasedPct = 0;

  console.log('Token Details:');
  console.log('-'.repeat(50));
  
  for (const stat of validStats) {
    console.log(`${stat.symbol}: ${stat.purchasedPct.toFixed(2)}% purchased, ~${stat.estimatedMcapEth.toFixed(2)} ETH mcap`);
    totalMcapEth += stat.estimatedMcapEth;
    totalPurchasedPct += stat.purchasedPct;
  }

  const avgPurchasedPct = validStats.length > 0 ? totalPurchasedPct / validStats.length : 0;

  console.log('');
  console.log('='.repeat(50));
  console.log('SUMMARY:');
  console.log(`  Tokens: ${validStats.length}`);
  console.log(`  Total Est. MCap: ${totalMcapEth.toFixed(2)} ETH`);
  console.log(`  Avg Purchased: ${avgPurchasedPct.toFixed(2)}%`);
  
  // JSON output for parsing
  console.log('\n--- JSON ---');
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    tokenCount: validStats.length,
    totalMcapEth: parseFloat(totalMcapEth.toFixed(2)),
    avgPurchasedPct: parseFloat(avgPurchasedPct.toFixed(2)),
  }));
}

main().catch(console.error);
