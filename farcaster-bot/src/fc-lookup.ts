/**
 * Farcaster user lookup via fc.hunt.town API (free, no API key needed).
 * Resolves @username → wallet address for creator/beneficiary assignment.
 */

const FC_API = 'https://fc.hunt.town/users';
const FETCH_TIMEOUT_MS = 8_000;

export interface FcUser {
  fid: number;
  username: string;
  primaryAddress: string;
  addresses: string[];
  displayName: string;
  pfpUrl?: string;
}

/**
 * Shared fetch helper — handles timeout, error handling, and response mapping.
 */
async function fetchFcUser(
  path: string,
  /** Validate response has enough data to be useful */
  validate: (data: any) => boolean = hasWalletOrUsername,
): Promise<FcUser | null> {
  try {
    const res = await fetch(`${FC_API}/${path}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    if (!validate(data)) return null;
    return mapToFcUser(data);
  } catch {
    return null;
  }
}

function hasWallet(data: any): boolean {
  return !!(data.primaryAddress || (data.addresses && data.addresses.length > 0));
}

function hasWalletOrUsername(data: any): boolean {
  return hasWallet(data) || !!data.username;
}

function mapToFcUser(data: any, fallbackAddress?: string): FcUser {
  return {
    fid: data.fid,
    username: data.username,
    primaryAddress: data.primaryAddress || data.addresses?.[0] || fallbackAddress || '',
    addresses: data.addresses || (fallbackAddress ? [fallbackAddress] : []),
    displayName: data.displayName || data.username,
    pfpUrl: data.pfpUrl,
  };
}

/**
 * Lookup a Farcaster user by username.
 * Returns null if user not found or has no verified wallet.
 */
export async function lookupByUsername(username: string): Promise<FcUser | null> {
  const clean = username.replace(/^@/, '').trim().toLowerCase();
  if (!clean) return null;
  return fetchFcUser(`byUsername/${clean}`, hasWallet);
}

/**
 * Lookup a Farcaster user by FID.
 */
export async function lookupByFid(fid: number): Promise<FcUser | null> {
  return fetchFcUser(`byFid/${fid}`, hasWallet);
}

/**
 * Lookup a Farcaster user by wallet address.
 */
export async function lookupByWallet(address: string): Promise<FcUser | null> {
  const user = await fetchFcUser(`byWallet/${address}`, (d) => !!d.username);
  // Ensure the queried address is in the addresses list
  if (user && !user.primaryAddress) user.primaryAddress = address;
  if (user && !user.addresses.includes(address)) user.addresses.push(address);
  return user;
}

/**
 * Resolve a @username to a wallet address.
 * Convenience wrapper for the most common use case.
 */
export async function resolveUsernameToWallet(username: string): Promise<string | null> {
  const user = await lookupByUsername(username);
  return user?.primaryAddress || null;
}
