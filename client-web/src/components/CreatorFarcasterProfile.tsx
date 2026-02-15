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

export function CreatorFarcasterProfile({ address }: { address: string }) {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const res = await fetch(
          `https://fc.hunt.town/users/byWallet/${address}`
        );
        if (!res.ok) throw new Error("Not found");
        const json = await res.json();
        if (!cancelled && json.username) {
          setUser(json);
        }
      } catch {
        // No FC profile — that's fine
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, [address]);

  if (loading || !user) return null;

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
