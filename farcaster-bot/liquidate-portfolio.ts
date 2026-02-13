#!/usr/bin/env tsx

import { createWalletClient, createPublicClient, http, parseEther, formatEther, type Address } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PRIVATE_KEY = process.env.BASE_PRIVATE_KEY as `0x${string}`;
const RPC_URL = 'https://base-rpc.publicnode.com';
const SWAP_ROUTER = '0x3A9c65f4510de85F1843145d637ae895a2Fe04BE' as Address;

// Portfolio data from portfolio-state.json
const portfolioPath = path.join(__dirname, 'portfolio-state.json');
const portfolio = JSON.parse(fs.readFileSync(portfolioPath, 'utf-8'));

// ABIs
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  }
] as const;

const SWAP_ROUTER_ABI = [
  {
    name: 'sellTokens',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'tokensIn', type: 'uint256' },
      { name: 'minEthOut', type: 'uint256' }
    ],
    outputs: []
  }
] as const;

// Setup clients
const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL)
});

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(RPC_URL)
});

console.log(`🔧 Wallet: ${account.address}`);
console.log(`🔧 SwapRouter: ${SWAP_ROUTER}\n`);

async function sellToken(tokenAddress: Address, symbol: string, balance: number, tier: number) {
  console.log(`\n━━━ Selling ${symbol} (Tier ${tier}) ━━━`);
  console.log(`Address: ${tokenAddress}`);
  console.log(`Balance: ${balance.toLocaleString()} tokens`);

  try {
    // Get actual on-chain balance
    const onChainBalance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address]
    });

    console.log(`On-chain balance: ${onChainBalance.toString()}`);

    if (onChainBalance === 0n) {
      console.log(`⚠️  Zero balance, skipping`);
      return { success: false, ethRecovered: 0 };
    }

    // Check allowance
    const allowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, SWAP_ROUTER]
    });

    console.log(`Current allowance: ${allowance.toString()}`);

    // Approve if needed
    if (allowance < onChainBalance) {
      console.log(`📝 Approving ${symbol}...`);
      const approveHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [SWAP_ROUTER, onChainBalance]
      });

      console.log(`Approve tx: ${approveHash}`);
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log(`✅ Approved (block ${approveReceipt.blockNumber})`);
    } else {
      console.log(`✅ Already approved`);
    }

    // Get ETH balance before
    const ethBefore = await publicClient.getBalance({ address: account.address });
    console.log(`ETH before: ${formatEther(ethBefore)}`);

    // Sell tokens
    console.log(`💸 Selling ${symbol}...`);
    const sellHash = await walletClient.writeContract({
      address: SWAP_ROUTER,
      abi: SWAP_ROUTER_ABI,
      functionName: 'sellTokens',
      args: [tokenAddress, onChainBalance, 0n] // minEthOut = 0
    });

    console.log(`Sell tx: ${sellHash}`);
    const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellHash });
    console.log(`✅ Sold (block ${sellReceipt.blockNumber})`);

    // Get ETH balance after
    const ethAfter = await publicClient.getBalance({ address: account.address });
    const ethRecovered = ethAfter - ethBefore;
    console.log(`ETH after: ${formatEther(ethAfter)}`);
    console.log(`💰 ETH recovered: ${formatEther(ethRecovered)} (net of gas)`);

    return { success: true, ethRecovered: Number(formatEther(ethRecovered)), txHash: sellHash };
  } catch (error: any) {
    console.error(`❌ Error selling ${symbol}:`, error.message);
    return { success: false, ethRecovered: 0, error: error.message };
  }
}

async function main() {
  console.log(`🚀 PumpClaw Portfolio Liquidation\n`);

  // Get initial ETH balance
  const initialEth = await publicClient.getBalance({ address: account.address });
  console.log(`💎 Starting ETH balance: ${formatEther(initialEth)}\n`);

  // Group by tier
  const tier3 = portfolio.holdings.filter((h: any) => h.tier === 3);
  const tier2 = portfolio.holdings.filter((h: any) => h.tier === 2);
  const tier1 = portfolio.holdings.filter((h: any) => h.tier === 1);

  console.log(`📊 Portfolio Summary:`);
  console.log(`   Tier 3: ${tier3.length} tokens @ 0.0018 ETH each`);
  console.log(`   Tier 2: ${tier2.length} tokens @ 0.005 ETH each`);
  console.log(`   Tier 1: ${tier1.length} tokens @ 0.01 ETH each`);
  console.log(`   Total investment: ${portfolio.summary.totalCost.toFixed(4)} ETH`);
  console.log(`   Current value: ${portfolio.summary.totalValue.toFixed(4)} ETH`);

  const results: any[] = [];

  // Sell Tier 3 first (lowest investment)
  console.log(`\n\n╔═══════════════════════════════════╗`);
  console.log(`║      TIER 3 LIQUIDATION (22)      ║`);
  console.log(`╚═══════════════════════════════════╝`);
  for (const token of tier3) {
    const result = await sellToken(token.address, token.symbol, token.balance, 3);
    results.push({ ...token, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between txs
  }

  // Sell Tier 2
  console.log(`\n\n╔═══════════════════════════════════╗`);
  console.log(`║      TIER 2 LIQUIDATION (4)       ║`);
  console.log(`╚═══════════════════════════════════╝`);
  for (const token of tier2) {
    const result = await sellToken(token.address, token.symbol, token.balance, 2);
    results.push({ ...token, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Sell Tier 1 (highest investment)
  console.log(`\n\n╔═══════════════════════════════════╗`);
  console.log(`║      TIER 1 LIQUIDATION (4)       ║`);
  console.log(`╚═══════════════════════════════════╝`);
  for (const token of tier1) {
    const result = await sellToken(token.address, token.symbol, token.balance, 1);
    results.push({ ...token, ...result });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Get final ETH balance
  const finalEth = await publicClient.getBalance({ address: account.address });
  const totalRecovered = finalEth - initialEth;

  // Summary
  console.log(`\n\n╔═══════════════════════════════════╗`);
  console.log(`║         LIQUIDATION SUMMARY        ║`);
  console.log(`╚═══════════════════════════════════╝`);
  console.log(`\nInitial ETH: ${formatEther(initialEth)}`);
  console.log(`Final ETH:   ${formatEther(finalEth)}`);
  console.log(`Net change:  ${formatEther(totalRecovered)} ETH`);
  console.log(`\nSuccessful sales: ${results.filter(r => r.success).length}/${results.length}`);
  console.log(`Failed sales: ${results.filter(r => !r.success).length}/${results.length}`);

  // Save results
  const timestamp = new Date().toISOString();
  const reportPath = path.join(__dirname, `liquidation-report-${timestamp.split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp,
    initialEth: formatEther(initialEth),
    finalEth: formatEther(finalEth),
    netChange: formatEther(totalRecovered),
    results
  }, null, 2));

  console.log(`\n📝 Report saved to: ${reportPath}`);
}

main().catch(console.error);
