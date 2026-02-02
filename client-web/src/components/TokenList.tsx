import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { formatEther } from "viem";
import { useState } from "react";
import { useReadContract } from "wagmi";
import { CONTRACTS } from "@/configs/constants";
import { ERC20_ABI } from "@/configs/abis";

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

// Website URL ABI
const WEBSITE_URL_ABI = [
  {
    type: "function",
    name: "websiteUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

function useWebsiteUrl(tokenAddress: `0x${string}`) {
  return useReadContract({
    address: tokenAddress,
    abi: WEBSITE_URL_ABI,
    functionName: "websiteUrl",
  });
}

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
    <div className="mt-3">
      <div className="flex justify-between text-xs text-green-600 mb-1">
        <span>Purchased</span>
        <span>{percentPurchased.toFixed(2)}%</span>
      </div>
      <div className="h-2 bg-green-900/30 border border-green-900/50 overflow-hidden">
        <div 
          className="h-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] transition-all duration-500"
          style={{ width: `${Math.min(percentPurchased, 100)}%` }}
        />
      </div>
    </div>
  );
}

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

function TokenCard({ token }: { token: TokenInfo }) {
  const { data: imageUrl } = useTokenImageUrl(token.token);
  const { data: websiteUrl } = useWebsiteUrl(token.token);
  
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
            <AddToMetaMaskButton tokenAddress={token.token} symbol={token.symbol} image={imageUrl} />
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
        
        {/* Progress bar showing purchased % */}
        <ProgressBar tokenAddress={token.token} />
      </div>

      {/* Action buttons */}
      <div className="space-y-2">
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
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 text-center text-xs font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
            >
              Website
            </a>
          ) : (
            <span className="flex-1 py-2 text-center text-xs font-medium bg-green-900/20 border border-green-900/30 text-green-800 cursor-not-allowed">
              Website
            </span>
          )}
        </div>
        <a
          href={`https://matcha.xyz/tokens/base/${token.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 text-center text-xs font-medium bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-green-300 transition-all"
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
