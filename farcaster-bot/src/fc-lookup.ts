/**
 * Farcaster user lookup via fc.hunt.town API (free, no API key needed).
 * Resolves @username → wallet address for creator/beneficiary assignment.
 */

const FC_API = 'https://fc.hunt.town/users';

export interface FcUser {
  fid: number;
  username: string;
  primaryAddress: string;
  addresses: string[];
  displayName: string;
  pfpUrl?: string;
}

/**
 * Lookup a Farcaster user by username.
 * Returns null if user not found or has no verified wallet.
 */
export async function lookupByUsername(username: string): Promise<FcUser | null> {
  // Strip @ prefix if present
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;

  try {
    const res = await fetch(`${FC_API}/byUsername/${clean}`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (!data.primaryAddress && (!data.addresses || data.addresses.length === 0)) return null;
    return {
      fid: data.fid,
      username: data.username,
      primaryAddress: data.primaryAddress || data.addresses[0],
      addresses: data.addresses || [],
      displayName: data.displayName || data.username,
      pfpUrl: data.pfpUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Lookup a Farcaster user by FID.
 */
export async function lookupByFid(fid: number): Promise<FcUser | null> {
  try {
    const res = await fetch(`${FC_API}/byFid/${fid}`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (!data.primaryAddress && (!data.addresses || data.addresses.length === 0)) return null;
    return {
      fid: data.fid,
      username: data.username,
      primaryAddress: data.primaryAddress || data.addresses[0],
      addresses: data.addresses || [],
      displayName: data.displayName || data.username,
      pfpUrl: data.pfpUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Lookup a Farcaster user by wallet address.
 */
export async function lookupByWallet(address: string): Promise<FcUser | null> {
  try {
    const res = await fetch(`${FC_API}/byWallet/${address}`);
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (!data.username) return null;
    return {
      fid: data.fid,
      username: data.username,
      primaryAddress: data.primaryAddress || data.addresses?.[0] || address,
      addresses: data.addresses || [address],
      displayName: data.displayName || data.username,
      pfpUrl: data.pfpUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve a @username to a wallet address.
 * Convenience wrapper for the most common use case.
 */
export async function resolveUsernameToWallet(username: string): Promise<string | null> {
  const user = await lookupByUsername(username);
  return user?.primaryAddress || null;
}
