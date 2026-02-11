import { useTokenCount } from "@/hooks/useTokens";

export default function ProtocolStats() {
  const { data: count, isLoading } = useTokenCount();
  const tokenCount = count ? Number(count) : "—";

  return (
    <div className="bg-green-900/10 border-b border-green-900/30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-5 gap-y-0.5 text-[11px] sm:text-sm">
          <span className="text-green-300 font-semibold">
            🚀{" "}
            {isLoading ? (
              <span className="inline-block w-5 text-center animate-pulse">
                ··
              </span>
            ) : (
              <span className="text-green-200">{tokenCount}</span>
            )}{" "}
            Launched
          </span>
          <span className="text-green-600 hidden sm:inline">•</span>
          <span className="text-green-500">
            💰 <span className="text-green-300">80%</span> Creator
          </span>
          <span className="text-green-600 hidden sm:inline">•</span>
          <span className="text-green-500">
            🔒 <span className="text-green-300">100%</span> LP Locked
          </span>
          <span className="text-green-600 hidden sm:inline">•</span>
          <span className="text-green-500">
            ⚡ <span className="text-green-300">Free</span> Launch
          </span>
        </div>
      </div>
    </div>
  );
}
