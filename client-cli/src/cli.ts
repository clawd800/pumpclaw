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
} from "./constants.js";

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
        console.log(`  Supply: ${formatUnits(token.supply, 18)}`);
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
      console.log(`Supply:     ${formatUnits(info.supply, 18)}`);
      console.log(`Position:   ${positionId}`);
      console.log(`Created:    ${date.toISOString()}`);
      if (imageUrl) console.log(`Image:      ${imageUrl}`);
      console.log(`\nBasescan:   https://basescan.org/token/${info.token}`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Create token
program
  .command("create")
  .description("Create a new token")
  .requiredOption("-n, --name <name>", "Token name")
  .requiredOption("-s, --symbol <symbol>", "Token symbol")
  .option("-i, --image <url>", "Image URL", "")
  .option("-e, --eth <amount>", "ETH for liquidity", "0.001")
  .option("--supply <amount>", "Custom token supply (default: 1B)")
  .option("--creator <address>", "Creator address (defaults to sender)")
  .action(async (opts) => {
    try {
      const walletClient = getWalletClient();
      const account = walletClient.account!;

      console.log(`Creating token: ${opts.name} (${opts.symbol})`);
      console.log(`Creator: ${opts.creator || account.address}`);
      console.log(`ETH: ${opts.eth}`);
      if (opts.supply) console.log(`Supply: ${opts.supply}`);
      console.log("");

      const value = parseEther(opts.eth);
      let hash: `0x${string}`;

      if (opts.supply && opts.creator) {
        // Custom supply + custom creator
        hash = await walletClient.writeContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "createTokenWithSupplyFor",
          args: [
            opts.name,
            opts.symbol,
            opts.image,
            parseEther(opts.supply),
            opts.creator as `0x${string}`,
          ],
          value,
        });
      } else if (opts.supply) {
        // Custom supply
        hash = await walletClient.writeContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "createTokenWithSupply",
          args: [opts.name, opts.symbol, opts.image, parseEther(opts.supply)],
          value,
        });
      } else if (opts.creator) {
        // Custom creator
        hash = await walletClient.writeContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "createTokenFor",
          args: [
            opts.name,
            opts.symbol,
            opts.image,
            opts.creator as `0x${string}`,
          ],
          value,
        });
      } else {
        // Default
        hash = await walletClient.writeContract({
          address: CONTRACTS.FACTORY,
          abi: FACTORY_ABI,
          functionName: "createToken",
          args: [opts.name, opts.symbol, opts.image],
          value,
        });
      }

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
        console.log(`Basescan: https://basescan.org/token/${token.token}`);
      } else {
        console.log("❌ Transaction failed");
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

        console.log(`${token[5]} (${token[6]})`); // name, symbol
        console.log(`  Token: ${token[0]}`);
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
      const minEth = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "MIN_ETH",
      });

      const defaultSupply = await publicClient.readContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "DEFAULT_TOKEN_SUPPLY",
      });

      const creatorFeeBps = await publicClient.readContract({
        address: CONTRACTS.LP_LOCKER,
        abi: LOCKER_ABI,
        functionName: "CREATOR_FEE_BPS",
      });

      console.log("PumpClaw Contracts (Base Mainnet)");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Factory:    ${CONTRACTS.FACTORY}`);
      console.log(`LP Locker:  ${CONTRACTS.LP_LOCKER}`);
      console.log(`WETH:       ${CONTRACTS.WETH}`);
      console.log("");
      console.log("Constants");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`Min ETH:        ${formatEther(minEth)} ETH`);
      console.log(`Default Supply: ${formatUnits(defaultSupply, 18)}`);
      console.log(`Creator Fee:    ${Number(creatorFeeBps) / 100}%`);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
