import { useTokenCount } from "@/hooks/useTokens";

export default function ProtocolStats() {
  const { data: count, isLoading } = useTokenCount();
  const tokenCount = count ? Number(count) : "—";

  return (
    <div className="bg-green-900/10 border-b border-green-900/30">
      <div className="max-w-6xl mx-auto px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs sm:text-sm">
          <span className="text-green-300 font-semibold">
            🚀{" "}
            {isLoading ? (
              <span className="inline-block w-6 text-center animate-pulse">
                ···
              </span>
            ) : (
              <span className="text-green-200">{tokenCount}</span>
            )}{" "}
            Tokens Launched
          </span>
          <span className="text-green-600 hidden sm:inline">•</span>
          <span className="text-green-500">
            💰 <span className="text-green-300">80%</span> Creator Fees
          </span>
          <span className="text-green-600 hidden sm:inline">•</span>
          <span className="text-green-500">
            🔒 <span className="text-green-300">100%</span> LP Locked
          </span>
          <span className="text-green-600 hidden sm:inline">•</span>
          <span className="text-green-500">
            ⚡ <span className="text-green-300">$0</span> to Launch
          </span>
        </div>
      </div>
    </div>
  );
}
