import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { formatEther } from "viem";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="ml-1 text-green-700 hover:text-green-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? "✓" : "📋"}
    </button>
  );
}

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
    <div className="border border-green-900/50 bg-black/40 p-5 hover:border-green-500/50 transition-all hover:bg-black/60">
      {/* Header with logo */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0 w-14 h-14 overflow-hidden bg-green-900/30 border-2 border-green-800/50">
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
            <div className="w-full h-full flex items-center justify-center text-green-600 text-2xl">
              🦞
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-green-300 text-lg break-all">{token.name}</h3>
            <span className="text-xs text-green-700 flex-shrink-0">{timeAgo}</span>
          </div>
          <p className="text-green-500 font-mono">${token.symbol}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-green-600 text-sm">Initial FDV</span>
          <span className="text-green-300 font-semibold">{displayFdv} ETH</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-green-600 text-sm">Token CA</span>
          <div className="flex items-center">
            <a
              href={`https://basescan.org/token/${token.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 font-mono text-sm transition-colors"
            >
              {token.token.slice(0, 6)}...{token.token.slice(-4)}
            </a>
            <CopyButton text={token.token} />
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-green-600 text-sm">Creator</span>
          <div className="flex items-center">
            <a
              href={`https://basescan.org/address/${token.creator}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 font-mono text-sm transition-colors"
            >
              {token.creator.slice(0, 6)}...{token.creator.slice(-4)}
            </a>
            <CopyButton text={token.creator} />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <a
          href={`https://basescan.org/token/${token.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-center text-xs font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
        >
          BaseScan
        </a>
        <a
          href={dexScreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-center text-xs font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
        >
          DexScreener
        </a>
        <a
          href={`https://matcha.xyz/tokens/base/${token.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-center text-xs font-medium bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-green-300 transition-all"
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2">
          <span>📋</span> Recent Launches
          {count > 0 && (
            <span className="text-base font-normal text-green-600">
              ({count} total)
            </span>
          )}
        </h2>
        <button
          onClick={() => refetch()}
          className="text-sm text-green-600 hover:text-green-400 transition-colors px-3 py-1 border border-green-900/50 hover:border-green-700/50"
        >
          ↻ Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-green-600">Loading...</div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-12 text-green-700">
          No tokens launched yet. Be the first! 🦞
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {tokens.map((token) => (
            <TokenCard key={token.token} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}
