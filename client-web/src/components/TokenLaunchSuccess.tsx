import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { FACTORY_ABI } from "@/configs/abis";

interface TokenLaunchSuccessProps {
  txHash: `0x${string}`;
  tokenName: string;
  tokenSymbol: string;
  onDismiss: () => void;
}

export default function TokenLaunchSuccess({
  txHash,
  tokenName,
  tokenSymbol,
  onDismiss,
}: TokenLaunchSuccessProps) {
  const publicClient = usePublicClient();
  const [tokenAddress, setTokenAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!txHash || !publicClient) return;
    (async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: FACTORY_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "TokenCreated") {
              setTokenAddress((decoded.args as any).token);
              break;
            }
          } catch {
            // not our event, skip
          }
        }
      } catch {
        // receipt not ready yet
      }
    })();
  }, [txHash, publicClient]);

  const tokenPageUrl = tokenAddress
    ? `https://pumpclaw.com/token/${tokenAddress}/`
    : null;
  const tradeUrl = tokenAddress
    ? `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`
    : null;

  const farcasterText = encodeURIComponent(
    `I just launched $${tokenSymbol} on PumpClaw 🦞\n\nFree launch • LP locked forever • 80% creator fees\n\n${tradeUrl || ""}`
  );
  const farcasterUrl = tokenPageUrl
    ? `https://farcaster.xyz/~/compose?text=${farcasterText}&embeds[]=${encodeURIComponent(tokenPageUrl)}`
    : null;

  const tweetText = encodeURIComponent(
    `I just launched $${tokenSymbol} on @pumpclaw 🦞\n\nFree launch • LP locked forever • 80% creator fees\n\n${tradeUrl || ""}`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  const handleCopy = async () => {
    if (!tokenAddress) return;
    await navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-orange-500/60 bg-gradient-to-b from-orange-950/40 to-black/60 p-6 space-y-5 animate-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="text-4xl">🦞🎉</div>
        <h2 className="text-xl font-bold text-orange-200">
          ${tokenSymbol} is LIVE!
        </h2>
        <p className="text-sm text-neutral-400">
          {tokenName} has been deployed to Base. Time to get some traders!
        </p>
      </div>

      {/* Token address */}
      {tokenAddress && (
        <div className="bg-black/50 border border-red-900/50 p-3 flex items-center justify-between gap-2">
          <code className="text-xs text-orange-300 truncate flex-1">
            {tokenAddress}
          </code>
          <button
            onClick={handleCopy}
            className="text-xs text-orange-500 hover:text-orange-300 whitespace-nowrap"
          >
            {copied ? "✓ Copied" : "📋 Copy CA"}
          </button>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-2">
        {tokenPageUrl && (
          <a
            href={`/#/token/${tokenAddress}`}
            className="py-2 text-center text-xs font-medium bg-red-900/30 border border-red-900/50 text-orange-300 hover:bg-red-900/50 transition-all"
          >
            📊 Token Page
          </a>
        )}
        {tradeUrl && (
          <a
            href={tradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 text-center text-xs font-medium bg-red-900/30 border border-red-900/50 text-orange-300 hover:bg-red-900/50 transition-all"
          >
            💱 Trade on Matcha
          </a>
        )}
        <a
          href={`https://basescan.org/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 text-center text-xs font-medium bg-black/40 border border-red-900/50 text-neutral-400 hover:text-orange-300 transition-all"
        >
          🔍 Basescan
        </a>
        {tokenAddress && (
          <a
            href={`https://dexscreener.com/base/${tokenAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 text-center text-xs font-medium bg-black/40 border border-red-900/50 text-neutral-400 hover:text-orange-300 transition-all"
          >
            📈 DexScreener
          </a>
        )}
      </div>

      {/* Share CTA — the key feature */}
      <div className="border-t border-orange-500/30 pt-4 space-y-3">
        <div className="text-center">
          <p className="text-sm font-semibold text-orange-400">
            🚀 Share to attract traders!
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Tokens that get shared get traded. Your followers are your first buyers.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {farcasterUrl && (
            <a
              href={farcasterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 text-center text-sm font-bold bg-purple-900/40 border border-purple-500/50 text-purple-300 hover:bg-purple-900/60 hover:text-purple-200 transition-all"
            >
              🟣 Share on Farcaster
            </a>
          )}
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-3 text-center text-sm font-bold bg-blue-900/40 border border-blue-500/50 text-blue-300 hover:bg-blue-900/60 hover:text-blue-200 transition-all"
          >
            𝕏 Share on X
          </a>
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="w-full py-2 text-xs text-neutral-600 hover:text-orange-400 transition-colors"
      >
        Launch another token →
      </button>
    </div>
  );
}
