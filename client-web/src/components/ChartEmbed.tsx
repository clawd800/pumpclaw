import { useState } from "react";

interface ChartEmbedProps {
  tokenAddress: string;
}

type ChartProvider = "dexscreener" | "gecko";

export default function ChartEmbed({ tokenAddress }: ChartEmbedProps) {
  const [provider, setProvider] = useState<ChartProvider>("gecko");
  const [hasError, setHasError] = useState(false);

  const dexScreenerUrl = `https://dexscreener.com/base/${tokenAddress}?embed=1&theme=dark&trades=0&info=0`;
  const geckoUrl = `https://www.geckoterminal.com/base/tokens/${tokenAddress}?embed=1&info=0&swaps=1`;

  const chartUrl = provider === "dexscreener" ? dexScreenerUrl : geckoUrl;

  if (hasError) {
    return (
      <div className="border border-green-900/50 bg-black/40 p-6 space-y-3">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">📈 Chart</h2>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <span className="text-4xl">📊</span>
          <p className="text-green-600 text-sm">No chart data yet</p>
          <p className="text-green-800 text-xs text-center max-w-sm">
            Chart will appear after the token gets indexed by DexScreener or GeckoTerminal.
            PumpClaw uses Uniswap V4 — indexing may take some time.
          </p>
          <div className="flex gap-2 mt-2">
            <a
              href={`https://dexscreener.com/base/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
            >
              DexScreener ↗
            </a>
            <a
              href={`https://www.geckoterminal.com/base/tokens/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium bg-green-900/30 border border-green-800/50 text-green-500 hover:bg-green-900/50 hover:text-green-400 transition-all"
            >
              GeckoTerminal ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-900/50 bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-green-900/30">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">📈 Chart</h2>
        <div className="flex gap-1">
          <button
            onClick={() => { setProvider("dexscreener"); setHasError(false); }}
            className={`px-2.5 py-1 text-xs font-medium transition-all ${
              provider === "dexscreener"
                ? "bg-green-600/25 text-green-300 border border-green-500/50"
                : "text-green-700 border border-transparent hover:text-green-500"
            }`}
          >
            DexScreener
          </button>
          <button
            onClick={() => { setProvider("gecko"); setHasError(false); }}
            className={`px-2.5 py-1 text-xs font-medium transition-all ${
              provider === "gecko"
                ? "bg-green-600/25 text-green-300 border border-green-500/50"
                : "text-green-700 border border-transparent hover:text-green-500"
            }`}
          >
            GeckoTerminal
          </button>
        </div>
      </div>
      
      {/* Chart iframe — taller on mobile for readability */}
      <div className="relative w-full" style={{ height: "min(80vh, 600px)", minHeight: "400px" }}>
        <iframe
          key={provider}
          src={chartUrl}
          className="w-full h-full border-0"
          title={`${provider} chart`}
          sandbox="allow-scripts allow-same-origin allow-popups"
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
}
