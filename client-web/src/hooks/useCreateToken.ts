import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits, type Address } from "viem";
import { CONTRACTS } from "@/configs/constants";
import { FACTORY_ABI } from "@/configs/abis";

export interface CreateTokenParams {
  name: string;
  symbol: string;
  imageUrl: string;
  totalSupply: string; // In whole tokens (e.g., "1000000000" for 1B)
  initialFdv: string;  // In ETH (e.g., "20")
  creator: Address;
}

export function useCreateToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createToken = async (params: CreateTokenParams) => {
    const { name, symbol, imageUrl, totalSupply, initialFdv, creator } = params;

    // Parse supply with 18 decimals
    const supply = parseUnits(totalSupply, 18);
    // Parse FDV as ETH
    const fdv = parseEther(initialFdv);

    writeContract({
      address: CONTRACTS.FACTORY as Address,
      abi: FACTORY_ABI,
      functionName: "createToken",
      args: [name, symbol, imageUrl, supply, fdv, creator],
    });
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
