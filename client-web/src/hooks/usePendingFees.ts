import { useReadContract } from "wagmi";
import { CONTRACTS } from "../../../shared/contracts";
import { FEE_VIEWER_ABI } from "../../../shared/abis";

export interface PendingFees {
  token0: `0x${string}`;
  token1: `0x${string}`;
  amount0: bigint;
  amount1: bigint;
  creatorAmount0: bigint;
  creatorAmount1: bigint;
  adminAmount0: bigint;
  adminAmount1: bigint;
}

export function usePendingFees(tokenAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.FEE_VIEWER as `0x${string}`,
    abi: FEE_VIEWER_ABI,
    functionName: "getPendingFees",
    args: tokenAddress ? [tokenAddress] : undefined,
    query: {
      enabled: !!tokenAddress,
      refetchInterval: 30000, // Refresh every 30s
    },
  });
}
