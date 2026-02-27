#!/usr/bin/env npx tsx
/**
 * PumpClaw V4 Pool Price Reader
 * Reads live prices from Uniswap V4 PoolManager via extsload
 *
 * This is novel — DexScreener/GeckoTerminal don't index V4 pools yet.
 * PumpClaw is the ONLY place to see these prices.
 */
import { createPublicClient, http, encodeAbiParameters, keccak256, formatEther } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, FACTORY_ABI } from './constants.js';
const POOL_MANAGER = CONTRACTS.POOL_MANAGER;
const POOLS_SLOT = 6n; // Storage slot of pools mapping in PoolManager
const LP_FEE = 10000; // 1%
const TICK_SPACING = 200;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const Q96 = 1n << 96n;
const Q192 = 1n << 192n;
const SCALE = 10n ** 18n;
const EXTSLOAD_ABI = [{
        type: 'function',
        name: 'extsload',
        inputs: [{ name: 'slot', type: 'bytes32' }],
        outputs: [{ name: '', type: 'bytes32' }],
        stateMutability: 'view',
    }];
const ERC20_BALANCE_ABI = [{
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    }, {
        type: 'function',
        name: 'totalSupply',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    }];
const client = createPublicClient({
    chain: base,
    transport: http('https://base-rpc.publicnode.com'),
});
function computePoolId(tokenAddress) {
    // PoolKey: (currency0=ETH, currency1=token, fee, tickSpacing, hooks=0)
    // ETH (address(0)) is always currency0 since 0x0 < any token address
    return keccak256(encodeAbiParameters([
        { type: 'address', name: 'currency0' },
        { type: 'address', name: 'currency1' },
        { type: 'uint24', name: 'fee' },
        { type: 'int24', name: 'tickSpacing' },
        { type: 'address', name: 'hooks' },
    ], [ZERO_ADDR, tokenAddress, LP_FEE, TICK_SPACING, ZERO_ADDR]));
}
function computeStateSlot(poolId) {
    // Standard Solidity mapping slot: keccak256(abi.encode(key, slot))
    return keccak256(encodeAbiParameters([{ type: 'bytes32', name: 'key' }, { type: 'uint256', name: 'slot' }], [poolId, POOLS_SLOT]));
}
async function fetchEthUsdPrice() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await res.json();
        return data?.ethereum?.usd ?? null;
    }
    catch {
        return null;
    }
}
export async function getTokenPrice(tokenAddress) {
    try {
        const poolId = computePoolId(tokenAddress);
        const stateSlot = computeStateSlot(poolId);
        const slot0Data = await client.readContract({
            address: POOL_MANAGER,
            abi: EXTSLOAD_ABI,
            functionName: 'extsload',
            args: [stateSlot],
        });
        const slot0BigInt = BigInt(slot0Data);
        const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);
        if (sqrtPriceX96 === 0n)
            return null; // Pool not initialized
        // Price math (both tokens have 18 decimals):
        // tokensPerEth = sqrtPriceX96^2 / 2^192
        // ethPerToken = 2^192 / sqrtPriceX96^2
        const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
        // Scale to 18 decimals for precision
        const ethPerTokenScaled = (Q192 * SCALE) / sqrtPriceSq;
        const ethPerToken = Number(ethPerTokenScaled) / 1e18;
        const tokensPerEthScaled = (sqrtPriceSq * SCALE) / Q192;
        const tokensPerEth = Number(tokensPerEthScaled) / 1e18;
        return { sqrtPriceX96, ethPerToken, tokensPerEth };
    }
    catch (e) {
        console.error(`Price read failed for ${tokenAddress}:`, e.shortMessage || e.message);
        return null;
    }
}
async function main() {
    console.log('=== PumpClaw V4 Price Reader ===');
    console.log(`Date: ${new Date().toISOString()}\n`);
    // Fetch ETH/USD
    const ethUsd = await fetchEthUsdPrice();
    console.log(`ETH/USD: ${ethUsd ? `$${ethUsd.toLocaleString()}` : 'unavailable'}\n`);
    // Get all tokens
    const count = await client.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getTokenCount',
    });
    const tokens = await client.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: 'getTokens',
        args: [0n, count],
    });
    console.log(`Tokens: ${tokens.length}\n`);
    console.log('-'.repeat(80));
    let totalMcapEth = 0;
    const results = [];
    for (const t of tokens) {
        const priceData = await getTokenPrice(t.token);
        if (!priceData) {
            console.log(`${t.symbol}: ❌ No price data`);
            continue;
        }
        // Get supply data for market cap
        const [totalSupply, poolBalance] = await Promise.all([
            client.readContract({ address: t.token, abi: ERC20_BALANCE_ABI, functionName: 'totalSupply' }),
            client.readContract({ address: t.token, abi: ERC20_BALANCE_ABI, functionName: 'balanceOf', args: [POOL_MANAGER] }),
        ]);
        const purchased = totalSupply - poolBalance;
        const purchasedPct = Number((purchased * 10000n) / totalSupply) / 100;
        // Market cap from real V4 price
        const totalSupplyNum = Number(formatEther(totalSupply));
        const marketCapEth = priceData.ethPerToken * totalSupplyNum;
        const marketCapUsd = ethUsd ? marketCapEth * ethUsd : null;
        const priceUsd = ethUsd ? priceData.ethPerToken * ethUsd : null;
        totalMcapEth += marketCapEth;
        const result = {
            address: t.token,
            symbol: t.symbol,
            name: t.name,
            ...priceData,
            totalSupply,
            poolBalance,
            purchasedPct,
            marketCapEth,
            marketCapUsd,
            priceUsd,
        };
        results.push(result);
        const priceStr = priceUsd
            ? `$${priceUsd < 0.01 ? priceUsd.toExponential(2) : priceUsd.toFixed(6)}`
            : `${priceData.ethPerToken.toExponential(2)} ETH`;
        const mcapStr = marketCapUsd
            ? `$${marketCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
            : `${marketCapEth.toFixed(4)} ETH`;
        console.log(`${t.symbol.padEnd(12)} | Price: ${priceStr.padEnd(16)} | MCap: ${mcapStr.padEnd(12)} | ${purchasedPct.toFixed(2)}% bought`);
    }
    console.log('-'.repeat(80));
    const totalMcapUsd = ethUsd ? totalMcapEth * ethUsd : null;
    console.log(`\nTotal MCap: ${totalMcapEth.toFixed(2)} ETH${totalMcapUsd ? ` ($${totalMcapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })})` : ''}`);
    // JSON output
    console.log('\n--- JSON ---');
    console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ethUsd,
        tokenCount: results.length,
        totalMcapEth: parseFloat(totalMcapEth.toFixed(4)),
        totalMcapUsd: totalMcapUsd ? parseFloat(totalMcapUsd.toFixed(0)) : null,
        tokens: results.map(r => ({
            symbol: r.symbol,
            address: r.address,
            priceUsd: r.priceUsd,
            ethPerToken: r.ethPerToken,
            marketCapEth: parseFloat(r.marketCapEth.toFixed(4)),
            marketCapUsd: r.marketCapUsd ? parseFloat(r.marketCapUsd.toFixed(0)) : null,
            purchasedPct: r.purchasedPct,
        })),
    }, null, 2));
}
main().catch(console.error);
