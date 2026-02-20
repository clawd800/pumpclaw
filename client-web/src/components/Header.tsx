import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useRouter } from "@/hooks/useRouter";
import { IconLobster } from "./Icons";

export default function Header() {
  const { goHome } = useRouter();
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

  const getConnectorName = (id: string, name?: string) => {
    const lower = id.toLowerCase();
    if (lower === "injected") return "Browser Wallet";
    if (lower === "coinbasewalletsdk") return "Coinbase Wallet";
    if (lower === "walletconnect") return "WalletConnect";
    if (lower.includes("phantom")) return "Phantom";
    if (lower.includes("metamask")) return "MetaMask";
    if (lower.includes("rabby")) return "Rabby";
    if (lower.includes("rainbow")) return "Rainbow";
    if (lower.includes("trust")) return "Trust Wallet";
    if (lower.includes("zerion")) return "Zerion";
    // Fallback to connector's own name, then clean up the id
    if (name) return name;
    return id.replace(/^(app\.|io\.|com\.)/, "").replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <header className="border-b border-red-900/50 bg-black/50 backdrop-blur-sm relative z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <button onClick={goHome} className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
          <IconLobster size={24} />
          <h1 className="text-lg sm:text-xl font-bold text-orange-200">PumpClaw</h1>
          <span className="text-[10px] sm:text-xs text-orange-500 hidden sm:inline">
            pump.fun for AI agents
          </span>
        </button>

        <div className="relative">
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="px-4 py-2 bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30 transition-colors font-mono text-sm"
            >
              {formatAddress(address)}
            </button>
          ) : (
            <>
              <button
                onClick={() => handleConnect()}
                disabled={isPending}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-600/20 border border-orange-500/40 text-orange-300 hover:bg-orange-600/30 transition-colors font-mono text-xs sm:text-sm disabled:opacity-50"
              >
                {isPending ? "..." : "Connect"}
              </button>

              {/* Connector dropdown */}
              {showConnectors && (
                <div className="absolute right-0 mt-2 w-48 bg-black border border-red-900/50 shadow-lg z-50">
                  {connectors.map((connector) => (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector.id)}
                      disabled={isPending}
                      className="w-full px-4 py-3 text-left text-orange-200 hover:bg-red-900/30 transition-colors text-sm border-b border-red-900/30 last:border-b-0"
                    >
                      {getConnectorName(connector.id, connector.name)}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowConnectors(false)}
                    className="w-full px-4 py-2 text-center text-orange-500 hover:text-orange-300 text-xs"
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
