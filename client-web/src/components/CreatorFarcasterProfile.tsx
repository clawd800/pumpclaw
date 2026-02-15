import { useState, useEffect } from "react";

interface FarcasterUser {
  username: string;
  displayName: string;
  pfpUrl: string;
  fid: number;
}

// Cache FC lookups in memory to avoid repeated fetches
const fcCache = new Map<string, FarcasterUser | null>();

function useFarcasterProfile(address: string) {
  const [user, setUser] = useState<FarcasterUser | null | undefined>(
    () => fcCache.get(address.toLowerCase()) ?? undefined
  );

  useEffect(() => {
    const key = address.toLowerCase();
    if (fcCache.has(key)) {
      setUser(fcCache.get(key) ?? null);
      return;
    }

    let cancelled = false;

    fetch(`https://fc.hunt.town/users/byWallet/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data && data.username) {
          const profile: FarcasterUser = {
            username: data.username,
            displayName: data.displayName || data.username,
            pfpUrl: data.pfp?.url || data.pfpUrl || "",
            fid: data.fid,
          };
          fcCache.set(key, profile);
          setUser(profile);
        } else {
          fcCache.set(key, null);
          setUser(null);
        }
      })
      .catch(() => {
        // Don't cache network errors — only cache intentional 404s
        if (!cancelled) setUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, [address]);

  return user;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Full badge with purple border — for token detail pages */
export function CreatorFarcasterProfile({ address }: { address: string }) {
  const user = useFarcasterProfile(address);

  if (user === undefined) return null; // loading
  if (user === null) {
    // No FC profile, show truncated address
    return (
      <span className="inline-flex items-center gap-1 text-xs text-neutral-500 font-mono">
        {truncAddr(address)}
      </span>
    );
  }

  return (
    <a
      href={`https://farcaster.xyz/${user.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-purple-900/30 border border-purple-500/30 text-purple-300 hover:bg-purple-900/50 transition-colors text-xs"
    >
      {user.pfpUrl && (
        <img
          src={user.pfpUrl}
          alt=""
          className="w-4 h-4 rounded-full object-cover"
          loading="lazy"
        />
      )}
      <span className="font-medium">@{user.username}</span>
    </a>
  );
}

/** Compact inline badge — for grid cards */
export function CreatorFarcasterBadge({ address }: { address: string }) {
  const user = useFarcasterProfile(address);

  if (user === undefined) return null; // loading

  if (user === null) {
    return (
      <span className="text-neutral-500 font-mono text-[11px] truncate">
        {truncAddr(address)}
      </span>
    );
  }

  return (
    <a
      href={`https://farcaster.xyz/${user.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors truncate"
      onClick={(e) => e.stopPropagation()}
    >
      {user.pfpUrl && (
        <img
          src={user.pfpUrl}
          alt=""
          className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
          loading="lazy"
        />
      )}
      <span className="truncate">@{user.username}</span>
    </a>
  );
}
