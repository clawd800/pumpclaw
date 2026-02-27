#!/usr/bin/env npx tsx
/**
 * PumpClaw V4 Pool Price Reader
 * Reads live prices from Uniswap V4 PoolManager via extsload
 *
 * This is novel — DexScreener/GeckoTerminal don't index V4 pools yet.
 * PumpClaw is the ONLY place to see these prices.
 */
export interface TokenPrice {
    address: string;
    symbol: string;
    name: string;
    sqrtPriceX96: bigint;
    ethPerToken: number;
    tokensPerEth: number;
    totalSupply: bigint;
    poolBalance: bigint;
    purchasedPct: number;
    marketCapEth: number;
    marketCapUsd: number | null;
    priceUsd: number | null;
}
export declare function getTokenPrice(tokenAddress: `0x${string}`): Promise<{
    sqrtPriceX96: bigint;
    ethPerToken: number;
    tokensPerEth: number;
} | null>;
