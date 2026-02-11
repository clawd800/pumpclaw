import { useTokenInfo, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { useState } from "react";
import { CONTRACTS } from "@/configs/constants";
import { TokenMedia } from "./TokenMedia";
import { ERC20_ABI } from "@/configs/abis";
import { useTokenPrice, useEthUsdPrice } from "@/hooks/useTokenPrice";
import SwapPanel from "./SwapPanel";
import ChartEmbed from "./ChartEmbed";

// ERC-8004 Registry on Base
const ERC8004_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as const;

const ERC721_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const WEBSITE_URL_ABI = [
  {
    type: "function",
    name: "websiteUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

const TOTAL_SUPPLY_ABI = [
  {
    type: "function",
    name: "totalSupply",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button
      onClick={handleCopy}
      className="text-green-600 hover:text-green-400 transition-colors text-sm"
      title={`Copy ${label || "to clipboard"}`}
    >
      {copied ? "✓ Copied!" : `📋 ${label || "Copy"}`}
    </button>
  );
}

function ShareButtons({ token }: { token: TokenInfo }) {
  // Use static URL for social sharing (crawlers read OG tags from static page)
  const tokenUrl = `https://pumpclaw.com/token/${token.token}/`;
  const tradeUrl = `https://matcha.xyz/tokens/base/${token.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
  
  // Farcaster compose intent
  const farcasterText = encodeURIComponent(
    `$${token.symbol} — launched on PumpClaw 🦞\n\nTrade: ${tradeUrl}`
  );
  const farcasterUrl = `https://farcaster.xyz/~/compose?text=${farcasterText}&embeds[]=${encodeURIComponent(tokenUrl)}`;
  
  // X/Twitter compose
  const tweetText = encodeURIComponent(
    `$${token.symbol} — launched on @pumpclaw 🦞\n\nTrade: ${tradeUrl}`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
  
  return (
    <div className="space-y-3">
      <h3 className="text-green-500 text-sm font-semibold uppercase tracking-wider">Share</h3>
      <div className="flex gap-2">
        <a
          href={farcasterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium bg-purple-900/30 border border-purple-500/50 text-purple-300 hover:bg-purple-900/50 hover:text-purple-200 transition-all"
        >
          🟣 Farcaster
        </a>
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium bg-blue-900/30 border border-blue-500/50 text-blue-300 hover:bg-blue-900/50 hover:text-blue-200 transition-all"
        >
          𝕏 X
        </a>
        <button
          onClick={(e) => {
            navigator.clipboard.writeText(tokenUrl);
            const btn = e.currentTarget;
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '🔗 Link'; }, 1500);
          }}
          className="flex-1 py-2 sm:py-3 text-center text-xs sm:text-sm font-medium bg-green-900/30 border border-green-800/50 text-green-400 hover:bg-green-900/50 hover:text-green-300 transition-all"
        >
          🔗 Link
        </button>
      </div>
    </div>
  );
}

function DetailProgressBar({ tokenAddress }: { tokenAddress: `0x${string}` }) {
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: TOTAL_SUPPLY_ABI,
    functionName: "totalSupply",
  });

  const { data: poolBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [CONTRACTS.POOL_MANAGER as `0x${string}`],
  });

  if (!totalSupply || !poolBalance) return null;

  const purchased = totalSupply - poolBalance;
  const percentPurchased = Number((purchased * 10000n) / totalSupply) / 100;
  const formattedPurchased = Number(formatEther(purchased)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const formattedTotal = Number(formatEther(totalSupply)).toLocaleString(undefined, { maximumFractionDigits: 0 });
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-green-600">Tokens Purchased</span>
        <span className="text-green-400 font-semibold">{percentPurchased.toFixed(2)}%</span>
      </div>
      <div className="h-4 bg-green-900/30 border border-green-900/50 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-700"
          style={{ width: `${Math.min(percentPurchased, 100)}%` }}
        />
      </div>
      <div className="text-xs text-green-700">
        {formattedPurchased} / {formattedTotal} tokens
      </div>
    </div>
  );
}

function MarketStats({ tokenAddress, totalSupply }: { tokenAddress: `0x${string}`; totalSupply: bigint }) {
  const { ethPerToken, isLoading: priceLoading } = useTokenPrice(tokenAddress);
  const ethUsd = useEthUsdPrice();
  
  if (priceLoading || ethPerToken === null) {
    return (
      <div className="border border-green-900/50 bg-black/40 p-6">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider mb-3">📊 Live Market Data</h2>
        <div className="text-green-700 text-sm animate-pulse">Reading V4 pool...</div>
      </div>
    );
  }

  const totalSupplyNum = Number(formatEther(totalSupply));
  const mcapEth = ethPerToken * totalSupplyNum;
  const priceUsd = ethUsd ? ethPerToken * ethUsd : null;
  const mcapUsd = ethUsd ? mcapEth * ethUsd : null;

  const formatPrice = (usd: number) => {
    if (usd < 0.00001) return `$${usd.toExponential(2)}`;
    if (usd < 0.01) return `$${usd.toFixed(6)}`;
    if (usd < 1) return `$${usd.toFixed(4)}`;
    return `$${usd.toFixed(2)}`;
  };

  const formatMcap = (usd: number) => {
    if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
    if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
    return `$${usd.toFixed(0)}`;
  };

  return (
    <div className="border border-green-900/50 bg-black/40 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">📊 Live Market Data</h2>
        <span className="text-green-800 text-xs">via Uniswap V4</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-green-700 text-xs uppercase mb-1">Price</div>
          <div className="text-green-300 text-xl font-bold font-mono">
            {priceUsd !== null ? formatPrice(priceUsd) : `${ethPerToken.toExponential(2)} ETH`}
          </div>
          {priceUsd !== null && (
            <div className="text-green-700 text-xs font-mono mt-0.5">
              {ethPerToken.toExponential(3)} ETH
            </div>
          )}
        </div>
        <div>
          <div className="text-green-700 text-xs uppercase mb-1">Market Cap</div>
          <div className="text-green-300 text-xl font-bold font-mono">
            {mcapUsd !== null ? formatMcap(mcapUsd) : `${mcapEth.toFixed(2)} ETH`}
          </div>
          {mcapUsd !== null && (
            <div className="text-green-700 text-xs font-mono mt-0.5">
              {mcapEth.toFixed(2)} ETH
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TokenDetailPage({ 
  tokenAddress, 
  goHome 
}: { 
  tokenAddress: `0x${string}`; 
  goHome: () => void;
}) {
  const { data: tokenInfo, isLoading } = useTokenInfo(tokenAddress);
  const { data: imageUrl } = useTokenImageUrl(tokenAddress);
  const { data: websiteUrl } = useReadContract({
    address: tokenAddress,
    abi: WEBSITE_URL_ABI,
    functionName: "websiteUrl",
  });

  // ERC-8004 check
  const creatorAddr = (tokenInfo as TokenInfo)?.creator;
  const { data: erc8004Balance } = useReadContract({
    address: ERC8004_REGISTRY,
    abi: ERC721_BALANCE_ABI,
    functionName: "balanceOf",
    args: creatorAddr ? [creatorAddr] : undefined,
    query: { enabled: !!creatorAddr },
  });
  const isERC8004 = erc8004Balance !== undefined && erc8004Balance > 0n;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-green-600 text-lg">Loading token...</div>
      </div>
    );
  }

  const token = tokenInfo as TokenInfo | undefined;

  if (!token || !token.token || token.token === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="text-green-600 text-lg">Token not found</div>
        <p className="text-green-800 text-sm">
          Address: <code className="text-green-700">{tokenAddress}</code>
        </p>
        <button
          onClick={goHome}
          className="px-6 py-2 bg-green-900/30 border border-green-800/50 text-green-400 hover:bg-green-900/50 transition-all"
        >
          ← Back to all tokens
        </button>
      </div>
    );
  }

  const fdvEth = parseFloat(formatEther(token.initialFdv));
  const displayFdv = fdvEth.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const createdDate = new Date(Number(token.createdAt) * 1000);
  const dexScreenerUrl = `https://dexscreener.com/base/${token.token}`;
  const tradeUrl = `https://matcha.xyz/tokens/base/${token.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
      {/* Back button */}
      <button
        onClick={goHome}
        className="text-green-600 hover:text-green-400 transition-colors text-xs sm:text-sm flex items-center gap-1"
      >
        ← Back
      </button>

      {/* Hero Section */}
      <div className="border border-green-900/50 bg-black/40 p-4 sm:p-8">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Token Logo */}
          <div className="flex-shrink-0 w-16 h-16 sm:w-32 sm:h-32 overflow-hidden bg-green-900/30 border-2 border-green-800/50 rounded-sm">
            {imageUrl ? (
              <TokenMedia src={imageUrl} alt={token.symbol} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-green-600 text-3xl sm:text-5xl">
                🦞
              </div>
            )}
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-3xl font-bold text-green-300 truncate">
              {token.name}
            </h1>
            <p className="text-green-500 text-base sm:text-xl font-mono mt-0.5">${token.symbol}</p>
            <p className="text-green-700 text-[11px] sm:text-sm mt-1 sm:mt-2">
              {createdDate.toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* In-App Swap */}
      <SwapPanel tokenAddress={token.token} tokenSymbol={token.symbol} />

      {/* Live Market Data */}
      <MarketStats tokenAddress={token.token} totalSupply={token.totalSupply} />

      {/* Chart */}
      <ChartEmbed tokenAddress={token.token} />

      {/* Progress */}
      <div className="border border-green-900/50 bg-black/40 p-6">
        <DetailProgressBar tokenAddress={token.token} />
      </div>

      {/* Details Grid */}
      <div className="border border-green-900/50 bg-black/40 p-3 sm:p-6 space-y-3 sm:space-y-4">
        <h2 className="text-green-500 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-2 sm:mb-4">Token Details</h2>
        
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-green-600 text-sm">Contract Address</span>
            <div className="flex items-center gap-2">
              <a
                href={`https://basescan.org/token/${token.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 font-mono text-sm transition-colors break-all"
              >
                {token.token}
              </a>
              <CopyButton text={token.token} label="CA" />
            </div>
          </div>

          <div className="border-t border-green-900/30" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-green-600 text-sm">Creator</span>
            <div className="flex items-center gap-2">
              <a
                href={`https://basescan.org/address/${token.creator}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 font-mono text-sm transition-colors"
              >
                {token.creator.slice(0, 10)}...{token.creator.slice(-8)}
              </a>
              <CopyButton text={token.creator} label="Address" />
              {isERC8004 && (
                <a
                  href="https://eips.ethereum.org/EIPS/eip-8004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-900/40 border border-blue-500/50 text-blue-400 hover:bg-blue-900/60 transition-colors"
                  title="ERC-8004 Verified Agent"
                >
                  ✓ 8004
                </a>
              )}
            </div>
          </div>

          <div className="border-t border-green-900/30" />

          <div className="flex items-center justify-between">
            <span className="text-green-600 text-sm">Initial FDV</span>
            <span className="text-green-300 font-semibold">{displayFdv} ETH</span>
          </div>

          <div className="border-t border-green-900/30" />

          <div className="flex items-center justify-between">
            <span className="text-green-600 text-sm">Total Supply</span>
            <span className="text-green-300 font-mono text-sm">
              {Number(formatEther(token.totalSupply)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          <div className="border-t border-green-900/30" />

          <div className="flex items-center justify-between">
            <span className="text-green-600 text-sm">LP Status</span>
            <span className="text-green-300 text-sm">🔒 Locked Forever</span>
          </div>

          <div className="border-t border-green-900/30" />

          <div className="flex items-center justify-between">
            <span className="text-green-600 text-sm">Fee Split</span>
            <span className="text-green-300 text-sm">80% Creator / 20% Protocol</span>
          </div>

          {websiteUrl && (
            <>
              <div className="border-t border-green-900/30" />
              <div className="flex items-center justify-between">
                <span className="text-green-600 text-sm">Website</span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-sm transition-colors"
                >
                  {websiteUrl} ↗
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* External Links */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        <a
          href={tradeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 sm:py-3 text-center text-[10px] sm:text-sm font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
        >
          Matcha
        </a>
        <a
          href={`https://basescan.org/token/${token.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 sm:py-3 text-center text-[10px] sm:text-sm font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
        >
          Scan
        </a>
        <a
          href={dexScreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 sm:py-3 text-center text-[10px] sm:text-sm font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
        >
          DexScr
        </a>
        <a
          href={`https://app.uniswap.org/swap?chain=base&outputCurrency=${token.token}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 sm:py-3 text-center text-[10px] sm:text-sm font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
        >
          Uniswap
        </a>
      </div>

      {/* Share Section */}
      <div className="border border-green-900/50 bg-black/40 p-6">
        <ShareButtons token={token} />
      </div>

      {/* Launch your own CTA */}
      <div className="border border-purple-900/50 bg-purple-900/10 p-4 sm:p-6 text-center space-y-2 sm:space-y-3">
        <p className="text-purple-300 text-sm sm:text-lg font-semibold">Launch your own token</p>
        <p className="text-purple-400/70 text-xs sm:text-sm">
          Free • 80% creator fees • LP locked forever
        </p>
        <div className="flex gap-2 sm:gap-3 justify-center mt-3">
          <button
            onClick={goHome}
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 transition-all text-xs sm:text-sm font-medium"
          >
            🚀 Launch
          </button>
          <a
            href="https://farcaster.xyz/~/compose?text=%40clawd%20deploy%20%24TICKER%20TokenName"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-purple-600/20 border border-purple-500/50 text-purple-300 hover:bg-purple-600/30 transition-all text-xs sm:text-sm font-medium"
          >
            🟣 Farcaster
          </a>
        </div>
      </div>
    </div>
  );
}
