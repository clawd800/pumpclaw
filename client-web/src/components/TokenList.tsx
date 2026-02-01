import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { formatEther } from "viem";

function TokenCard({ token }: { token: TokenInfo }) {
  const { data: imageUrl } = useTokenImageUrl(token.token);
  
  const fdvEth = parseFloat(formatEther(token.initialFdv));
  const displayFdv = fdvEth.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });

  const createdDate = new Date(Number(token.createdAt) * 1000);
  const timeAgo = getTimeAgo(createdDate);

  const dexScreenerUrl = `https://dexscreener.com/base/${token.token}`;

  return (
    <div className="border border-green-900/50 bg-black/30 p-4 hover:border-green-500/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        {/* Token Logo */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden bg-green-900/30 border border-green-900/50">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={token.symbol}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-green-600 text-lg">
              🦞
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-green-400 truncate">{token.name}</h3>
              <p className="text-sm text-green-600">${token.symbol}</p>
            </div>
            <span className="text-xs text-green-700 flex-shrink-0">{timeAgo}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-green-600">
          <span>Initial FDV:</span>
          <span className="text-green-400">{displayFdv} ETH</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Creator:</span>
          <a
            href={`https://basescan.org/address/${token.creator}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:underline"
          >
            {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
          </a>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a
          href={`https://basescan.org/token/${token.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 text-center text-xs bg-green-900/30 border border-green-900/50 text-green-500 hover:bg-green-900/50 transition-colors"
        >
          BaseScan
        </a>
        <a
          href={dexScreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 text-center text-xs bg-purple-900/30 border border-purple-900/50 text-purple-400 hover:bg-purple-900/50 transition-colors"
        >
          DexScreener
        </a>
        <a
          href={`https://app.uniswap.org/swap?outputCurrency=${token.token}&chain=base`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1.5 text-center text-xs bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors"
        >
          Trade
        </a>
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

export default function TokenList() {
  const { data: tokens, isLoading, count, refetch } = useLatestTokens(20);

  return (
    <div className="border border-green-900/50 bg-black/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-green-400 flex items-center gap-2">
          <span>📋</span> Recent Launches
          {count > 0 && (
            <span className="text-sm font-normal text-green-600">
              ({count} total)
            </span>
          )}
        </h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-green-600 hover:text-green-400 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-green-600">Loading...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8 text-green-700">
          No tokens launched yet. Be the first! 🦞
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <TokenCard key={token.token} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}
