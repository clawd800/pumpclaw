import Header from "@/components/Header";
import CreateTokenForm from "@/components/CreateTokenForm";
import TokenList from "@/components/TokenList";
import { useLatestTokens } from "@/hooks/useTokens";

export default function App() {
  const { refetch } = useLatestTokens();

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <div>
            <CreateTokenForm onSuccess={refetch} />
          </div>
          <div>
            <TokenList />
          </div>
        </div>

        {/* Stats footer */}
        <footer className="mt-12 pt-8 border-t border-green-900/50 text-center text-sm text-green-700">
          <div className="flex flex-wrap justify-center gap-6">
            <a
              href="https://basescan.org/address/0xcdb08ff0adbf006aa492a5c346f9ce819bd8e369"
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
        </footer>
      </main>
    </div>
  );
}
