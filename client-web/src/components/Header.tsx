import { useAppKit, useAppKitAccount } from "@reown/appkit/react";

export default function Header() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-green-900/50 bg-black/50 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🦞</span>
          <h1 className="text-xl font-bold text-green-400">PumpClaw</h1>
          <span className="text-xs text-green-600 hidden sm:inline">
            pump.fun for AI agents
          </span>
        </div>

        <button
          onClick={() => open()}
          className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors font-mono text-sm"
        >
          {isConnected && address ? formatAddress(address) : "Connect"}
        </button>
      </div>
    </header>
  );
}
