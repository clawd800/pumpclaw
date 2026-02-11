import { useState } from "react";

type Provider = "dexscreener" | "geckoterminal";

interface ChartEmbedProps {
  tokenAddress: string;
}

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: "dexscreener", label: "DexScreener" },
  { id: "geckoterminal", label: "GeckoTerminal" },
];

function getEmbedUrl(provider: Provider, tokenAddress: string): string {
  if (provider === "geckoterminal") {
    return `https://www.geckoterminal.com/base/tokens/${tokenAddress}?embed=1&info=0&swaps=1`;
  }
  return `https://dexscreener.com/base/${tokenAddress}?embed=1&theme=dark&trades=0&info=0`;
}

export default function ChartEmbed({ tokenAddress }: ChartEmbedProps) {
  const [provider, setProvider] = useState<Provider>("dexscreener");
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="border border-green-900/50 bg-black/40 p-6 space-y-4">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">📈 Chart</h2>
        <div className="text-center py-8 space-y-3">
          <p className="text-green-600 text-sm">No chart data available yet</p>
          <p className="text-green-800 text-xs">Charts appear once there is trading activity</p>
          <div className="flex justify-center gap-3 mt-4">
            <a
              href={`https://dexscreener.com/base/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs bg-green-900/30 border border-green-800/50 text-green-500 hover:text-green-400 transition-colors"
            >
              DexScreener ↗
            </a>
            <a
              href={`https://www.geckoterminal.com/base/tokens/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs bg-green-900/30 border border-green-800/50 text-green-500 hover:text-green-400 transition-colors"
            >
              GeckoTerminal ↗
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-green-900/50 bg-black/40 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">📈 Chart</h2>
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProvider(p.id); setHasError(false); }}
              className={`px-3 py-1.5 text-xs font-medium border transition-all ${
                provider === p.id
                  ? "bg-green-600/30 border-green-500/60 text-green-300"
                  : "bg-black/40 border-green-900/50 text-green-600 hover:border-green-700/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="aspect-[16/9] w-full">
        <iframe
          key={provider}
          src={getEmbedUrl(provider, tokenAddress)}
          title={`${provider} chart`}
          className="w-full h-full border-0"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
          onError={() => setHasError(true)}
        />
      </div>
    </div>
  );
}
