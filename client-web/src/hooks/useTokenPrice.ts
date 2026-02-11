/**
 * V4 Pool Price Hook
 * Reads live price from Uniswap V4 PoolManager via extsload
 * 
 * This is novel — DexScreener/GeckoTerminal don't index V4 pools.
 * PumpClaw tokens only have price data here.
 */

import { useReadContract } from "wagmi";
import { encodeAbiParameters, keccak256 } from "viem";
import { useState, useEffect } from "react";
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

export function useEthUsdPrice() {
  const [ethUsd, setEthUsd] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchPrice() {
      // Try CoinGecko first
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        );
        const data = await res.json();
        if (!cancelled && data?.ethereum?.usd) {
          setEthUsd(data.ethereum.usd);
          return;
        }
      } catch { /* try fallback */ }
      // Fallback: CryptoCompare
      try {
        const res = await fetch(
          "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD"
        );
        const data = await res.json();
        if (!cancelled && data?.USD) {
          setEthUsd(data.USD);
        }
      } catch { /* silently fail */ }
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return ethUsd;
}
