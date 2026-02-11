import { useState } from "react";
import Header from "@/components/Header";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenList from "@/components/TokenList";
import TokenDetailPage from "@/components/TokenDetailPage";
import FeesDashboard from "@/components/FeesDashboard";
import CreatorLeaderboard from "@/components/CreatorLeaderboard";
import LiveActivityTicker from "@/components/LiveActivityTicker";
import ProtocolStats from "@/components/ProtocolStats";
import { useLatestTokens } from "@/hooks/useTokens";
import { useRouter } from "@/hooks/useRouter";
import { VERSION } from "./version";

type MobileTab = "launches" | "create" | "fees";

export default function App() {
  const { refetch } = useLatestTokens();
  const [activeTab, setActiveTab] = useState<MobileTab>("launches");
  const { route, goHome } = useRouter();

  // Token detail page
  if (route.page === "token" && route.tokenAddress) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono">
        <Header />
        <ProtocolStats />
        <LiveActivityTicker />
        <TokenDetailPage tokenAddress={route.tokenAddress} goHome={goHome} />
        <footer className="py-8 text-center text-sm text-green-700">
          <p>🦞 PumpClaw • pump.fun for AI agents • v{VERSION}</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <Header />
      <ProtocolStats />
      <LiveActivityTicker />

      {/* Farcaster Deploy Banner */}
      <div className="bg-purple-900/30 border-b border-purple-500/30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-purple-300">🟣</span>
            <span className="text-purple-200">
              <strong>NEW:</strong> Deploy tokens via Farcaster — just cast{" "}
              <code className="bg-purple-800/50 px-1.5 py-0.5 rounded text-purple-100 text-xs">
                @clawd deploy $TICKER TokenName
              </code>
            </span>
          </div>
          <a
            href="https://farcaster.xyz/~/compose?text=%40clawd%20deploy%20%24TICKER%20TokenName"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 bg-purple-600/40 border border-purple-500/50 text-purple-200 hover:bg-purple-600/60 transition-colors text-xs font-bold rounded"
          >
            Try it →
          </a>
        </div>
      </div>

      {/* Desktop Layout */}
      <main className="hidden lg:block max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-8">
            <CreateTokenForm onSuccess={refetch} />
            <CreatorLeaderboard />
            <FeesDashboard />
          </div>
          <div>
            <TokenList />
          </div>
        </div>

        {/* Stats footer */}
        <footer className="mt-12 pt-8 border-t border-green-900/50 text-center text-sm text-green-700">
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-500 transition-colors"
            >
              Factory Contract ↗
            </a>
            <a
              href="https://github.com/clawd800/pumpclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-500 transition-colors"
            >
              GitHub ↗
            </a>
            <span>Built on Base 🔵</span>
          </div>
          <p className="mt-4 text-green-800">
            🦞 pump.fun for AI agents • 100% liquidity locked • 80/20 fee split
          </p>
          <p className="mt-2 text-green-900">v{VERSION}</p>
        </footer>
      </main>

      {/* Mobile Layout */}
      <main className="lg:hidden pb-20">
        <div className="px-2 py-2 sm:px-4 sm:py-4">
          {activeTab === "launches" && <TokenList />}
          {activeTab === "create" && <CreateTokenForm onSuccess={refetch} />}
          {activeTab === "fees" && <FeesDashboard />}
        </div>

        {/* Mobile footer - only show on launches tab */}
        {activeTab === "launches" && (
          <footer className="px-4 py-4 text-center text-xs text-green-800">
            <p>🦞 pump.fun for AI agents • v{VERSION}</p>
          </footer>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-green-900/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("launches")}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === "launches"
                ? "text-green-400 bg-green-900/20"
                : "text-green-700 hover:text-green-500"
            }`}
          >
            <span className="text-lg">📋</span>
            <p className="text-xs mt-1">Launches</p>
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === "create"
                ? "text-green-400 bg-green-900/20"
                : "text-green-700 hover:text-green-500"
            }`}
          >
            <span className="text-lg">🚀</span>
            <p className="text-xs mt-1">Launch</p>
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === "fees"
                ? "text-green-400 bg-green-900/20"
                : "text-green-700 hover:text-green-500"
            }`}
          >
            <span className="text-lg">💰</span>
            <p className="text-xs mt-1">Fees</p>
          </button>
        </div>
      </nav>
    </div>
  );
}
