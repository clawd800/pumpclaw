import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { formatEther } from "viem";
import { useState, useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/configs/constants";
import { TokenMedia } from "./TokenMedia";
import { ERC20_ABI } from "@/configs/abis";
import { useTokenPrice, useEthUsdPrice } from "@/hooks/useTokenPrice";

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
      <div className="flex justify-between text-[10px] sm:text-xs text-green-600 mb-0.5">
        <span>Purchased</span>
        <span>{percentPurchased.toFixed(2)}%</span>
      </div>
      <div className="h-1.5 sm:h-2 bg-green-900/30 border border-green-900/50 overflow-hidden">
        <div 
          className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all duration-500"
          style={{ width: `${Math.min(percentPurchased, 100)}%` }}
        />
      </div>
    </div>
  );
}

function AddToMetaMaskButton({ tokenAddress, symbol, decimals = 18, image }: { tokenAddress: string; symbol: string; decimals?: number; image?: string }) {
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        alert("MetaMask not detected");
        return;
      }
      
      await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: symbol.slice(0, 11), // MetaMask limits to 11 chars
            decimals: decimals,
            image: image || undefined,
          },
        },
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      console.error("Error adding token to MetaMask:", error);
    }
  };

  return (
    <button
      onClick={handleAdd}
      className="ml-1 hover:opacity-80 transition-opacity"
      title="Add to MetaMask"
    >
      {added ? (
        <span className="text-green-400">✓</span>
      ) : (
        <svg height="15" viewBox="0 0 16 15" width="16" xmlns="http://www.w3.org/2000/svg">
          <g fill="none">
            <path d="m15.214 0-6.253 4.69 1.159-2.76zm-14.418 0 6.191 4.733-1.106-2.804zm12.166 10.868-1.664 2.583 3.555.99 1.023-3.51zm-12.828.063 1.013 3.51 3.556-.99-1.654-2.583z" fill="#e27625"/>
            <path d="m4.506 6.525-.982 1.507 3.525.159-.124-3.837zm6.988.001-2.45-2.214-.084 3.878 3.525-.158zm-6.791 6.924 2.129-1.043-1.83-1.455zm4.465-1.043 2.13 1.044-.29-2.499z" fill="#e27625"/>
            <path d="m11.297 13.45-2.13-1.043.177 1.391-.021.601zm-6.594 0 1.974.95-.01-.602.165-1.391z" fill="#d7c1b3"/>
            <path d="m6.718 10.025-1.767-.527 1.25-.58zm2.574 0 .517-1.107 1.25.58z" fill="#2f343b"/>
            <path d="m4.703 13.45.31-2.582-1.964.063zm6.295-2.582.3 2.583 1.664-2.52zm1.488-2.835-3.526.157.33 1.834.518-1.107 1.25.58zm-7.536 1.465 1.251-.58.517 1.107.331-1.834-3.525-.158z" fill="#cc6228"/>
            <path d="m3.524 8.033 1.478 2.92-.051-1.455zm7.536 1.465-.052 1.455 1.478-2.92zm-4.011-1.308-.33 1.835.413 2.16.093-2.846zm1.912 0-.175 1.14.093 2.856.413-2.16z" fill="#e27625"/>
            <path d="m9.292 10.025-.413 2.16.289.222 1.84-1.455.051-1.454zm-4.342-.527.053 1.454 1.829 1.455.3-.221-.414-2.161z" fill="#f5841f"/>
            <path d="m9.323 14.4.02-.602-.155-.137h-2.367l-.155.137.01.601-1.973-.949.692.57 1.406.98h2.398l1.416-.98.682-.57z" fill="#c0ad9e"/>
            <path d="m9.168 12.407-.29-.221h-1.746l-.3.221-.166 1.392.156-.137h2.366l.155.137z" fill="#2f343b"/>
            <path d="m15.473 4.997.527-2.594-.786-2.403-6.046 4.533 2.325 1.992 3.287.96.724-.855-.32-.231.506-.464-.383-.295.497-.39zm-15.473-2.594.537 2.594-.34.253.506.39-.383.295.497.464-.31.231.723.854 3.277-.959 2.325-1.992-6.036-4.533z" fill="#763e1a"/>
            <path d="m14.78 7.485-3.286-.96.992 1.508-1.478 2.92 1.953-.022h2.915zm-10.273-.96-3.277.96-1.096 3.445h2.916l1.954.022-1.478-2.92zm4.454 1.665.207-3.657.95-2.604h-4.236l.95 2.604.218 3.657.072 1.16.01 2.836h1.747v-2.836z" fill="#f5841f"/>
          </g>
        </svg>
      )}
    </button>
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
    <span className="text-green-300 font-mono text-xs sm:text-sm font-semibold">
      {priceUsd !== null ? formatPrice(priceUsd) : `${ethPerToken.toExponential(1)} ETH`}
    </span>
  );
}

interface TokenCardProps {
  token: TokenInfo;
  isERC8004Registered: boolean;
}

function TokenCard({ token, isERC8004Registered }: TokenCardProps) {
  const { data: imageUrl } = useTokenImageUrl(token.token);
  
  const createdDate = new Date(Number(token.createdAt) * 1000);
  const timeAgo = getTimeAgo(createdDate);

  return (
    <div className="border border-green-900/50 bg-black/40 hover:border-green-500/50 transition-all hover:bg-black/60 group overflow-hidden">
      <a href={`#/token/${token.token}`} className="block p-3 sm:p-4 pb-2 sm:pb-3">
        {/* Header row: logo + info + price */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 overflow-hidden bg-green-900/30 border border-green-800/50 group-hover:border-green-600/50 transition-colors rounded-sm">
            {imageUrl ? (
              <TokenMedia src={imageUrl} alt={token.symbol} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-green-600 text-lg sm:text-xl">
                🦞
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-green-300 text-sm sm:text-base truncate group-hover:text-green-200 transition-colors">{token.name}</h3>
              {isERC8004Registered && <ERC8004Badge />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-green-500 font-mono text-xs sm:text-sm">${token.symbol}</span>
              <span className="text-green-800 text-[10px]">•</span>
              <span className="text-green-700 text-[10px] sm:text-xs" title={createdDate.toLocaleString()}>{timeAgo}</span>
            </div>
          </div>

          <div className="flex-shrink-0 text-right">
            <TokenPriceBadge tokenAddress={token.token} />
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
            className="flex-1 py-1.5 text-center text-[11px] sm:text-xs font-medium bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-green-300 transition-all"
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
            className="px-2 py-1.5 text-[11px] sm:text-xs bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all shrink-0"
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

type SortOption = 'recent' | 'marketcap';

export default function TokenList() {
  const { data: tokens, isLoading, count, refetch } = useLatestTokens();
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterERC8004, setFilterERC8004] = useState(false);

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
    if (sortBy === 'marketcap') {
      result.sort((a, b) => {
        const mcapA = marketCapMap.get(a.token.toLowerCase()) ?? a.initialFdv;
        const mcapB = marketCapMap.get(b.token.toLowerCase()) ?? b.initialFdv;
        // Sort by market cap descending (highest first)
        if (mcapB > mcapA) return 1;
        if (mcapB < mcapA) return -1;
        return 0;
      });
    }
    // 'recent' is already the default order from the hook

    return result;
  }, [tokens, sortBy, filterERC8004, erc8004StatusMap, marketCapMap]);

  return (
    <div className="sm:border sm:border-green-900/50 bg-black/30 p-1.5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-xl font-bold text-green-400 flex items-center gap-1.5 sm:gap-2">
          Tokens
          {count > 0 && (
            <span className="text-sm sm:text-base font-normal text-green-600">
              ({count})
            </span>
          )}
        </h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-green-600 hover:text-green-400 transition-colors px-2 py-1 border border-green-900/50 hover:border-green-700/50"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Sort Tabs & Filter */}
      <div className="flex flex-col gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-green-900/30">
        <div className="flex items-center gap-3">
          {/* Tab Buttons */}
          <div className="flex flex-1">
            <button
              onClick={() => setSortBy('recent')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium border transition-all ${
                sortBy === 'recent'
                  ? 'bg-green-600/20 border-green-500/50 text-green-300'
                  : 'bg-black/40 border-green-900/50 text-green-700 hover:text-green-500 hover:border-green-700/50'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy('marketcap')}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium border border-l-0 transition-all ${
                sortBy === 'marketcap'
                  ? 'bg-green-600/20 border-green-500/50 text-green-300'
                  : 'bg-black/40 border-green-900/50 text-green-700 hover:text-green-500 hover:border-green-700/50'
              }`}
            >
              Top MCap
            </button>
          </div>

          {/* Filter Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer group shrink-0">
            <input
              type="checkbox"
              checked={filterERC8004}
              onChange={(e) => setFilterERC8004(e.target.checked)}
              className="w-3.5 h-3.5 bg-black/60 border border-green-900/50 text-green-500 focus:ring-green-500 focus:ring-offset-0 cursor-pointer accent-green-500"
            />
            <span className="text-green-600 text-[11px] sm:text-sm group-hover:text-green-400 transition-colors">
              <span className="text-blue-400">8004</span>
            </span>
          </label>
        </div>

        {/* Show filtered count */}
        {filterERC8004 && displayedTokens.length !== tokens.length && (
          <span className="text-green-700 text-xs">
            {displayedTokens.length} of {tokens.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-green-600">Loading...</div>
      ) : displayedTokens.length === 0 ? (
        <div className="text-center py-12 text-green-700">
          {filterERC8004 
            ? "No ERC-8004 registered tokens found. Try removing the filter."
            : "No tokens launched yet. Be the first! 🦞"
          }
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {displayedTokens.map((token) => (
            <TokenCard 
              key={token.token} 
              token={token} 
              isERC8004Registered={erc8004StatusMap.get(token.creator.toLowerCase()) ?? false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
