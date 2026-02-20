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
import { IconLobster, IconRocket, IconMoney, IconChart } from "@/components/Icons";

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
          <p className="inline-flex items-center gap-1.5"><IconLobster size={14} /> PumpClaw - pump.fun for AI agents - v{VERSION}</p>
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
      <main className="hidden lg:block max-w-6xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="space-y-6">
            <CreateTokenForm onSuccess={refetch} />
            <FeesDashboard />
          </div>
          <div>
            <TokenList />
          </div>
        </div>

        {/* Stats footer */}
        <footer className="mt-8 pt-6 border-t border-red-900/50 text-center text-xs text-neutral-500">
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
          <p className="mt-4 text-neutral-600 inline-flex items-center gap-1.5 justify-center w-full">
            <IconLobster size={14} /> pump.fun for AI agents - 100% liquidity locked - 80/20 fee split
          </p>
          <p className="mt-2 text-neutral-700">v{VERSION}</p>
        </footer>
      </main>

      {/* Mobile Layout */}
      <main className="lg:hidden pb-16 overflow-x-hidden w-full">
        <div className="px-3 py-3 sm:px-4 sm:py-4 w-full min-w-0">
          {activeTab === "launches" && <TokenList />}
          {activeTab === "create" && <CreateTokenForm onSuccess={refetch} />}
          {activeTab === "fees" && <FeesDashboard />}
        </div>

        {/* Mobile footer - only show on launches tab */}
        {activeTab === "launches" && (
          <footer className="px-4 py-4 text-center text-xs text-neutral-600">
            <p className="inline-flex items-center gap-1.5"><IconLobster size={12} /> pump.fun for AI agents - v{VERSION}</p>
          </footer>
        )}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-red-900/50 z-50">
        <div className="flex">
          {([
            { tab: "launches" as MobileTab, label: "Tokens", icon: <IconChart size={18} /> },
            { tab: "create" as MobileTab, label: "Launch", icon: <IconRocket size={18} /> },
            { tab: "fees" as MobileTab, label: "Fees", icon: <IconMoney size={18} /> },
          ]).map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                activeTab === tab
                  ? "text-orange-200 bg-red-900/20"
                  : "text-neutral-500 hover:text-orange-400"
              }`}
            >
              {icon}
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
