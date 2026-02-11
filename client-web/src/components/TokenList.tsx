import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { useState, useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/configs/constants";
import { TokenMedia } from "./TokenMedia";
import { ERC20_ABI } from "@/configs/abis";
import { useTokenPrice, useEthUsdPrice } from "@/hooks/useTokenPrice";
import { useVolumeData } from "@/hooks/useVolumeData";

// ERC-8004 Registry on Base
const ERC8004_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

// ERC-721 balanceOf ABI for checking registration
const ERC721_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// Hook to batch check ERC-8004 registration for multiple addresses
function useERC8004Statuses(addresses: `0x${string}`[]) {
  const contracts = addresses.map((address) => ({
    address: ERC8004_REGISTRY,
    abi: ERC721_BALANCE_ABI,
    functionName: "balanceOf" as const,
    args: [address] as const,
  }));

  const { data } = useReadContracts({
    contracts,
    query: {
      enabled: addresses.length > 0,
    },
  });

  // Create a map of address -> isRegistered
  const statusMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (data) {
      addresses.forEach((addr, i) => {
        const result = data[i];
        const balance = result?.status === 'success' ? (result.result as bigint) : 0n;
        map.set(addr.toLowerCase(), balance > 0n);
      });
    }
    return map;
  }, [data, addresses]);

  return statusMap;
}

// Hook to batch get pool balances for market cap calculation
function usePoolBalances(tokens: TokenInfo[]) {
  const contracts = tokens.map((token) => ({
    address: token.token,
    abi: ERC20_ABI,
    functionName: "balanceOf" as const,
    args: [CONTRACTS.POOL_MANAGER as `0x${string}`] as const,
  }));

  const { data } = useReadContracts({
    contracts,
    query: {
      enabled: tokens.length > 0,
    },
  });

  // Calculate market cap for each token
  // Market Cap = initialFdv * (totalSupply / poolBalance) when poolBalance < totalSupply
  // This reflects the bonding curve: as more tokens are bought, price increases
  const marketCapMap = useMemo(() => {
    const map = new Map<string, bigint>();
    if (data) {
      tokens.forEach((token, i) => {
        const result = data[i];
        const poolBalance = result?.status === 'success' ? (result.result as bigint) : token.totalSupply;
        
        // If pool has all tokens, market cap = initial FDV
        // If pool has 0 tokens (all sold), market cap = much higher (theoretically infinite on bonding curve)
        // Approximation: marketCap = initialFdv * (totalSupply / poolBalance)
        // But we need to handle edge cases
        
        if (poolBalance > 0n && token.totalSupply > 0n) {
          // Calculate purchased amount
          const purchased = token.totalSupply - poolBalance;
          const purchasedPct = Number((purchased * 10000n) / token.totalSupply) / 100;
          
          // Simple bonding curve approximation:
          // Price increases linearly with purchased %, so average price is higher
          // Market Cap ≈ initialFdv * (1 + purchasedPct/100)
          // This gives a rough estimate that increases as more is purchased
          const multiplier = 1 + (purchasedPct / 100);
          const marketCap = BigInt(Math.floor(Number(token.initialFdv) * multiplier));
          map.set(token.token.toLowerCase(), marketCap);
        } else {
          // Fallback to initial FDV
          map.set(token.token.toLowerCase(), token.initialFdv);
        }
      });
    }
    return map;
  }, [data, tokens]);

  return marketCapMap;
}

// ERC-8004 Verified Badge Component
function ERC8004Badge() {
  return (
    <a
      href="https://eips.ethereum.org/EIPS/eip-8004"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-900/40 border border-blue-500/50 text-blue-400 hover:bg-blue-900/60 transition-colors ml-1"
      title="ERC-8004 Verified Agent"
    >
      <span>✓</span>
      <span>8004</span>
    </a>
  );
}

// Total supply ABI for reading token supply
const TOTAL_SUPPLY_ABI = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

function ProgressBar({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  // Get total supply
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: TOTAL_SUPPLY_ABI,
    functionName: "totalSupply",
  });

  // Get pool balance (tokens remaining in PoolManager)
  const { data: poolBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [CONTRACTS.POOL_MANAGER as `0x${string}`],
  });

  if (!totalSupply || !poolBalance) return null;

  // Calculate percentage purchased (use 10000n for 2 decimal precision, then divide by 100)
  const purchased = totalSupply - poolBalance;
  const percentPurchased = Number((purchased * 10000n) / totalSupply) / 100;
  
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] sm:text-xs text-orange-500 mb-0.5">
        <span>Purchased</span>
        <span>{percentPurchased.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 sm:h-2 bg-red-900/30 border border-red-900/50 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-orange-400 shadow-[0_0_8px_rgba(239,68,68,0.6)] transition-all duration-500"
          style={{ width: `${Math.min(percentPurchased, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TokenPriceBadge({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { ethPerToken } = useTokenPrice(tokenAddress);
  const ethUsd = useEthUsdPrice();
  
  if (ethPerToken === null) return null;

  const priceUsd = ethUsd ? ethPerToken * ethUsd : null;

  const formatPrice = (usd: number) => {
    if (usd < 0.00001) return `$${usd.toExponential(1)}`;
    if (usd < 0.01) return `$${usd.toFixed(6)}`;
    if (usd < 1) return `$${usd.toFixed(4)}`;
    return `$${usd.toFixed(2)}`;
  };

  return (
    <span className="text-red-400 font-mono text-xs sm:text-sm font-semibold">
      {priceUsd !== null ? formatPrice(priceUsd) : `${ethPerToken.toExponential(1)} ETH`}
    </span>
  );
}

function VolumeBadge({ volume24h, txns }: { volume24h: number; txns: { buys: number; sells: number } }) {
  if (volume24h <= 0) return null;
  
  const fmtVol = volume24h >= 1000
    ? `$${(volume24h / 1000).toFixed(1)}K`
    : `$${volume24h.toFixed(0)}`;
  const totalTxns = txns.buys + txns.sells;
  
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-900/40 border border-orange-500/40 text-[10px] sm:text-xs">
      <span className="text-orange-400">🔥</span>
      <span className="text-orange-300 font-medium">{fmtVol}</span>
      <span className="text-orange-600">•</span>
      <span className="text-orange-400">{totalTxns} txn{totalTxns !== 1 ? 's' : ''}</span>
    </div>
  );
}

interface TokenCardProps {
  token: TokenInfo;
  isERC8004Registered: boolean;
  volume24h?: number;
  txns24h?: { buys: number; sells: number };
}

function TokenCard({ token, isERC8004Registered, volume24h, txns24h }: TokenCardProps) {
  const { data: imageUrl } = useTokenImageUrl(token.token);
  
  const createdDate = new Date(Number(token.createdAt) * 1000);
  const timeAgo = getTimeAgo(createdDate);

  return (
    <div className="border border-red-900/50 bg-black/40 hover:border-orange-500/40 transition-all hover:bg-black/60 group overflow-hidden flex flex-col">
      <a href={`#/token/${token.token}`} className="block p-3 sm:p-4 pb-2 sm:pb-3 flex-1">
        {/* Header row: logo + info + price */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 overflow-hidden bg-red-900/30 border border-neutral-600/50 group-hover:border-orange-500/50 transition-colors rounded-sm">
            {imageUrl ? (
              <TokenMedia src={imageUrl} alt={token.symbol} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-orange-500 text-lg sm:text-xl">
                🦞
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-red-400 text-sm sm:text-base truncate group-hover:text-orange-200 transition-colors">{token.name}</h3>
              {isERC8004Registered && <ERC8004Badge />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-orange-400 font-mono text-xs sm:text-sm">${token.symbol}</span>
              <span className="text-neutral-600 text-[10px]">•</span>
              <span className="text-neutral-500 text-[10px] sm:text-xs" title={createdDate.toLocaleString()}>{timeAgo}</span>
            </div>
          </div>

          <div className="flex-shrink-0 text-right flex flex-col items-end gap-1">
            <TokenPriceBadge tokenAddress={token.token} />
            {volume24h != null && volume24h > 0 && txns24h && (
              <VolumeBadge volume24h={volume24h} txns={txns24h} />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar tokenAddress={token.token} />
      </a>

      {/* Action row */}
      <div className="px-3 sm:px-4 pb-3 pt-1">
        <div className="flex gap-1.5 items-center">
          <a
            href={`#/token/${token.token}`}
            className="flex-1 py-1.5 text-center text-[11px] sm:text-xs font-medium bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30 hover:text-orange-200 transition-all"
          >
            Trade
          </a>
          <button
            onClick={(e) => {
              e.preventDefault();
              const url = `https://pumpclaw.com/#/token/${token.token}`;
              navigator.clipboard.writeText(url);
              const btn = e.currentTarget;
              btn.textContent = '✅';
              setTimeout(() => { btn.textContent = '🔗'; }, 1500);
            }}
            className="px-2 py-1.5 text-[11px] sm:text-xs bg-red-900/30 border border-neutral-600/50 text-orange-400 hover:bg-red-900/50 hover:text-orange-300 transition-all shrink-0"
            title="Copy share link"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type SortOption = 'recent' | 'hot' | 'marketcap';

export default function TokenList() {
  const { data: tokens, isLoading, count, refetch } = useLatestTokens();
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [filterERC8004, setFilterERC8004] = useState(false);
  const { data: volumeData } = useVolumeData();

  // Get all unique creator addresses for batch ERC-8004 check
  const creatorAddresses = useMemo(() => {
    return tokens.map(t => t.creator);
  }, [tokens]);

  // Batch check ERC-8004 status
  const erc8004StatusMap = useERC8004Statuses(creatorAddresses);

  // Batch get pool balances for market cap calculation
  const marketCapMap = usePoolBalances(tokens);

  // Sort and filter tokens
  const displayedTokens = useMemo(() => {
    let result = [...tokens];

    // Filter by ERC-8004 if enabled
    if (filterERC8004) {
      result = result.filter(t => erc8004StatusMap.get(t.creator.toLowerCase()));
    }

    // Sort
    if (sortBy === 'hot') {
      // Volume descending, then recent for ties
      result.sort((a, b) => {
        const volA = volumeData?.tokens.find(v => v.address.toLowerCase() === a.token.toLowerCase())?.volume24h ?? 0;
        const volB = volumeData?.tokens.find(v => v.address.toLowerCase() === b.token.toLowerCase())?.volume24h ?? 0;
        if (volB !== volA) return volB - volA;
        return Number(b.createdAt - a.createdAt);
      });
    } else if (sortBy === 'marketcap') {
      result.sort((a, b) => {
        const mcapA = marketCapMap.get(a.token.toLowerCase()) ?? a.initialFdv;
        const mcapB = marketCapMap.get(b.token.toLowerCase()) ?? b.initialFdv;
        if (mcapB > mcapA) return 1;
        if (mcapB < mcapA) return -1;
        return 0;
      });
    }
    // 'recent' is already the default order from the hook

    return result;
  }, [tokens, sortBy, filterERC8004, erc8004StatusMap, marketCapMap, volumeData]);

  return (
    <div className="sm:border sm:border-red-900/50 bg-black/30 p-1.5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-bold text-orange-200 flex items-center gap-1.5 sm:gap-2">
          Tokens
          {count > 0 && (
            <span className="text-sm sm:text-base font-normal text-orange-500">
              ({count})
            </span>
          )}
        </h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-orange-500 hover:text-orange-300 transition-colors px-2 py-1 border border-red-900/50 hover:border-orange-500/40"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Sort Tabs & Filter */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-red-900/30">
        <div className="flex items-center gap-3">
          {/* Tab Buttons */}
          <div className="flex flex-1">
            <button
              onClick={() => setSortBy('hot')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium border transition-all ${
                sortBy === 'hot'
                  ? 'bg-orange-600/20 border-orange-500/50 text-orange-300'
                  : 'bg-black/40 border-red-900/50 text-neutral-500 hover:text-orange-400 hover:border-orange-500/40'
              }`}
            >
              🔥 Hot
            </button>
            <button
              onClick={() => setSortBy('marketcap')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium border border-l-0 transition-all ${
                sortBy === 'marketcap'
                  ? 'bg-orange-600/20 border-orange-500/40 text-red-400'
                  : 'bg-black/40 border-red-900/50 text-neutral-500 hover:text-orange-400 hover:border-orange-500/40'
              }`}
            >
              Top MCap
            </button>
            <button
              onClick={() => setSortBy('recent')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium border border-l-0 transition-all ${
                sortBy === 'recent'
                  ? 'bg-orange-600/20 border-orange-500/40 text-red-400'
                  : 'bg-black/40 border-red-900/50 text-neutral-500 hover:text-orange-400 hover:border-orange-500/40'
              }`}
            >
              Recent
            </button>
          </div>

          {/* Filter Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer group shrink-0">
            <input
              type="checkbox"
              checked={filterERC8004}
              onChange={(e) => setFilterERC8004(e.target.checked)}
              className="w-3.5 h-3.5 bg-black/60 border border-red-900/50 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer accent-orange-500"
            />
            <span className="text-orange-500 text-[11px] sm:text-sm group-hover:text-orange-300 transition-colors">
              <span className="text-blue-400">8004</span>
            </span>
          </label>
        </div>

        {/* Show filtered count */}
        {filterERC8004 && displayedTokens.length !== tokens.length && (
          <span className="text-neutral-500 text-xs">
            {displayedTokens.length} of {tokens.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-orange-500">Loading...</div>
      ) : displayedTokens.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          {filterERC8004 
            ? "No ERC-8004 registered tokens found. Try removing the filter."
            : "No tokens launched yet. Be the first! 🦞"
          }
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 items-stretch" style={{ gridAutoRows: '1fr' }}>
          {displayedTokens.map((token) => {
            const vol = volumeData?.tokens.find(v => v.address.toLowerCase() === token.token.toLowerCase());
            return (
              <TokenCard 
                key={token.token} 
                token={token} 
                isERC8004Registered={erc8004StatusMap.get(token.creator.toLowerCase()) ?? false}
                volume24h={vol?.volume24h}
                txns24h={vol?.txns24h}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
