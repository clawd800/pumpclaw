import { useState } from "react";
import Header from "@/components/Header";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenList from "@/components/TokenList";
import FeesDashboard from "@/components/FeesDashboard";
import { useLatestTokens } from "@/hooks/useTokens";
import { VERSION } from "./version";

type MobileTab = "launches" | "create" | "fees";

export default function App() {
  const { refetch } = useLatestTokens();
  const [activeTab, setActiveTab] = useState<MobileTab>("launches");

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <Header />

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
              href="https://github.com/pumpclawxyz/pumpclaw"
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
        <div className="px-4 py-4">
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
