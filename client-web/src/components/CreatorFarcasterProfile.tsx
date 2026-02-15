import { useState, useEffect } from "react";

interface FarcasterUser {
  fid: number;
  username: string;
  primaryAddress: string;
  pfpUrl: string;
  displayName: string;
  bio: string;
  followersCount: number;
}

// In-memory cache to avoid repeated fetches across cards/re-renders
const fcCache = new Map<string, FarcasterUser | null>();

function useFarcasterProfile(address: string) {
  const key = address.toLowerCase();
  const [user, setUser] = useState<FarcasterUser | null | undefined>(
    () => (fcCache.has(key) ? fcCache.get(key) ?? null : undefined)
  );

  useEffect(() => {
    if (fcCache.has(key)) {
      setUser(fcCache.get(key) ?? null);
      return;
    }

    let cancelled = false;

    fetch(`https://fc.hunt.town/users/byWallet/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json && json.username) {
          fcCache.set(key, json);
          setUser(json);
        } else {
          fcCache.set(key, null);
          setUser(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          fcCache.set(key, null);
          setUser(null);
        }
      });

    return () => { cancelled = true; };
  }, [address, key]);

  return user;
}

function truncAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Full badge with purple border — for token detail pages */
export function CreatorFarcasterProfile({ address }: { address: string }) {
  const user = useFarcasterProfile(address);

  if (user === undefined) return null; // loading
  if (user === null) return null; // no FC profile

  const profileUrl = `https://farcaster.xyz/${user.username}`;

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-purple-900/30 border border-purple-500/40 hover:bg-purple-900/50 transition-colors rounded-sm"
      title={`${user.displayName} on Farcaster`}
    >
      <img
        src={user.pfpUrl}
        alt={user.username}
        className="w-4 h-4 rounded-full flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <span className="text-purple-300 text-xs font-medium">
        @{user.username}
      </span>
    </a>
  );
}

/** Compact inline badge — for grid cards. Shows truncated address if no FC profile. */
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
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <span className="truncate">@{user.username}</span>
    </a>
  );
}
