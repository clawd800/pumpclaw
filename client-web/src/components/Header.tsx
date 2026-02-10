import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = (connectorId?: string) => {
    if (connectorId) {
      const connector = connectors.find((c) => c.id === connectorId);
      if (connector) {
        connect({ connector });
        setShowConnectors(false);
      }
    } else {
      // Show connector options if multiple available
      if (connectors.length > 1) {
        setShowConnectors(true);
      } else if (connectors.length === 1) {
        connect({ connector: connectors[0] });
      }
    }
  };

  const getConnectorName = (id: string) => {
    switch (id) {
      case "injected":
        return "Browser Wallet";
      case "coinbaseWalletSDK":
        return "Coinbase Wallet";
      case "walletConnect":
        return "WalletConnect";
      default:
        return id;
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

        <div className="relative">
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors font-mono text-sm"
            >
              {formatAddress(address)}
            </button>
          ) : (
            <>
              <button
                onClick={() => handleConnect()}
                disabled={isPending}
                className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 transition-colors font-mono text-sm disabled:opacity-50"
              >
                {isPending ? "Connecting..." : "Connect"}
              </button>

              {/* Connector dropdown */}
              {showConnectors && (
                <div className="absolute right-0 mt-2 w-48 bg-black border border-green-900/50 shadow-lg z-50">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector.id)}
                      disabled={isPending}
                      className="w-full px-4 py-3 text-left text-green-400 hover:bg-green-900/30 transition-colors text-sm border-b border-green-900/30 last:border-b-0"
                    >
                      {getConnectorName(connector.id)}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowConnectors(false)}
                    className="w-full px-4 py-2 text-center text-green-600 hover:text-green-400 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {/* Error display */}
          {error && (
            <div className="absolute right-0 mt-2 w-64 bg-red-900/20 border border-red-500/50 p-2 text-red-400 text-xs z-50">
              {error.message.includes("User rejected")
                ? "Connection cancelled"
                : error.message.slice(0, 100)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
