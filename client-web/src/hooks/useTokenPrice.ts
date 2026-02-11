/**
 * V4 Pool Price Hook
 * Reads live price from Uniswap V4 PoolManager via extsload
 * 
 * This is novel — DexScreener/GeckoTerminal don't index V4 pools.
 * PumpClaw tokens only have price data here.
 */

import { useReadContract } from "wagmi";
import { encodeAbiParameters, keccak256 } from "viem";
import { CONTRACTS } from "@/configs/constants";

const POOL_MANAGER = CONTRACTS.POOL_MANAGER as `0x${string}`;
const POOLS_SLOT = 6n;
const LP_FEE = 10000;
const TICK_SPACING = 200;
const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as const;

const Q192 = 1n << 192n;
const SCALE = 10n ** 18n;

const EXTSLOAD_ABI = [{
  type: "function" as const,
  name: "extsload" as const,
  inputs: [{ name: "slot", type: "bytes32" as const }],
  outputs: [{ name: "", type: "bytes32" as const }],
  stateMutability: "view" as const,
}] as const;

function computePoolId(tokenAddress: `0x${string}`): `0x${string}` {
  return keccak256(encodeAbiParameters(
    [
      { type: "address", name: "currency0" },
      { type: "address", name: "currency1" },
      { type: "uint24", name: "fee" },
      { type: "int24", name: "tickSpacing" },
      { type: "address", name: "hooks" },
    ],
    [ZERO_ADDR, tokenAddress, LP_FEE, TICK_SPACING, ZERO_ADDR]
  ));
}

function computeStateSlot(poolId: `0x${string}`): `0x${string}` {
  return keccak256(encodeAbiParameters(
    [{ type: "bytes32", name: "key" }, { type: "uint256", name: "slot" }],
    [poolId, POOLS_SLOT]
  ));
}

export function useTokenPrice(tokenAddress: `0x${string}` | undefined) {
  const poolId = tokenAddress ? computePoolId(tokenAddress) : undefined;
  const stateSlot = poolId ? computeStateSlot(poolId) : undefined;

  const { data: slot0Data, isLoading } = useReadContract({
    address: POOL_MANAGER,
    abi: EXTSLOAD_ABI,
    functionName: "extsload",
    args: stateSlot ? [stateSlot] : undefined,
    query: { enabled: !!stateSlot },
  });

  if (!slot0Data || isLoading) {
    return { ethPerToken: null, tokensPerEth: null, isLoading };
  }

  const slot0BigInt = BigInt(slot0Data);
  const sqrtPriceX96 = slot0BigInt & ((1n << 160n) - 1n);

  if (sqrtPriceX96 === 0n) {
    return { ethPerToken: null, tokensPerEth: null, isLoading: false };
  }

  const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
  const ethPerTokenScaled = (Q192 * SCALE) / sqrtPriceSq;
  const ethPerToken = Number(ethPerTokenScaled) / 1e18;

  const tokensPerEthScaled = (sqrtPriceSq * SCALE) / Q192;
  const tokensPerEth = Number(tokensPerEthScaled) / 1e18;

  return { ethPerToken, tokensPerEth, isLoading };
}

// On-chain ETH/USD price from Uniswap V3 WETH/USDC pool on Base
// No API keys, no rate limits — pure blockchain read
const WETH_USDC_POOL = "0xd0b53D9277642d899DF5C87A3966A349A798F224" as const; // 0.05% fee
const SLOT0_ABI = [{
  type: "function" as const,
  name: "slot0" as const,
  inputs: [],
  outputs: [
    { name: "sqrtPriceX96", type: "uint160" },
    { name: "tick", type: "int24" },
    { name: "observationIndex", type: "uint16" },
    { name: "observationCardinality", type: "uint16" },
    { name: "observationCardinalityNext", type: "uint16" },
    { name: "feeProtocol", type: "uint8" },
    { name: "unlocked", type: "bool" },
  ],
  stateMutability: "view" as const,
}] as const;

export function useEthUsdPrice() {
  // token0 = WETH (18 dec), token1 = USDC (6 dec)
  // price = (sqrtPriceX96 / 2^96)^2 * 10^12
  const { data } = useReadContract({
    address: WETH_USDC_POOL,
    abi: SLOT0_ABI,
    functionName: "slot0",
    query: { refetchInterval: 30_000 }, // refresh every 30s
  });

  if (!data) return null;

  const sqrtPriceX96 = BigInt(data[0]);
  if (sqrtPriceX96 === 0n) return null;

  // price_raw = sqrtPriceX96^2 / 2^192 (token1/token0 in smallest units)
  // WETH=18dec, USDC=6dec → multiply by 10^(18-6)=10^12 for human-readable USD
  // We scale by 10^18 in BigInt then /1e6 in JS for 6 decimal precision
  const sqrtSq = sqrtPriceX96 * sqrtPriceX96;
  const priceScaled = (sqrtSq * 10n ** 18n) / (1n << 192n);
  return Number(priceScaled) / 1e6;
}
