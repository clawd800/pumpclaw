// Farcaster API helpers (Neynar)
import { CONFIG } from './config.js';

const API = 'https://api.neynar.com/v2/farcaster';
const headers = {
  'x-api-key': CONFIG.NEYNAR_API_KEY,
  'Content-Type': 'application/json',
};

export interface FarcasterNotification {
  type: string;
  hash: string;
  text: string;
  authorFid: number;
  authorUsername: string;
  timestamp: string;
  parentHash?: string;
  verifiedAddresses: string[];
  imageUrl?: string; // First image embed from the cast
}

export async function getRecentMentions(cursor?: string): Promise<{
  mentions: FarcasterNotification[];
  nextCursor?: string;
}> {
  const url = new URL(`${API}/notifications`);
  url.searchParams.set('fid', String(CONFIG.BOT_FID));
  url.searchParams.set('limit', '25');
  url.searchParams.set('type', 'mentions');
  if (cursor) url.searchParams.set('cursor', cursor);
  
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`Neynar API error: ${res.status}`);
  
  const data = await res.json() as any;
  
  const mentions: FarcasterNotification[] = (data.notifications || []).map((n: any) => {
    // Extract first image URL from cast embeds
    const embeds: any[] = n.cast?.embeds || [];
    const imageEmbed = embeds.find((e: any) => 
      e.metadata?.content_type?.startsWith('image/') || 
      e.url?.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i) ||
      e.metadata?.image
    );
    const imageUrl = imageEmbed?.url || imageEmbed?.metadata?.image?.url || undefined;
    
    return {
      type: n.type,
      hash: n.cast?.hash || '',
      text: n.cast?.text || '',
      authorFid: n.cast?.author?.fid || 0,
      authorUsername: n.cast?.author?.username || 'unknown',
      timestamp: n.most_recent_timestamp || n.cast?.timestamp || '',
      parentHash: n.cast?.parent_hash,
      verifiedAddresses: n.cast?.author?.verified_addresses?.eth_addresses || [],
      imageUrl,
    };
  });
  
  return {
    mentions,
    nextCursor: data.next?.cursor,
  };
}

export async function replyCast(parentHash: string, text: string, embeds?: Array<{url: string}>): Promise<string> {
  const body: any = {
    signer_uuid: CONFIG.SIGNER_UUID,
    text,
    parent: parentHash,
  };
  if (embeds && embeds.length > 0) {
    body.embeds = embeds;
  }
  const res = await fetch(`${API}/cast`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to reply: ${res.status} ${err}`);
  }
  
  const data = await res.json() as any;
  return data.cast?.hash || '';
}

export async function getUserVerifiedAddress(fid: number): Promise<string | null> {
  const res = await fetch(`${API}/user/bulk?fids=${fid}`, { headers });
  if (!res.ok) return null;
  
  const data = await res.json() as any;
  const user = data.users?.[0];
  const ethAddresses = user?.verified_addresses?.eth_addresses || [];
  return ethAddresses[0] || null;
}
