import { useTokenCount, useTokens, type TokenInfo } from "@/hooks/useTokens";
import { useMemo } from "react";

interface CreatorStats {
  address: `0x${string}`;
  tokenCount: number;
  latestToken: { symbol: string; createdAt: bigint };
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span title="1st">🥇</span>;
  if (rank === 2) return <span title="2nd">🥈</span>;
  if (rank === 3) return <span title="3rd">🥉</span>;
  return <span className="text-green-700 text-xs font-mono w-5 inline-block text-right">#{rank}</span>;
}

export default function CreatorLeaderboard() {
  const { data: count } = useTokenCount();
  const total = count ? Number(count) : 0;

  const { data: allTokens } = useTokens(0, total);

  const leaderboard = useMemo<CreatorStats[]>(() => {
    if (!allTokens || allTokens.length === 0) return [];

    const map = new Map<string, CreatorStats>();
    for (const t of allTokens as TokenInfo[]) {
      const key = t.creator.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.tokenCount++;
        if (t.createdAt > existing.latestToken.createdAt) {
          existing.latestToken = { symbol: t.symbol, createdAt: t.createdAt };
        }
      } else {
        map.set(key, {
          address: t.creator,
          tokenCount: 1,
          latestToken: { symbol: t.symbol, createdAt: t.createdAt },
        });
      }
    }

    return [...map.values()]
      .sort((a, b) => b.tokenCount - a.tokenCount)
      .slice(0, 10);
  }, [allTokens]);

  if (!allTokens || leaderboard.length === 0) {
    return null;
  }

  // Compute unique creators and tokens in last 24h
  const uniqueCreators = new Set((allTokens as TokenInfo[]).map((t) => t.creator.toLowerCase())).size;
  const now = BigInt(Math.floor(Date.now() / 1000));
  const dayAgo = now - 86400n;
  const last24h = (allTokens as TokenInfo[]).filter((t) => t.createdAt > dayAgo).length;

  return (
    <div className="border border-green-900/50 bg-black/40 p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">
          🏆 Top Creators
        </h2>
        <div className="flex gap-3 text-xs">
          <span className="text-green-600">
            <span className="text-green-400 font-bold">{uniqueCreators}</span> creators
          </span>
          <span className="text-green-600">
            <span className={`font-bold ${last24h > 0 ? "text-green-300" : "text-green-600"}`}>
              +{last24h}
            </span>{" "}
            today
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {leaderboard.map((c, i) => (
          <a
            key={c.address}
            href={`https://basescan.org/address/${c.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 py-1.5 px-2 hover:bg-green-900/20 transition-colors group"
          >
            <span className="w-6 text-center flex-shrink-0">
              <RankBadge rank={i + 1} />
            </span>
            <span className="text-green-400 font-mono text-sm group-hover:text-green-300 transition-colors flex-1 min-w-0">
              {truncAddr(c.address)}
            </span>
            <span className="text-green-700 text-xs truncate max-w-[80px]" title={c.latestToken.symbol}>
              ${c.latestToken.symbol}
            </span>
            <span className="text-green-300 font-bold text-sm tabular-nums flex-shrink-0">
              {c.tokenCount}
            </span>
            <span className="text-green-700 text-xs flex-shrink-0">
              {c.tokenCount === 1 ? "token" : "tokens"}
            </span>
          </a>
        ))}
      </div>

      <div className="pt-2 border-t border-green-900/30 text-center">
        <p className="text-green-800 text-xs">
          Launch more tokens to climb the leaderboard 🦞
        </p>
      </div>
    </div>
  );
}
