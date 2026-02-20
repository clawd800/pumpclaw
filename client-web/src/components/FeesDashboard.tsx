import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { usePendingFees } from "@/hooks/usePendingFees";
import { useClaimFees } from "@/hooks/useClaimFees";
import { IconMoney, IconCheck } from "./Icons";
import { useLatestTokens } from "@/hooks/useTokens";
import { CONTRACTS } from "@/configs/constants";
import { LP_LOCKER_ABI } from "@/configs/abis";

function TokenFeeCard({ 
  token, 
  isCreator, 
  isAdmin 
}: { 
  token: { token: `0x${string}`; symbol: string; name: string; creator: `0x${string}` }; 
  isCreator: boolean;
  isAdmin: boolean;
}) {
  const { data: fees, isLoading, refetch } = usePendingFees(token.token);
  const { claimFees, isPending, isConfirming, isSuccess } = useClaimFees();

  const handleClaim = async () => {
    await claimFees(token.token);
    // Refetch after a short delay to show updated fees
    setTimeout(() => refetch(), 2000);
  };

  const yourShare = isCreator 
    ? fees?.creatorAmount0 ?? 0n
    : isAdmin 
      ? fees?.adminAmount0 ?? 0n
      : 0n;

  const hasClaimable = yourShare > 0n;

  return (
    <div className="border border-red-900/50 bg-black/40 p-4 hover:border-orange-500/40 transition-all overflow-hidden">
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-red-400 truncate">{token.symbol}</h4>
          <p className="text-xs text-neutral-500 truncate">{token.name}</p>
        </div>
        <span className={`text-xs px-2 py-1 shrink-0 ${isCreator ? 'bg-red-900/50 text-orange-300' : 'bg-purple-900/50 text-purple-400'}`}>
          {isCreator ? 'Creator' : 'Admin'}
        </span>
      </div>

      {isLoading ? (
        <div className="text-neutral-500 text-sm">Loading fees...</div>
      ) : fees && fees.amount0 > 0n ? (
        <div className="space-y-2">
          <div className="flex flex-col text-sm">
            <span className="text-orange-500">Total Pool Fees</span>
            <span className="text-orange-200 font-mono text-xs break-all">{formatEther(fees.amount0)} ETH</span>
          </div>
          <div className="flex flex-col text-sm">
            <span className="text-orange-500">Your Share ({isCreator ? '80%' : '20%'})</span>
            <span className="text-red-400 font-semibold font-mono text-xs break-all">{formatEther(yourShare)} ETH</span>
          </div>
          
          {hasClaimable && (
            <button
              onClick={handleClaim}
              disabled={isPending || isConfirming}
              className="w-full mt-2 py-2 text-sm font-medium bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30 hover:text-orange-200 transition-all disabled:opacity-50"
            >
              {isPending ? 'Confirm in wallet...' : isConfirming ? 'Claiming...' : isSuccess ? <><IconCheck size={12} className="inline" /> Claimed!</> : 'Claim Fees'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-neutral-500 text-sm">No pending fees</div>
      )}
    </div>
  );
}

export default function FeesDashboard() {
  const { address, isConnected } = useAccount();
  const { data: tokens } = useLatestTokens(100); // Get more tokens to filter
  const [showAll, setShowAll] = useState(false);

  // Read admin address from LPLocker contract (on-chain)
  const { data: adminAddress } = useReadContract({
    address: CONTRACTS.LP_LOCKER as `0x${string}`,
    abi: LP_LOCKER_ABI,
    functionName: "admin",
  });
  
  const isAdmin = !!(address && adminAddress && address.toLowerCase() === (adminAddress as string).toLowerCase());

  // Filter tokens where user is creator or is admin
  const relevantTokens = tokens.filter(t => 
    t.creator.toLowerCase() === address?.toLowerCase() || isAdmin
  );

  const tokensToShow = showAll ? relevantTokens : relevantTokens.slice(0, 6);

  if (!isConnected) {
    return (
      <div className="border border-red-900/50 bg-black/30 p-6">
        <h2 className="text-xl font-bold text-orange-200 flex items-center gap-2 mb-4">
          <><IconMoney size={14} /> Fee Dashboard</>
        </h2>
        <p className="text-neutral-500 text-center py-8">
          Connect wallet to view your claimable fees
        </p>
      </div>
    );
  }

  if (relevantTokens.length === 0) {
    return (
      <div className="border border-red-900/50 bg-black/30 p-6">
        <h2 className="text-xl font-bold text-orange-200 flex items-center gap-2 mb-4">
          <><IconMoney size={14} /> Fee Dashboard</>
        </h2>
        <p className="text-neutral-500 text-center py-8">
          {isAdmin 
            ? "No tokens launched yet"
            : "You haven't created any tokens yet. Launch one to earn fees!"}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-red-900/50 bg-black/30 p-6">
      <div className="flex flex-col gap-2 mb-4">
        <h2 className="text-lg font-bold text-orange-200 flex items-center gap-2">
          <><IconMoney size={14} /> Fee Dashboard</>
        </h2>
        <div className="flex items-center gap-2 text-sm">
          {isAdmin && <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-1">Admin</span>}
          <span className="text-orange-500">
            {relevantTokens.length} token{relevantTokens.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1">
        {tokensToShow.map((token) => (
          <TokenFeeCard
            key={token.token}
            token={token}
            isCreator={token.creator.toLowerCase() === address?.toLowerCase()}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      {relevantTokens.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 text-sm text-orange-500 hover:text-orange-300 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${relevantTokens.length} tokens`}
        </button>
      )}
    </div>
  );
}
