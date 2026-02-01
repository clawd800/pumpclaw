#!/usr/bin/env node
import { Command } from "commander";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatEther,
  parseEther,
  formatUnits,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import {
  CONTRACTS,
  BASE_RPC,
  FACTORY_ABI,
  LOCKER_ABI,
  TOKEN_ABI,
  SWAP_ROUTER_ABI,
  DEFAULT_FDV,
  DEFAULT_SUPPLY,
} from "./constants.js";
import { FEE_VIEWER_ABI } from "../../shared/abis.js";

const publicClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

function getWalletClient() {
  const key = process.env.BASE_PRIVATE_KEY;
  if (!key) {
    console.error("Error: BASE_PRIVATE_KEY environment variable is required");
    process.exit(1);
  }
  const privateKey = key.startsWith("0x") ? key : `0x${key}`;
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC),
  });
}

const program = new Command();

program
  .name("pumpclaw")
  .description("CLI for PumpClaw - token launcher on Base")
  .version("0.1.0");

// List tokens
program
  .command("list")
  .description("List all tokens")
  .option("-l, --limit <number>", "Number of tokens to show", "10")
  .option("-o, --offset <number>", "Starting offset", "0")
  .action(async (opts) => {
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokenCount",
      });

      console.log(`Total tokens: ${count}\n`);

      if (count === 0n) return;

      const limit = Math.min(parseInt(opts.limit), Number(count));
      const offset = parseInt(opts.offset);
      const end = Math.min(offset + limit, Number(count));

      const tokens = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokens",
        args: [BigInt(offset), BigInt(end)],
      });

      for (const token of tokens) {
        const date = new Date(Number(token.createdAt) * 1000);
        console.log(`${token.symbol} (${token.name})`);
        console.log(`  Token: ${token.token}`);
        console.log(`  Creator: ${token.creator}`);
        console.log(`  FDV: ${formatEther(token.initialFdv)} ETH`);
        console.log(`  Created: ${date.toISOString()}`);
        console.log("");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Get token info
program
  .command("info <token>")
  .description("Get token info by address")
  .action(async (tokenAddress) => {
    try {
      const info = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokenInfo",
        args: [tokenAddress as `0x${string}`],
      });

      const [positionId, creator] = await publicClient.readContract({
        address: CONTRACTS.LP_LOCKER,
        abi: LOCKER_ABI,
        functionName: "getPosition",
        args: [tokenAddress as `0x${string}`],
      });

      const imageUrl = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: "imageUrl",
      });

      const date = new Date(Number(info.createdAt) * 1000);

      console.log(`${info.symbol} (${info.name})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Token:      ${info.token}`);
      console.log(`Creator:    ${info.creator}`);
      console.log(`FDV:        ${formatEther(info.initialFdv)} ETH`);
      console.log(`Position:   ${positionId}`);
      console.log(`Created:    ${date.toISOString()}`);
      if (imageUrl) console.log(`Image:      ${imageUrl}`);
      console.log(`\nBasescan:   https://basescan.org/token/${info.token}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Create token (V4 - no ETH required!)
program
  .command("create")
  .description("Create a new token (no ETH deposit required)")
  .requiredOption("-n, --name <name>", "Token name")
  .requiredOption("-s, --symbol <symbol>", "Token symbol")
  .option("-i, --image <url>", "Image URL", "")
  .option("-f, --fdv <amount>", "Initial FDV in ETH (default: 20)")
  .option("--supply <amount>", "Total supply in whole tokens (default: 1B)")
  .option("--creator <address>", "Creator address (defaults to sender)")
  .action(async (opts) => {
    try {
      const walletClient = getWalletClient();
      const account = walletClient.account!;

      const fdv = opts.fdv ? parseEther(opts.fdv) : DEFAULT_FDV;
      const supply = opts.supply ? parseEther(opts.supply) : DEFAULT_SUPPLY;
      const creator = (opts.creator || account.address) as `0x${string}`;

      console.log(`Creating token: ${opts.name} (${opts.symbol})`);
      console.log(`Supply: ${formatUnits(supply, 18)} tokens`);
      console.log(`Initial FDV: ${formatEther(fdv)} ETH`);
      console.log(`Creator: ${creator}`);
      console.log(`(No ETH deposit required!)`);
      console.log("");

      const hash = await walletClient.writeContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [opts.name, opts.symbol, opts.image, supply, fdv, creator],
      });

      console.log(`Transaction: ${hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        // Get token address from logs
        const count = await publicClient.readContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "getTokenCount",
        });

        const [token] = await publicClient.readContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "getTokens",
          args: [count - 1n, count],
        });

        console.log(`\n✅ Token created!`);
        console.log(`Token: ${token.token}`);
        console.log(`Supply: ${formatUnits(token.totalSupply, 18)}`);
        console.log(`FDV: ${formatEther(token.initialFdv)} ETH`);
        console.log(`Basescan: https://basescan.org/token/${token.token}`);
      } else {
        console.log("❌ Transaction failed");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Check pending fees
program
  .command("fees <token>")
  .description("Check pending fees for a token")
  .action(async (tokenAddress) => {
    try {
      const fees = await publicClient.readContract({
        address: CONTRACTS.FEE_VIEWER as `0x${string}`,
        abi: FEE_VIEWER_ABI,
        functionName: "getPendingFees",
        args: [tokenAddress as `0x${string}`],
      });

      // token0 is ETH (address(0)), token1 is the token
      const ethFees = fees.amount0;
      const tokenFees = fees.amount1;

      console.log(`Pending fees for: ${tokenAddress}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Total ETH fees:     ${formatEther(ethFees)} ETH`);
      console.log(`  Creator (80%):    ${formatEther(fees.creatorAmount0)} ETH`);
      console.log(`  Admin (20%):      ${formatEther(fees.adminAmount0)} ETH`);
      
      if (tokenFees > 0n) {
        console.log(`\nToken fees:         ${formatEther(tokenFees)}`);
        console.log(`  Creator (80%):    ${formatEther(fees.creatorAmount1)}`);
        console.log(`  Admin (20%):      ${formatEther(fees.adminAmount1)}`);
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Claim fees
program
  .command("claim <token>")
  .description("Claim LP fees for a token")
  .action(async (tokenAddress) => {
    try {
      const walletClient = getWalletClient();

      console.log(`Claiming fees for: ${tokenAddress}`);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.LP_LOCKER,
        abi: LOCKER_ABI,
        functionName: "claimFees",
        args: [tokenAddress as `0x${string}`],
      });

      console.log(`Transaction: ${hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        console.log(`✅ Fees claimed!`);
      } else {
        console.log("❌ Transaction failed");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Get tokens by creator
program
  .command("by-creator <address>")
  .description("List tokens created by an address")
  .action(async (creatorAddress) => {
    try {
      const indices = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "getTokensByCreator",
        args: [creatorAddress as `0x${string}`],
      });

      console.log(`Tokens by ${creatorAddress}: ${indices.length}\n`);

      for (const idx of indices) {
        const token = await publicClient.readContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "tokens",
          args: [idx],
        });

        // token: [token, creator, positionId, totalSupply, initialFdv, createdAt, name, symbol]
        console.log(`${token[6]} (${token[7]})`); // name, symbol
        console.log(`  Token: ${token[0]}`);
        console.log(`  Supply: ${formatUnits(token[3], 18)}`);
        console.log(`  FDV: ${formatEther(token[4])} ETH`);
        console.log("");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Constants info
program
  .command("constants")
  .description("Show contract addresses and constants")
  .action(async () => {
    try {
      const priceRange = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "PRICE_RANGE_MULTIPLIER",
      });

      const creatorFeeBps = await publicClient.readContract({
        address: CONTRACTS.LP_LOCKER,
        abi: LOCKER_ABI,
        functionName: "CREATOR_FEE_BPS",
      });

      console.log("PumpClaw V4 Contracts (Base Mainnet)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Factory:     ${CONTRACTS.FACTORY}`);
      console.log(`LP Locker:   ${CONTRACTS.LP_LOCKER}`);
      console.log(`Swap Router: ${CONTRACTS.SWAP_ROUTER}`);
      console.log(`WETH:        ${CONTRACTS.WETH}`);
      console.log("");
      console.log("Defaults (configurable per token)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Default FDV:    ${formatEther(DEFAULT_FDV)} ETH`);
      console.log(`Default Supply: ${formatUnits(DEFAULT_SUPPLY, 18)}`);
      console.log("");
      console.log("Fixed Protocol Constants");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Price Range:    ${priceRange}x`);
      console.log(`Creator Fee:    ${Number(creatorFeeBps) / 100}%`);
      console.log("");
      console.log("Note: No ETH deposit required to create tokens!");
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Buy tokens with ETH
program
  .command("buy <token>")
  .description("Buy tokens with ETH")
  .requiredOption("-e, --eth <amount>", "Amount of ETH to spend")
  .option("--slippage <percent>", "Slippage tolerance in percent", "5")
  .action(async (tokenAddress, opts) => {
    try {
      const walletClient = getWalletClient();
      const account = walletClient.account!;

      const ethAmount = parseEther(opts.eth);

      // Get token info
      const symbol = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: "symbol",
      });

      // Get balance before
      const balanceBefore = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [account.address],
      });

      console.log(`Buying ${symbol} with ${opts.eth} ETH`);

      const hash = await walletClient.writeContract({
        address: CONTRACTS.SWAP_ROUTER,
        abi: SWAP_ROUTER_ABI,
        functionName: "buyTokens",
        args: [tokenAddress as `0x${string}`, 0n], // 0 for no slippage protection
        value: ethAmount,
      });

      console.log(`Transaction: ${hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        const balanceAfter = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: TOKEN_ABI,
          functionName: "balanceOf",
          args: [account.address],
        });

        const received = balanceAfter - balanceBefore;
        console.log(`✅ Bought ${formatUnits(received, 18)} ${symbol}!`);
      } else {
        console.log("❌ Transaction failed");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Sell tokens for ETH
program
  .command("sell <token>")
  .description("Sell tokens for ETH")
  .requiredOption("-a, --amount <amount>", "Amount of tokens to sell")
  .option("--slippage <percent>", "Slippage tolerance in percent", "5")
  .action(async (tokenAddress, opts) => {
    try {
      const walletClient = getWalletClient();
      const account = walletClient.account!;

      const tokenAmount = parseEther(opts.amount);

      // Get token info
      const symbol = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: TOKEN_ABI,
        functionName: "symbol",
      });

      console.log(`Selling ${opts.amount} ${symbol} for ETH`);

      // Approve router
      console.log("Approving router...");
      const approveHash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            type: "function",
            name: "approve",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
          },
        ],
        functionName: "approve",
        args: [CONTRACTS.SWAP_ROUTER, tokenAmount],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      // Get ETH balance before
      const ethBefore = await publicClient.getBalance({ address: account.address });

      // Execute swap
      const hash = await walletClient.writeContract({
        address: CONTRACTS.SWAP_ROUTER,
        abi: SWAP_ROUTER_ABI,
        functionName: "sellTokens",
        args: [tokenAddress as `0x${string}`, tokenAmount, 0n],
      });

      console.log(`Transaction: ${hash}`);
      console.log("Waiting for confirmation...");

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        const ethAfter = await publicClient.getBalance({ address: account.address });
        const received = ethAfter - ethBefore;
        console.log(`✅ Received ~${formatEther(received)} ETH!`);
      } else {
        console.log("❌ Transaction failed");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
