import { useState } from "react";
import { IconChartLine, IconChart } from "./Icons";

interface ChartEmbedProps {
  tokenAddress: string;
}

type ChartProvider = "dexscreener" | "gecko";

export default function ChartEmbed({ tokenAddress }: ChartEmbedProps) {
  const [provider, setProvider] = useState<ChartProvider>("gecko");
  const [hasError, setHasError] = useState(false);

  const dexScreenerUrl = `https://dexscreener.com/base/${tokenAddress}?embed=1&theme=dark&trades=0&info=0`;
  const geckoUrl = `https://www.geckoterminal.com/base/tokens/${tokenAddress}?embed=1&info=0&swaps=0`;

  const chartUrl = provider === "dexscreener" ? dexScreenerUrl : geckoUrl;

  if (hasError) {
    return (
      <div className="border border-neutral-800 bg-black/40 p-6 space-y-3">
        <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1"><IconChartLine size={14} /> Chart</h2>
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <IconChart size={40} />
          <p className="text-orange-500 text-sm">No chart data yet</p>
          <p className="text-neutral-600 text-xs text-center max-w-sm">
            Chart will appear after the token gets indexed by DexScreener or GeckoTerminal.
            PumpClaw uses Uniswap V4 — indexing may take some time.
          </p>
          <div className="flex gap-2 mt-2">
            <a
              href={`https://dexscreener.com/base/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium bg-neutral-900 border border-neutral-800 text-orange-400 hover:bg-neutral-800 hover:text-orange-300 transition-all"
            >
              DexScreener ↗
            </a>
            <a
              href={`https://www.geckoterminal.com/base/tokens/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium bg-neutral-900 border border-neutral-800 text-orange-400 hover:bg-neutral-800 hover:text-orange-300 transition-all"
            >
              GeckoTerminal ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-800 bg-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/50">
        <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wider inline-flex items-center gap-1"><IconChartLine size={14} /> Chart</h2>
        <div className="flex gap-1">
          <button
            onClick={() => { setProvider("dexscreener"); setHasError(false); }}
            className={`px-2.5 py-1 text-xs font-medium transition-all ${
              provider === "dexscreener"
                ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                : "text-neutral-500 border border-transparent hover:text-orange-400"
            }`}
          >
            DexScreener
          </button>
          <button
            onClick={() => { setProvider("gecko"); setHasError(false); }}
            className={`px-2.5 py-1 text-xs font-medium transition-all ${
              provider === "gecko"
                ? "bg-orange-500/15 text-orange-300 border border-orange-500/30"
                : "text-neutral-500 border border-transparent hover:text-orange-400"
            }`}
          >
            GeckoTerminal
          </button>
        </div>
      </div>
      
      {/* Chart iframe */}
      <div className="relative w-full" style={{ height: "min(60vh, 450px)", minHeight: "300px" }}>
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
