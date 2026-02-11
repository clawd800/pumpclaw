#!/usr/bin/env npx tsx
/**
 * Portfolio Report Script
 * 
 * Reads token balances + on-chain V4 pool prices for the trading wallet.
 * Outputs formatted report with PnL per token.
 */
import { createPublicClient, http, formatEther, encodeAbiParameters, keccak256, type Address } from 'viem';
import { base } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const WALLET = '0xF1e7fceC02c9373ACEEd9CEF9Fc5a92AE2808e8C' as const;
const FACTORY = '0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90' as const;
const POOL_MANAGER = '0x498581fF718922c3f8e6A244956aF099B2652b2b' as const;

const client = createPublicClient({
  chain: base,
  transport: http('https://base-rpc.publicnode.com'),
});

// ABIs
const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const;

const FACTORY_ABI = [
  { type: 'function', name: 'getTokenCount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'getTokens', inputs: [
    { name: 'startIndex', type: 'uint256' }, { name: 'endIndex', type: 'uint256' },
  ], outputs: [{ type: 'tuple[]', components: [
    { name: 'token', type: 'address' }, { name: 'creator', type: 'address' },
    { name: 'positionId', type: 'uint256' }, { name: 'totalSupply', type: 'uint256' },
    { name: 'initialFdv', type: 'uint256' }, { name: 'createdAt', type: 'uint256' },
    { name: 'name', type: 'string' }, { name: 'symbol', type: 'string' },
  ]}], stateMutability: 'view' },
] as const;

const EXTSLOAD_ABI = [{
  type: 'function' as const, name: 'extsload' as const,
  inputs: [{ name: 'slot', type: 'bytes32' as const }],
  outputs: [{ name: '', type: 'bytes32' as const }],
  stateMutability: 'view' as const,
}] as const;

// V4 price reading
const POOLS_SLOT = 6n;
const LP_FEE = 10000;
const TICK_SPACING = 200;
const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as const;
const Q192 = 1n << 192n;
const SCALE = 10n ** 18n;

function getEthPerToken(tokenAddress: Address): Promise<number | null> {
  const poolId = keccak256(encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'uint24' }, { type: 'int24' }, { type: 'address' }],
    [ZERO_ADDR, tokenAddress, LP_FEE, TICK_SPACING, ZERO_ADDR]
  ));
  const stateSlot = keccak256(encodeAbiParameters(
    [{ type: 'bytes32' }, { type: 'uint256' }],
    [poolId, POOLS_SLOT]
  ));

  return client.readContract({
    address: POOL_MANAGER, abi: EXTSLOAD_ABI, functionName: 'extsload', args: [stateSlot],
  }).then(slot0Data => {
    const sqrtPriceX96 = BigInt(slot0Data) & ((1n << 160n) - 1n);
    if (sqrtPriceX96 === 0n) return null;
    const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
    return Number((Q192 * SCALE) / sqrtPriceSq) / 1e18;
  }).catch(() => null);
}

// Cost basis
const COST_BASIS: Record<string, number> = {
  '0x9f4688A792b815E2AF208144Eb9DE98AF0ccEBD2': 0.01,   // COFFEE
  '0x51795eC2C14147E7382E995ADc01e7e2D82D0265': 0.01,   // FBR
  '0xED9f054C6CfdDA318E70c888F2FBa2964D70EBD4': 0.01,   // BITGOLD
  '0xa58b7AD08dA6818255C910f02247B22C6CcEb4C1': 0.01,   // USOR
  '0x62eF38777944A1150eCAACE37bDC288d8e2b1E96': 0.005,  // GXMUSK
  '0xc03d6D3B08F87f8912af9EBC333166c7F632D281': 0.005,  // UCMR
  '0x13164755190E7a42B4908CAF8B64E6F2a6c455c5': 0.005,  // NEO
  '0xEad80A1988ec1B1fbf742189882Ab1356B776C0F': 0.005,  // ALMAHDI
};
const TIER3_COST = 0.0018;

function getTier(addr: string): number {
  const cost = COST_BASIS[addr];
  if (cost === undefined) return 3;
  return cost >= 0.01 ? 1 : 2;
}

async function main() {
  const ethBal = await client.getBalance({ address: WALLET });
  const ethBalStr = parseFloat(formatEther(ethBal)).toFixed(6);

  // Get all tokens
  const count = await client.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'getTokenCount' });
  const tokenInfos = await client.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'getTokens', args: [0n, count] });

  // Check balances in parallel (batch of 10)
  const holdings: Array<{
    symbol: string; address: string; tier: number;
    balance: number; costBasis: number; currentValue: number;
    pnl: number; pnlPercent: number; ethPerToken: number;
  }> = [];

  let totalCost = 0;
  let totalValue = 0;

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < tokenInfos.length; i += batchSize) {
    const batch = tokenInfos.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(async (t) => {
      try {
        const balance = await client.readContract({
          address: t.token, abi: ERC20_ABI, functionName: 'balanceOf', args: [WALLET],
        }) as bigint;
        if (!balance || balance <= 0n) return null;
        // Only report tokens we actually hold
        const balNum = parseFloat(formatEther(balance));
        if (balNum < 0.01) return null; // Dust filter

        const ethPerToken = await getEthPerToken(t.token);
        const currentValue = ethPerToken ? balNum * ethPerToken : 0;
        // Only assign cost basis for tokens we actually bought
        const knownCost = COST_BASIS[t.token];
        const costBasis = knownCost !== undefined ? knownCost : TIER3_COST;
        const pnl = currentValue - costBasis;
        const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

        return {
          symbol: t.symbol,
          address: t.token,
          tier: getTier(t.token),
          balance: balNum,
          costBasis,
          currentValue,
          pnl,
          pnlPercent,
          ethPerToken: ethPerToken ?? 0,
        };
      } catch { return null; }
    }));

    for (const r of results) {
      if (r) {
        holdings.push(r);
        totalCost += r.costBasis;
        totalValue += r.currentValue;
      }
    }
  }

  holdings.sort((a, b) => a.tier - b.tier || b.currentValue - a.currentValue);

  // Print report
  console.log('🦞 PumpClaw Portfolio Report');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`💰 Wallet: ${WALLET}`);
  console.log(`ETH Balance: ${ethBalStr} ETH\n`);

  console.log('| Symbol       | Tier | Balance     | Cost (ETH) | Value (ETH) | PnL (ETH)  | PnL %   |');
  console.log('|-------------|------|-------------|-----------|-------------|-----------|---------|');

  for (const h of holdings) {
    const sign = h.pnl >= 0 ? '+' : '';
    console.log(
      `| ${h.symbol.padEnd(11)} | T${h.tier}   | ${h.balance.toFixed(0).padStart(11)} | ${h.costBasis.toFixed(4).padStart(9)} | ${h.currentValue.toFixed(6).padStart(11)} | ${sign}${h.pnl.toFixed(6).padStart(9)} | ${sign}${h.pnlPercent.toFixed(1)}% |`
    );
  }

  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  console.log('');
  console.log(`📊 SUMMARY`);
  console.log(`  Holdings: ${holdings.length} tokens`);
  console.log(`  Total Cost:  ${totalCost.toFixed(4)} ETH`);
  console.log(`  Total Value: ${totalValue.toFixed(6)} ETH`);
  console.log(`  Total PnL:   ${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(6)} ETH (${totalPnl >= 0 ? '+' : ''}${totalPnlPct.toFixed(1)}%)`);
  console.log(`  ETH Reserve: ${ethBalStr} ETH`);

  // Write state JSON
  const state = {
    timestamp: new Date().toISOString(),
    ethBalance: parseFloat(ethBalStr),
    holdings,
    summary: { totalHoldings: holdings.length, totalCost, totalValue, totalPnl, totalPnlPercent: totalPnlPct },
  };
  writeFileSync(join(__dirname, '../portfolio-state.json'), JSON.stringify(state, null, 2));
  console.log('\n✅ State saved to portfolio-state.json');
}

main().catch(console.error);
