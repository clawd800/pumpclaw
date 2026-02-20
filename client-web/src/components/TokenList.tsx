import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { useState, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { CONTRACTS } from "@/configs/constants";
import { TokenMedia } from "./TokenMedia";
import { ERC20_ABI } from "@/configs/abis";
import { useEthUsdPrice } from "@/hooks/useTokenPrice";
import { useIndexerTokens, type IndexerToken } from "@/hooks/useIndexerTokens";
import { CreatorFarcasterBadge } from "./CreatorFarcasterProfile";
import { IconFire, IconRocket, IconCrown, IconClock, IconChart, IconLobster, IconNoTrades, IconCheck, IconRefresh } from "./Icons";

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

interface PoolData {
  marketCap: bigint;
  purchasedPct: number;
}

// Hook to batch get pool data (market cap + purchased %) for tokens
function usePoolData(tokens: TokenInfo[]) {
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

  const poolDataMap = useMemo(() => {
    const map = new Map<string, PoolData>();
    if (data) {
      tokens.forEach((token, i) => {
        const result = data[i];
        const poolBalance = result?.status === 'success' ? (result.result as bigint) : token.totalSupply;
        
        let marketCap: bigint;
        let purchasedPct = 0;

        if (poolBalance > 0n && token.totalSupply > 0n) {
          const purchased = token.totalSupply - poolBalance;
          purchasedPct = Number((purchased * 10000n) / token.totalSupply) / 100;
          
          const multiplier = 1 + (purchasedPct / 100);
          marketCap = BigInt(Math.floor(Number(token.initialFdv) * multiplier));
        } else {
          marketCap = token.initialFdv;
        }

        map.set(token.token.toLowerCase(), { marketCap, purchasedPct });
      });
    }
    return map;
  }, [data, tokens]);

  return poolDataMap;
}

// ERC-8004 Verified Badge Component
function ERC8004Badge() {
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1 py-px text-[10px] font-medium bg-orange-900/30 border border-orange-500/40 text-orange-400"
      title="ERC-8004 Verified Agent"
    >
      <IconCheck size={8} />
      <span>8004</span>
    </span>
  );
}

function PriceChangeBadge({ change }: { change: number | null | undefined }) {
  if (change === null || change === undefined) return null;

  const isPositive = change >= 0;
  const arrow = isPositive ? '▲' : '▼';
  const color = isPositive ? 'text-green-400' : 'text-red-400';
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;

  return (
    <span className={`${color} text-xs font-medium`}>
      {arrow}{formatted}
    </span>
  );
}

function VolumeBadge({ volume24h, txns }: { volume24h?: number; txns?: { buys: number; sells: number } }) {
  const vol = volume24h ?? 0;
  const totalTxns = txns ? txns.buys + txns.sells : 0;

  if (vol <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
        <IconNoTrades size={11} />
        <span>No trades</span>
      </span>
    );
  }
  
  const fmtVol = vol >= 1000
    ? `$${(vol / 1000).toFixed(1)}K`
    : `$${vol.toFixed(0)}`;
  
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <IconFire size={11} />
      <span className="text-orange-300 font-medium">{fmtVol}</span>
      <span className="text-neutral-600">·</span>
      <span className="text-orange-400/70">{totalTxns} txn{totalTxns !== 1 ? 's' : ''}</span>
    </span>
  );
}

function formatMarketCapUsd(marketCapWei: bigint, ethUsd: number | null): string {
  if (!ethUsd) return '...';
  // marketCapWei is in wei, convert to ETH then to USD
  const marketCapEth = Number(marketCapWei) / 1e18;
  const usd = marketCapEth * ethUsd;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  if (usd >= 1) return `$${usd.toFixed(0)}`;
  return `$${usd.toFixed(2)}`;
}

interface TokenCardProps {
  token: TokenInfo;
  isERC8004Registered: boolean;
  purchasedPct: number;
  marketCapWei: bigint;
  ethUsd: number | null;
  volume24h?: number;
  txns24h?: { buys: number; sells: number };
  apiImageUrl?: string;
  priceChange24h?: number | null;
}

function TokenCard({ token, isERC8004Registered, purchasedPct, marketCapWei, ethUsd, volume24h, txns24h, apiImageUrl, priceChange24h }: TokenCardProps) {
  // Use API image URL if available, otherwise fetch on-chain (fallback)
  const { data: onChainImageUrl } = useTokenImageUrl(apiImageUrl ? undefined : token.token);
  const imageUrl = apiImageUrl || onChainImageUrl;
  
  const createdDate = new Date(Number(token.createdAt) * 1000);
  const timeAgo = getTimeAgo(createdDate);

  return (
    <a
      href={`#/token/${token.token}`}
      className="flex gap-3 p-3 border border-neutral-800 bg-neutral-950/80 hover:border-orange-500/30 hover:bg-neutral-900/50 transition-all group overflow-hidden min-w-0"
    >
      {/* Left: Token image — stretches to full card height */}
      <div className="shrink-0 w-20 sm:w-24 overflow-hidden bg-neutral-900 border border-neutral-800 group-hover:border-neutral-700 transition-colors">
        {imageUrl ? (
          <TokenMedia src={imageUrl} alt={token.symbol} />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><IconLobster size={36} /></div>
        )}
      </div>

      {/* Right: Stacked info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Top: name + ticker */}
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="font-bold text-white text-sm truncate group-hover:text-orange-200 transition-colors">
              {token.name}
            </h3>
            {isERC8004Registered && <ERC8004Badge />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="font-mono">${token.symbol}</span>
            <span>·</span>
            <CreatorFarcasterBadge address={token.creator} />
          </div>
        </div>

        {/* Middle: market cap + price change */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs text-neutral-400">MC</span>
          <span className="text-xs text-white font-medium">{formatMarketCapUsd(marketCapWei, ethUsd)}</span>
          <PriceChangeBadge change={priceChange24h} />
        </div>

        {/* Bottom: progress + volume */}
        <div className="mt-1.5 space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-neutral-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(purchasedPct)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${Math.min(purchasedPct, 100)}%` }} />
            </div>
            <span className="text-orange-400 text-xs tabular-nums shrink-0">{purchasedPct.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <VolumeBadge volume24h={volume24h} txns={txns24h} />
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-500 shrink-0" title={createdDate.toLocaleString()}>{timeAgo}</span>
          </div>
        </div>
      </div>
    </a>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type SortOption = 'recent' | 'hot' | 'marketcap' | 'pumped';

const SORT_MAP: Record<SortOption, string> = { recent: 'newest', hot: 'hot', marketcap: 'mcap', pumped: 'pumped' };

export default function TokenList() {
  const [sortBy, setSortBy] = useState<SortOption>('hot');
  const [filterERC8004, setFilterERC8004] = useState(false);

  // === API-first data source ===
  const { tokens: apiTokens, total: apiTotal, loading: apiLoading, refetch: apiRefetch } = useIndexerTokens(SORT_MAP[sortBy]);

  // === On-chain fallback (only used when API is down) ===
  const { data: onChainTokens, isLoading: onChainLoading, count: onChainCount, refetch: onChainRefetch } = useLatestTokens();
  const ethUsd = useEthUsdPrice();

  // Decide data source: API first, on-chain fallback
  const useApi = apiTokens !== null && apiTokens.length > 0;

  // Normalize API tokens to match on-chain TokenInfo shape for shared components
  const tokens: TokenInfo[] = useMemo(() => {
    if (useApi) {
      return apiTokens!.map((t) => ({
        token: t.address as `0x${string}`,
        creator: t.creator as `0x${string}`,
        positionId: 0n,
        totalSupply: BigInt(t.totalSupply),
        initialFdv: BigInt(t.initialFdv),
        createdAt: BigInt(t.createdAt),
        name: t.name,
        symbol: t.symbol,
      }));
    }
    return onChainTokens;
  }, [useApi, apiTokens, onChainTokens]);

  const count = useApi ? apiTotal : onChainCount;
  const isLoading = useApi ? apiLoading : onChainLoading;
  const refetch = useApi ? apiRefetch : onChainRefetch;

  // Build API lookup maps for price/volume
  const apiDataMap = useMemo(() => {
    const map = new Map<string, IndexerToken>();
    if (apiTokens) {
      for (const t of apiTokens) {
        map.set(t.address.toLowerCase(), t);
      }
    }
    return map;
  }, [apiTokens]);

  // Get all unique creator addresses for batch ERC-8004 check
  const creatorAddresses = useMemo(() => {
    return tokens.map(t => t.creator);
  }, [tokens]);

  // Batch check ERC-8004 status
  const erc8004StatusMap = useERC8004Statuses(creatorAddresses);

  // Batch get pool data (market cap + purchased %) - on-chain fallback
  const poolDataMap = usePoolData(tokens);

  // Sort and filter tokens
  const displayedTokens = useMemo(() => {
    let result = [...tokens];

    // Filter by ERC-8004 if enabled
    if (filterERC8004) {
      result = result.filter(t => erc8004StatusMap.get(t.creator.toLowerCase()));
    }

    // When using API, tokens are already sorted by the server
    // Only need client-side sort for on-chain fallback
    if (!useApi) {
      if (sortBy === 'hot' || sortBy === 'recent') {
        // Without API, default to newest (no volume data available)
        result.sort((a, b) => Number(b.createdAt - a.createdAt));
      } else if (sortBy === 'marketcap') {
        result.sort((a, b) => {
          const mcapA = poolDataMap.get(a.token.toLowerCase())?.marketCap ?? a.initialFdv;
          const mcapB = poolDataMap.get(b.token.toLowerCase())?.marketCap ?? b.initialFdv;
          if (mcapB > mcapA) return 1;
          if (mcapB < mcapA) return -1;
          return 0;
        });
      }
    }

    return result;
  }, [tokens, sortBy, filterERC8004, erc8004StatusMap, poolDataMap, useApi]);

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          Tokens
          {count > 0 && (
            <span className="text-xs font-normal text-neutral-500">{count}</span>
          )}
        </h2>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-white transition-colors px-2 py-1 border border-neutral-800 hover:border-neutral-700"
        >
          <IconRefresh size={10} /> Refresh
        </button>
      </div>

      {/* Sort Tabs & Filter */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-neutral-800/50">
        <div className="flex flex-1 bg-neutral-900/50 p-0.5">
          {([
            { key: 'hot' as SortOption, label: 'Hot', icon: <IconFire size={14} /> },
            { key: 'pumped' as SortOption, label: 'Pumped', icon: <IconRocket size={14} /> },
            { key: 'marketcap' as SortOption, label: 'MCap', icon: <IconCrown size={14} /> },
            { key: 'recent' as SortOption, label: 'New', icon: <IconClock size={14} /> },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-all ${
                sortBy === key
                  ? 'bg-orange-500/15 text-orange-300'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1">{icon}{label}</span>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1 cursor-pointer group shrink-0 px-2 py-1.5 border border-neutral-800 hover:border-neutral-700 transition-colors">
          <input
            type="checkbox"
            checked={filterERC8004}
            onChange={(e) => setFilterERC8004(e.target.checked)}
            className="w-3 h-3 bg-neutral-900 border border-neutral-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer accent-orange-500"
          />
          <span className="text-orange-400 text-xs group-hover:text-orange-300 transition-colors font-medium">8004</span>
        </label>
      </div>

      {filterERC8004 && displayedTokens.length !== tokens.length && (
        <p className="text-neutral-500 text-xs mb-3">{displayedTokens.length} of {tokens.length}</p>
      )}

      {isLoading ? (
        <div className="text-center py-16 text-neutral-500">Loading...</div>
      ) : displayedTokens.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          {filterERC8004 
            ? "No ERC-8004 registered tokens found."
            : <span className="inline-flex items-center gap-2">No tokens launched yet. Be the first! <IconLobster size={16} /></span>
          }
        </div>
      ) : (
        <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 w-full min-w-0">
          {displayedTokens.map((token) => {
            const apiData = apiDataMap.get(token.token.toLowerCase());
            const vol = apiData
              ? { volume24h: apiData.volume24h.volumeUsd, txns24h: { buys: apiData.volume24h.buys, sells: apiData.volume24h.sells } }
              : { volume24h: undefined, txns24h: undefined };
            const poolData = poolDataMap.get(token.token.toLowerCase());
            
            // Use API market cap (USD) if available, otherwise fall back to on-chain
            const marketCapWei = apiData && apiData.price.mcapUsd
              ? BigInt(Math.floor((apiData.price.mcapUsd / (ethUsd || 1)) * 1e18))
              : (poolData?.marketCap ?? token.initialFdv);
            
            return (
              <TokenCard 
                key={token.token} 
                token={token} 
                isERC8004Registered={erc8004StatusMap.get(token.creator.toLowerCase()) ?? false}
                purchasedPct={poolData?.purchasedPct ?? 0}
                marketCapWei={marketCapWei}
                ethUsd={ethUsd}
                volume24h={vol?.volume24h}
                txns24h={vol?.txns24h}
                apiImageUrl={apiData?.imageUrl}
                priceChange24h={apiData?.priceChange24h}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
