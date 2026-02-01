import { useState } from "react";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { usePendingFees } from "@/hooks/usePendingFees";
import { useClaimFees } from "@/hooks/useClaimFees";
import { useLatestTokens } from "@/hooks/useTokens";
import { CONTRACTS } from "@/configs/constants";

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
    <div className="border border-green-900/50 bg-black/40 p-4 hover:border-green-500/50 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-green-300">{token.symbol}</h4>
          <p className="text-xs text-green-700">{token.name}</p>
        </div>
        <span className={`text-xs px-2 py-1 ${isCreator ? 'bg-green-900/50 text-green-400' : 'bg-purple-900/50 text-purple-400'}`}>
          {isCreator ? 'Creator' : 'Admin'}
        </span>
      </div>

      {isLoading ? (
        <div className="text-green-700 text-sm">Loading fees...</div>
      ) : fees && fees.amount0 > 0n ? (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Total Pool Fees</span>
            <span className="text-green-400">{formatEther(fees.amount0)} ETH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Your Share ({isCreator ? '80%' : '20%'})</span>
            <span className="text-green-300 font-semibold">{formatEther(yourShare)} ETH</span>
          </div>
          
          {hasClaimable && (
            <button
              onClick={handleClaim}
              disabled={isPending || isConfirming}
              className="w-full mt-2 py-2 text-sm font-medium bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-green-300 transition-all disabled:opacity-50"
            >
              {isPending ? 'Confirm in wallet...' : isConfirming ? 'Claiming...' : isSuccess ? '✓ Claimed!' : 'Claim Fees'}
            </button>
          )}
        </div>
      ) : (
        <div className="text-green-700 text-sm">No pending fees</div>
      )}
    </div>
  );
}

export default function FeesDashboard() {
  const { address, isConnected } = useAccount();
  const { data: tokens } = useLatestTokens(100); // Get more tokens to filter
  const [showAll, setShowAll] = useState(false);

  // Admin address (protocol owner)
  const ADMIN_ADDRESS = "0x261368f0EC280766B84Bfa7a9B23FD53c774878D".toLowerCase();
  
  const isAdmin = address?.toLowerCase() === ADMIN_ADDRESS;

  // Filter tokens where user is creator or is admin
  const relevantTokens = tokens.filter(t => 
    t.creator.toLowerCase() === address?.toLowerCase() || isAdmin
  );

  const tokensToShow = showAll ? relevantTokens : relevantTokens.slice(0, 6);

  if (!isConnected) {
    return (
      <div className="border border-green-900/50 bg-black/30 p-6">
        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-4">
          <span>💰</span> Fee Dashboard
        </h2>
        <p className="text-green-700 text-center py-8">
          Connect wallet to view your claimable fees
        </p>
      </div>
    );
  }

  if (relevantTokens.length === 0) {
    return (
      <div className="border border-green-900/50 bg-black/30 p-6">
        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-4">
          <span>💰</span> Fee Dashboard
        </h2>
        <p className="text-green-700 text-center py-8">
          {isAdmin 
            ? "No tokens launched yet"
            : "You haven't created any tokens yet. Launch one to earn fees!"}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-green-900/50 bg-black/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
          <span>💰</span> Fee Dashboard
          {isAdmin && <span className="text-xs bg-purple-900/50 text-purple-400 px-2 py-1 ml-2">Admin</span>}
        </h2>
        <span className="text-sm text-green-600">
          {relevantTokens.length} token{relevantTokens.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          className="mt-4 text-sm text-green-600 hover:text-green-400 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${relevantTokens.length} tokens`}
        </button>
      )}
    </div>
  );
}
