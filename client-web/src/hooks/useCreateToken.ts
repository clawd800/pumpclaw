import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, DEFAULT_TOKEN_SUPPLY } from "@/configs/constants";
import { FACTORY_ABI } from "@/configs/abis";

export interface CreateTokenParams {
  name: string;
  symbol: string;
  imageUrl: string;
  ethAmount: string; // ETH amount as string (e.g., "0.01")
  supply?: bigint; // Optional custom supply
}

export function useCreateToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createToken = async (params: CreateTokenParams) => {
    const { name, symbol, imageUrl, ethAmount, supply } = params;
    const value = parseEther(ethAmount);

    if (supply && supply !== DEFAULT_TOKEN_SUPPLY) {
      writeContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "createTokenWithSupply",
        args: [name, symbol, imageUrl, supply],
        value,
      });
    } else {
      writeContract({
        address: CONTRACTS.FACTORY,
        abi: FACTORY_ABI,
        functionName: "createToken",
        args: [name, symbol, imageUrl],
        value,
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
