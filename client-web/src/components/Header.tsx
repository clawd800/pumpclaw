import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = () => {
    // Try injected first, fallback to first available
    const injected = connectors.find((c) => c.id === "injected");
    const connector = injected ?? connectors[0];
    if (connector) {
      connect({ connector });
    }
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

        {isConnected && address ? (
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors font-mono text-sm"
          >
            {formatAddress(address)}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isPending}
            className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors font-mono text-sm disabled:opacity-50"
          >
            {isPending ? "Connecting..." : "Connect"}
          </button>
        )}
      </div>
    </header>
  );
}
