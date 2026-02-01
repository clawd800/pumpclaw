import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, TOKEN_CONFIG } from "@/configs/constants";
import { FACTORY_ABI } from "@/configs/abis";

export interface CreateTokenParams {
  name: string;
  symbol: string;
  imageUrl: string;
  initialFdv?: string; // Optional FDV in ETH (default: 20 ETH)
}

export function useCreateToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createToken = async (params: CreateTokenParams) => {
    const { name, symbol, imageUrl, initialFdv } = params;

    if (initialFdv) {
      const fdv = parseEther(initialFdv);
      writeContract({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "createTokenWithFdv",
        args: [name, symbol, imageUrl, fdv],
      });
    } else {
      // Use default FDV (20 ETH)
      writeContract({
        address: CONTRACTS.FACTORY as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [name, symbol, imageUrl],
      });
    }
  };

  return {
    createToken,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
