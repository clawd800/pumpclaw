/**
 * PumpClaw Shared Utilities
 * Common functions for CLI and Web clients
 */

import { createPublicClient, http, formatEther, parseEther, type Address } from "viem";
import { base } from "viem/chains";
import { CONTRACTS, CHAIN, TOKEN_DEFAULTS, PROTOCOL_CONFIG } from "./contracts";
import { FACTORY_ABI, LP_LOCKER_ABI, TOKEN_ABI } from "./abis";

// ============ Client Setup ============

export function createClient(rpcUrl?: string) {
  return createPublicClient({
    chain: base,
    transport: http(rpcUrl || CHAIN.RPC),
  });
}

// ============ Token Creation Helpers ============

export interface CreateTokenParams {
  name: string;
  symbol: string;
  imageUrl?: string;
  totalSupply?: bigint;  // defaults to 1B
  initialFdv?: bigint;   // defaults to 20 ETH
  creator: Address;
}

export function buildCreateTokenArgs(params: CreateTokenParams): readonly [
  string,
  string,
  string,
  bigint,
  bigint,
  Address
] {
  return [
    params.name,
    params.symbol,
    params.imageUrl || "",
    params.totalSupply || TOKEN_DEFAULTS.SUPPLY,
    params.initialFdv || TOKEN_DEFAULTS.FDV,
    params.creator,
  ] as const;
}

// ============ Token Info Types ============

export interface TokenInfo {
  token: Address;
  creator: Address;
  positionId: bigint;
  totalSupply: bigint;
  initialFdv: bigint;
  createdAt: bigint;
  name: string;
  symbol: string;
}

export interface TokenDisplayInfo extends TokenInfo {
  initialPriceEth: string;
  supplyFormatted: string;
  fdvFormatted: string;
  createdAtDate: Date;
}

// ============ Formatting Helpers ============

export function formatSupply(supply: bigint, decimals = 18): string {
  const value = Number(supply) / 10 ** decimals;
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

export function formatFdv(fdv: bigint): string {
  return `${formatEther(fdv)} ETH`;
}

export function calculateInitialPrice(totalSupply: bigint, initialFdv: bigint): string {
  // Price = FDV / Supply (in ETH per token)
  const priceWei = (initialFdv * BigInt(10 ** 18)) / totalSupply;
  const priceEth = Number(priceWei) / 10 ** 18;
  
  if (priceEth < 0.000001) {
    return priceEth.toExponential(4);
  }
  return priceEth.toFixed(10).replace(/\.?0+$/, "");
}

export function enrichTokenInfo(info: TokenInfo): TokenDisplayInfo {
  return {
    ...info,
    initialPriceEth: calculateInitialPrice(info.totalSupply, info.initialFdv),
    supplyFormatted: formatSupply(info.totalSupply),
    fdvFormatted: formatFdv(info.initialFdv),
    createdAtDate: new Date(Number(info.createdAt) * 1000),
  };
}

// ============ Contract Read Helpers ============

export async function getTokenCount(client: ReturnType<typeof createClient>): Promise<bigint> {
  return client.readContract({
    address: CONTRACTS.FACTORY as Address,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  }) as Promise<bigint>;
}

export async function getTokenInfo(
  client: ReturnType<typeof createClient>,
  tokenAddress: Address
): Promise<TokenInfo> {
  const result = await client.readContract({
    address: CONTRACTS.FACTORY as Address,
    abi: FACTORY_ABI,
    functionName: "getTokenInfo",
    args: [tokenAddress],
  });
  return result as TokenInfo;
}

export async function getTokens(
  client: ReturnType<typeof createClient>,
  startIndex: bigint,
  endIndex: bigint
): Promise<TokenInfo[]> {
  const result = await client.readContract({
    address: CONTRACTS.FACTORY as Address,
    abi: FACTORY_ABI,
    functionName: "getTokens",
    args: [startIndex, endIndex],
  });
  return result as TokenInfo[];
}

export async function getTokensByCreator(
  client: ReturnType<typeof createClient>,
  creator: Address
): Promise<bigint[]> {
  const result = await client.readContract({
    address: CONTRACTS.FACTORY as Address,
    abi: FACTORY_ABI,
    functionName: "getTokensByCreator",
    args: [creator],
  });
  return result as bigint[];
}

// ============ Token Balance Helpers ============

export async function getTokenBalance(
  client: ReturnType<typeof createClient>,
  tokenAddress: Address,
  account: Address
): Promise<bigint> {
  return client.readContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: [account],
  }) as Promise<bigint>;
}

// ============ URL Builders ============

export function getBasescanTokenUrl(tokenAddress: Address): string {
  return `https://basescan.org/token/${tokenAddress}`;
}

export function getBasescanTxUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}

export function getUniswapSwapUrl(tokenAddress: Address): string {
  return `https://app.uniswap.org/swap?chain=base&outputCurrency=${tokenAddress}`;
}

// ============ Exports ============

export { CONTRACTS, CHAIN, TOKEN_DEFAULTS, PROTOCOL_CONFIG } from "./contracts";
export { FACTORY_ABI, LP_LOCKER_ABI, TOKEN_ABI, ERC20_ABI } from "./abis";
export { parseEther, formatEther } from "viem";
