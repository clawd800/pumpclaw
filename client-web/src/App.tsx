import { useState } from "react";
import Header from "@/components/Header";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenList from "@/components/TokenList";
import TokenDetailPage from "@/components/TokenDetailPage";
import FeesDashboard from "@/components/FeesDashboard";
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
      <div className="min-h-screen bg-black text-orange-200 font-mono">
        <Header />
        <ProtocolStats />
        <LiveActivityTicker />
        <TokenDetailPage tokenAddress={route.tokenAddress} goHome={goHome} />
        <footer className="py-8 text-center text-sm text-neutral-500">
          <p>🦞 PumpClaw • pump.fun for AI agents • v{VERSION}</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-orange-200 font-mono overflow-x-hidden max-w-[100vw]">
      <Header />
      <ProtocolStats />
      <LiveActivityTicker />

      {/* Desktop Layout */}
      <main className="hidden lg:block max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-8">
            <CreateTokenForm onSuccess={refetch} />
            <FeesDashboard />
          </div>
          <div>
            <TokenList />
          </div>
        </div>

        {/* Stats footer */}
        <footer className="mt-12 pt-8 border-t border-red-900/50 text-center text-sm text-neutral-500">
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://basescan.org/address/0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 transition-colors"
            >
              Factory Contract ↗
            </a>
            <a
              href="https://github.com/clawd800/pumpclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 transition-colors"
            >
              GitHub ↗
            </a>
            <a
              href="https://api.pumpclaw.com/api/v1/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 transition-colors"
            >
              API ↗
            </a>
            <span>Built on Base 🔵</span>
          </div>
          <p className="mt-4 text-neutral-600">
            🦞 pump.fun for AI agents • 100% liquidity locked • 80/20 fee split
          </p>
          <p className="mt-2 text-neutral-700">v{VERSION}</p>
        </footer>
      </main>

      {/* Mobile Layout */}
      <main className="lg:hidden pb-20 overflow-x-hidden w-full">
        <div className="px-2 py-2 sm:px-4 sm:py-4 w-full min-w-0">
          {activeTab === "launches" && <TokenList />}
          {activeTab === "create" && <CreateTokenForm onSuccess={refetch} />}
          {activeTab === "fees" && <FeesDashboard />}
        </div>

        {/* Mobile footer - only show on launches tab */}
        {activeTab === "launches" && (
          <footer className="px-4 py-4 text-center text-xs text-neutral-600">
            <p>🦞 pump.fun for AI agents • v{VERSION}</p>
          </footer>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-red-900/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("launches")}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === "launches"
                ? "text-orange-200 bg-red-900/20"
                : "text-neutral-500 hover:text-orange-400"
            }`}
          >
            <span className="text-lg">📋</span>
            <p className="text-xs mt-1">Launches</p>
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === "create"
                ? "text-orange-200 bg-red-900/20"
                : "text-neutral-500 hover:text-orange-400"
            }`}
          >
            <span className="text-lg">🚀</span>
            <p className="text-xs mt-1">Launch</p>
          </button>
          <button
            onClick={() => setActiveTab("fees")}
            className={`flex-1 py-4 text-center transition-colors ${
              activeTab === "fees"
                ? "text-orange-200 bg-red-900/20"
                : "text-neutral-500 hover:text-orange-400"
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
