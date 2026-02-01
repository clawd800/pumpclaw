import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/configs/constants";
import { FACTORY_ABI } from "@/configs/abis";

export interface TokenInfo {
  token: `0x${string}`;
  creator: `0x${string}`;
  positionId: bigint;
  initialFdv: bigint;
  createdAt: bigint;
  name: string;
  symbol: string;
}

export function useTokenCount() {
  return useReadContract({
    address: CONTRACTS.FACTORY as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  });
}

export function useTokens(startIndex: number, endIndex: number) {
  const { data: count } = useTokenCount();
  
  return useReadContract({
    address: CONTRACTS.FACTORY as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getTokens",
    args: [BigInt(startIndex), BigInt(Math.min(endIndex, Number(count ?? 0)))],
    query: {
      enabled: count !== undefined && count > 0n,
    },
  });
}

export function useTokenInfo(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.FACTORY as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getTokenInfo",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
    },
  });
}

export function useTokensByCreator(creator: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.FACTORY as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: "getTokensByCreator",
    args: creator ? [creator] : undefined,
    query: {
      enabled: !!creator,
    },
  });
}

// Get latest tokens (most recent first)
export function useLatestTokens(limit: number = 10) {
  const { data: count, isLoading: countLoading } = useTokenCount();
  
  const startIndex = count ? Math.max(0, Number(count) - limit) : 0;
  const endIndex = count ? Number(count) : 0;
  
  const { data: tokens, isLoading: tokensLoading, refetch } = useTokens(startIndex, endIndex);
  
  // Reverse to get newest first
  const sortedTokens = tokens ? [...tokens].reverse() : [];
  
  return {
    data: sortedTokens as TokenInfo[],
    isLoading: countLoading || tokensLoading,
    count: count ? Number(count) : 0,
    refetch,
  };
}
