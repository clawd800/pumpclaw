import { useLatestTokens, useTokenImageUrl, type TokenInfo } from "@/hooks/useTokens";
import { useEffect, useState, useMemo } from "react";
import { TokenMedia } from "./TokenMedia";
import { IconLobster } from "./Icons";

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function TokenLogo({ token }: { token: TokenInfo }) {
  const { data: imageUrl } = useTokenImageUrl(token.token);
  return (
    <div className="w-6 h-6 flex-shrink-0 overflow-hidden rounded-full bg-red-900/30 border border-neutral-600/50">
      {imageUrl ? (
        <TokenMedia src={imageUrl} alt={token.symbol} />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><IconLobster size={10} /></div>
      )}
    </div>
  );
}

function TickerItem({ token }: { token: TokenInfo }) {
  const createdDate = new Date(Number(token.createdAt) * 1000);
  const timeAgo = getTimeAgo(createdDate);
  
  return (
    <a
      href={`#/token/${token.token}`}
      className="inline-flex items-center gap-2 px-4 py-1 hover:bg-red-900/20 transition-colors whitespace-nowrap group"
    >
      <TokenLogo token={token} />
      <span className="text-red-400 font-semibold group-hover:text-orange-200 transition-colors">
        ${token.symbol}
      </span>
      <span className="text-neutral-500 text-xs">
        {timeAgo}
      </span>
    </a>
  );
}

export default function LiveActivityTicker() {
  const { data: tokens, count } = useLatestTokens(10);
  const [now, setNow] = useState(Date.now());
  const [isLive, setIsLive] = useState(true);

  // Update timestamps every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Pulse the live dot
  useEffect(() => {
    const interval = setInterval(() => setIsLive((prev) => !prev), 1500);
    return () => clearInterval(interval);
  }, []);

  // Check if any token was created in the last hour (for "hot" indicator)
  const hasRecentActivity = useMemo(() => {
    if (!tokens.length) return false;
    const oneHourAgo = Date.now() - 3600000;
    return tokens.some((t) => Number(t.createdAt) * 1000 > oneHourAgo);
  }, [tokens, now]);

  if (!tokens.length) return null;

  return (
    <div className="bg-black/80 border-b border-red-900/30 overflow-hidden w-full max-w-[100vw]">
      <div className="max-w-6xl mx-auto flex items-center overflow-hidden">
        {/* Live badge */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 border-r border-red-900/30">
          <span
            className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-opacity duration-700 ${
              hasRecentActivity ? "bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.8)]" : "bg-neutral-500"
            } ${isLive ? "opacity-100" : "opacity-40"}`}
          />
          <span className="text-orange-400 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
            {count}
          </span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex animate-ticker">
            {/* Double the items for seamless loop */}
            {[...tokens, ...tokens].map((token, i) => (
              <TickerItem key={`${token.token}-${i}`} token={token} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
