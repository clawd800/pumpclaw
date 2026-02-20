import { IconLobster, IconChart } from "./Icons";

export default function PlatformTokenBanner() {
  const tokenAddress = "0x76767891Fe941e1934953e9bd63cDeD7b5c473Da";
  const geckoTerminalUrl = `https://www.geckoterminal.com/base/pools/${tokenAddress}`;
  const tradeUrl = `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
  };

  return (
    <div className="bg-orange-900/20 border-b border-orange-500/30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Left: Title & Description */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <IconLobster size={18} />
              <h3 className="text-orange-200 font-bold text-sm sm:text-base">
                $PUMPCLAW Platform Token
              </h3>
            </div>
            <p className="text-orange-300/70 text-xs sm:text-sm">
              The native token of the PumpClaw ecosystem
            </p>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyAddress}
              className="px-2 sm:px-3 py-1.5 bg-orange-800/30 border border-orange-600/40 text-orange-300 hover:bg-orange-800/50 transition-colors text-[10px] sm:text-xs rounded font-mono"
              title="Click to copy"
            >
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
            </button>
            <a
              href={tradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 sm:px-3 py-1.5 bg-orange-600/40 border border-orange-500/50 text-orange-100 hover:bg-orange-600/60 transition-colors text-[10px] sm:text-xs font-bold rounded"
            >
              Trade →
            </a>
            <a
              href={geckoTerminalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 sm:px-3 py-1.5 bg-orange-800/30 border border-orange-600/40 text-orange-300 hover:bg-orange-800/50 transition-colors text-[10px] sm:text-xs rounded"
            >
              <span className="inline-flex items-center gap-1">Chart <IconChart size={12} /></span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
