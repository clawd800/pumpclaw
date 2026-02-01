#!/usr/bin/env npx tsx
/**
 * PumpClaw Agent Script
 * Launch and manage tokens on Base via Uniswap V4
 */

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
import { CONTRACTS, CHAIN } from "../../../shared/contracts.js";

const BASE_RPC = CHAIN.RPC;

// ABIs
const FACTORY_ABI = [
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenFor",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenWithSupply",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "supply", type: "uint256" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createTokenWithSupplyFor",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "supply", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
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
          { name: "supply", type: "uint256" },
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
          { name: "supply", type: "uint256" },
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
    name: "getTokensByCreator",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "tokens",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "creator", type: "address" },
      { name: "positionId", type: "uint256" },
      { name: "supply", type: "uint256" },
      { name: "createdAt", type: "uint256" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
    ],
    stateMutability: "view",
  },
] as const;

const LOCKER_ABI = [
  {
    type: "function",
    name: "claimFees",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPosition",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "positionId", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
  },
] as const;

const TOKEN_ABI = [
  {
    type: "function",
    name: "imageUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

// Clients
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

// Commands
async function list(limit = 10, offset = 0) {
  const count = await publicClient.readContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  });

  console.log(`Total tokens: ${count}`);

  if (count === 0n) return;

  const end = Math.min(offset + limit, Number(count));
  const tokens = await publicClient.readContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokens",
    args: [BigInt(offset), BigInt(end)],
  });

  console.log("");
  for (const token of tokens) {
    const date = new Date(Number(token.createdAt) * 1000);
    console.log(`${token.symbol} | ${token.token} | ${date.toISOString().split("T")[0]}`);
  }
}

async function info(tokenAddress: string) {
  const token = await publicClient.readContract({
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

  let imageUrl = "";
  try {
    imageUrl = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: TOKEN_ABI,
      functionName: "imageUrl",
    });
  } catch {}

  const date = new Date(Number(token.createdAt) * 1000);

  console.log(`Name: ${token.name}`);
  console.log(`Symbol: ${token.symbol}`);
  console.log(`Token: ${token.token}`);
  console.log(`Creator: ${token.creator}`);
  console.log(`Supply: ${formatUnits(token.supply, 18)}`);
  console.log(`Position ID: ${positionId}`);
  console.log(`Created: ${date.toISOString()}`);
  if (imageUrl) console.log(`Image: ${imageUrl}`);
  console.log(`Basescan: https://basescan.org/token/${token.token}`);
}

async function create(opts: {
  name: string;
  symbol: string;
  image?: string;
  eth?: string;
  supply?: string;
  creator?: string;
}) {
  const walletClient = getWalletClient();
  const account = walletClient.account!;

  const value = parseEther(opts.eth || "0.001");
  const image = opts.image || "";

  console.log(`Creating: ${opts.name} (${opts.symbol})`);
  console.log(`Creator: ${opts.creator || account.address}`);
  console.log(`ETH: ${formatEther(value)}`);

  let hash: `0x${string}`;

  if (opts.supply && opts.creator) {
    hash = await walletClient.writeContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "createTokenWithSupplyFor",
      args: [
        opts.name,
        opts.symbol,
        image,
        parseEther(opts.supply),
        opts.creator as `0x${string}`,
      ],
      value,
    });
  } else if (opts.supply) {
    hash = await walletClient.writeContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "createTokenWithSupply",
      args: [opts.name, opts.symbol, image, parseEther(opts.supply)],
      value,
    });
  } else if (opts.creator) {
    hash = await walletClient.writeContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "createTokenFor",
      args: [opts.name, opts.symbol, image, opts.creator as `0x${string}`],
      value,
    });
  } else {
    hash = await walletClient.writeContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "createToken",
      args: [opts.name, opts.symbol, image],
      value,
    });
  }

  console.log(`Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "success") {
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

    console.log(`✅ Created: ${token.token}`);
    console.log(`Basescan: https://basescan.org/token/${token.token}`);
  } else {
    console.log("❌ Failed");
  }
}

async function claim(tokenAddress: string) {
  const walletClient = getWalletClient();

  console.log(`Claiming fees for: ${tokenAddress}`);

  const hash = await walletClient.writeContract({
    address: CONTRACTS.LP_LOCKER,
    abi: LOCKER_ABI,
    functionName: "claimFees",
    args: [tokenAddress as `0x${string}`],
  });

  console.log(`Tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "success") {
    console.log("✅ Fees claimed");
  } else {
    console.log("❌ Failed");
  }
}

async function byCreator(creatorAddress: string) {
  const indices = await publicClient.readContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokensByCreator",
    args: [creatorAddress as `0x${string}`],
  });

  console.log(`Tokens by ${creatorAddress}: ${indices.length}`);

  for (const idx of indices) {
    const token = await publicClient.readContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "tokens",
      args: [idx],
    });
    console.log(`${token[5]} (${token[6]}) - ${token[0]}`);
  }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

function parseArgs(args: string[]) {
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      opts[key] = args[i + 1] || "true";
      i++;
    }
  }
  return opts;
}

async function main() {
  try {
    switch (command) {
      case "list": {
        const opts = parseArgs(args.slice(1));
        await list(parseInt(opts.limit || "10"), parseInt(opts.offset || "0"));
        break;
      }
      case "info": {
        await info(args[1]);
        break;
      }
      case "create": {
        const opts = parseArgs(args.slice(1));
        if (!opts.name || !opts.symbol) {
          console.error("Usage: pumpclaw.ts create --name <name> --symbol <symbol> [--image <url>] [--eth <amount>] [--supply <amount>] [--creator <address>]");
          process.exit(1);
        }
        await create(opts as any);
        break;
      }
      case "claim": {
        await claim(args[1]);
        break;
      }
      case "by-creator": {
        await byCreator(args[1]);
        break;
      }
      default:
        console.log("PumpClaw CLI");
        console.log("");
        console.log("Commands:");
        console.log("  list [--limit N] [--offset N]  List tokens");
        console.log("  info <token>                   Get token info");
        console.log("  create --name <n> --symbol <s> Create token");
        console.log("  claim <token>                  Claim LP fees");
        console.log("  by-creator <address>           Tokens by creator");
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
