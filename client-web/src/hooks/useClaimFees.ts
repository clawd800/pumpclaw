import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS } from "@/configs/constants";
import { LP_LOCKER_ABI } from "@/configs/abis";

export function useClaimFees() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const claimFees = async (tokenAddress: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.LP_LOCKER,
      abi: LP_LOCKER_ABI,
      functionName: "claimFees",
      args: [tokenAddress],
    });
  };

  return {
    claimFees,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
