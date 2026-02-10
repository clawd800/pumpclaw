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
  imageUrl?: string; // Best image URL extracted from embeds
  embeds: any[];     // Raw embed data for AI parsing
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
    const embeds: any[] = n.cast?.embeds || [];
    
    // Extract best image URL from embeds (priority order)
    let imageUrl: string | undefined;
    
    for (const e of embeds) {
      const meta = e.metadata || {};
      const ct = meta.content_type || '';
      const url = e.url || '';
      
      // 1. Direct image upload (highest priority)
      if (ct.startsWith('image/') || url.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i)) {
        imageUrl = url;
        break;
      }
      
      // 2. Image in metadata
      if (meta.image?.url) {
        imageUrl = meta.image.url;
        break;
      }
      
      // 3. imagedelivery.net URLs (Farcaster CDN, may not have extension)
      if (/imagedelivery\.net/i.test(url) && !ct.includes('video')) {
        imageUrl = url;
        break;
      }
      
      // 4. Video thumbnail — construct from stream URL
      if (ct === 'application/vnd.apple.mpegurl' || meta.video) {
        // Farcaster video thumbnails: replace .m3u8 with /thumbnail.jpg
        const thumbUrl = url.replace(/\.m3u8$/, '/thumbnail.jpg');
        if (thumbUrl !== url) {
          imageUrl = thumbUrl;
          // Don't break — prefer actual images if there are more embeds
        }
      }
      
      // 5. OG image from link embeds
      if (!imageUrl && meta.html?.ogImage?.[0]?.url) {
        imageUrl = meta.html.ogImage[0].url;
      }
    }
    
    // Build compact embed summary for AI parsing
    const embedSummary = embeds.map((e: any) => {
      const meta = e.metadata || {};
      const result: any = { url: e.url };
      if (meta.content_type) result.type = meta.content_type;
      if (meta.image) result.image = meta.image;
      if (meta.video) result.video = { duration_s: meta.video.duration_s };
      if (meta.html?.ogImage?.[0]?.url) result.ogImage = meta.html.ogImage[0].url;
      return result;
    });
    
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
      embeds: embedSummary,
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

export async function postCast(text: string, embeds?: Array<{url: string}>): Promise<string> {
  const body: any = {
    signer_uuid: CONFIG.SIGNER_UUID,
    text,
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
    throw new Error(`Failed to post cast: ${res.status} ${err}`);
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
