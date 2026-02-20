import { useTokenCount } from "@/hooks/useTokens";
import { IconRocket, IconMoney, IconBolt } from "./Icons";

// Lock icon (only used here)
function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="11" width="14" height="10" rx="2" fill="url(#lock-grad)" />
      <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" stroke="#F7931A" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="#1a1a2e" />
      <defs>
        <linearGradient id="lock-grad" x1="12" y1="11" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7931A" />
          <stop offset="1" stopColor="#CC7000" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ProtocolStats() {
  const { data: count, isLoading } = useTokenCount();
  const tokenCount = count ? Number(count) : "—";

  return (
    <div className="bg-red-950/20 border-b border-red-900/30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-1.5">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-4 gap-y-0 text-xs">
          <span className="text-red-400 font-semibold inline-flex items-center gap-1">
            <IconRocket size={14} />
            {isLoading ? (
              <span className="inline-block w-5 text-center animate-pulse">
                ··
              </span>
            ) : (
              <span className="text-orange-200">{tokenCount}</span>
            )}{" "}
            Launched
          </span>
          <span className="text-orange-500 hidden sm:inline">·</span>
          <span className="text-orange-400 inline-flex items-center gap-1">
            <IconMoney size={14} /> <span className="text-red-400">80%</span> Creator
          </span>
          <span className="text-orange-500 hidden sm:inline">·</span>
          <span className="text-orange-400 inline-flex items-center gap-1">
            <IconLock size={14} /> <span className="text-red-400">100%</span> LP Locked
          </span>
          <span className="text-orange-500 hidden sm:inline">·</span>
          <span className="text-orange-400 inline-flex items-center gap-1">
            <IconBolt size={14} /> <span className="text-red-400">Free</span> Launch
          </span>
        </div>
      </div>
    </div>
  );
}
