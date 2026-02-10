// Parse Farcaster mention text into deploy request
// Supports patterns:
//   @clawd deploy $COOL Cool Token
//   @clawd launch "Cool Token" $COOL  
//   @clawd deploy base babes (auto-derives symbol)
//   @clawd create a token called "Cool Token" with ticker $COOL
//
// Also extracts imageUrl from cast embeds.

export interface DeployRequest {
  name: string;
  symbol: string;
  creatorAddress?: string;
  imageUrl?: string;
}

// Known placeholder words from our CTA templates — these are NOT real values
const PLACEHOLDER_SYMBOLS = new Set([
  'TICKER', 'SYMBOL', 'TOKEN', 'YOURTICKER', 'YOURSYMBOL',
  'MYTICKER', 'MYSYMBOL', 'MYTOKEN',
]);

// Only match these as COMPLETE phrases (not individual words within names)
const PLACEHOLDER_NAMES = [
  'tokenname', 'token name', 'mytoken', 'my token', 'my token name',
  'yourtoken', 'your token', 'your token name',
];

const DEPLOY_KEYWORDS = /\b(deploy|launch|create|mint|make)\b/i;

/**
 * Extract image URL from cast embeds (Farcaster cast object)
 */
export function extractImageFromEmbeds(embeds?: any[]): string | undefined {
  if (!embeds || !Array.isArray(embeds)) return undefined;
  
  for (const embed of embeds) {
    const url = embed?.url || embed?.cast?.embeds?.[0]?.url || '';
    if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) {
      return url;
    }
    // Cloudflare imagedelivery URLs (common on Farcaster)
    if (/imagedelivery\.net/i.test(url)) {
      return url;
    }
    // Other image hosting
    if (/\/(image|img|photo|media)\//i.test(url) && !/\.(mp4|mov|avi|webm)/i.test(url)) {
      return url;
    }
  }
  return undefined;
}

/**
 * Check if a string is a placeholder from our CTA template
 */
function isPlaceholderSymbol(s: string): boolean {
  return PLACEHOLDER_SYMBOLS.has(s.toUpperCase());
}

function isPlaceholderName(s: string): boolean {
  return PLACEHOLDER_NAMES.includes(s.toLowerCase().trim());
}

/**
 * Derive a symbol from a token name
 * "base babes" → "BASEBABES" (if short) or "BB" (if long)
 */
function deriveSymbol(name: string): string {
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  }
  // Multi-word: use initials if result is >= 2 chars, otherwise concat
  const initials = words.map(w => w[0]).join('').toUpperCase();
  if (initials.length >= 2) {
    // Also try full concat if short enough
    const concat = words.join('').replace(/[^A-Za-z0-9]/g, '');
    if (concat.length <= 10) {
      // CamelCase: capitalize first letter of each word
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('').replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
    }
    return initials.slice(0, 6);
  }
  return words.join('').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}

export function parseDeployRequest(text: string, embeds?: any[]): DeployRequest | null {
  // Find the deploy command line
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
  
  const deployLine = lines.find(l => /@clawd/i.test(l) && DEPLOY_KEYWORDS.test(l));
  if (!deployLine) {
    const fullText = text.replace(/\s+/g, ' ').trim();
    if (!/@clawd/i.test(fullText) || !DEPLOY_KEYWORDS.test(fullText)) return null;
    var t = fullText;
  } else {
    var t = deployLine.replace(/\s+/g, ' ').trim();
  }
  
  // Strip the @clawd deploy part to get the payload
  const payload = t
    .replace(/@clawd\s*/i, '')
    .replace(DEPLOY_KEYWORDS, '')
    .replace(/^\s*(a\s+)?(new\s+)?(token\s+)?(for\s+)?(me\s+)?/i, '')
    .trim();
  
  // === Extract $SYMBOL candidates (filter placeholders) ===
  let symbol: string | null = null;
  const symbolMatches = [...payload.matchAll(/\$([A-Z0-9]{1,10})\b/gi)];
  for (const m of symbolMatches) {
    if (!isPlaceholderSymbol(m[1])) {
      symbol = m[1].toUpperCase();
      break;
    }
  }
  
  // === Extract quoted name ===
  let name: string | null = null;
  const quotedMatch = payload.match(/[""\u201C]([^""\u201D]+)[""\u201D]/) || payload.match(/"([^"]+)"/);
  if (quotedMatch && !isPlaceholderName(quotedMatch[1])) {
    name = quotedMatch[1].trim();
  }
  
  // === Extract "called X" or "named X" pattern ===
  if (!name) {
    const calledMatch = payload.match(/(?:called|named)\s+[""]?([^""",.\n$]+)[""]?/i);
    if (calledMatch && !isPlaceholderName(calledMatch[1])) {
      name = calledMatch[1].trim();
    }
  }
  
  // === If no explicit name found, extract from payload after removing known parts ===
  if (!name) {
    let remaining = payload;
    
    // Remove all $SYMBOL references (including placeholders)
    remaining = remaining.replace(/\$[A-Z0-9]{1,10}\b/gi, '').trim();
    
    // Remove placeholder phrases only from the START of remaining text
    // (don't strip "token" from "Cool Token" — that's a real name)
    let cleaned = true;
    while (cleaned) {
      cleaned = false;
      for (const ph of PLACEHOLDER_NAMES) {
        if (remaining.toLowerCase().startsWith(ph)) {
          remaining = remaining.slice(ph.length).trim();
          cleaned = true;
        }
      }
    }
    
    // Remove common filler words (NOT "base" or "token" — those can be in real names)
    remaining = remaining
      .replace(/\b(with|ticker|symbol|called|named|please|pls|thanks|thx|for|on)\b/gi, '')
      .replace(/^(my|a|the)\s+/i, '')  // Only strip articles at the start
      .replace(/\s+/g, ' ')
      .trim();
    
    if (remaining.length >= 2) {
      name = remaining;
    }
  }
  
  // === Derive missing parts ===
  if (name && !symbol) {
    symbol = deriveSymbol(name);
  }
  
  if (symbol && !name) {
    name = symbol;
  }
  
  if (!name || !symbol) return null;
  
  // Sanitize
  name = name.replace(/[^\w\s.'&!-]/g, '').trim().slice(0, 32);
  symbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  
  if (!name || name.length < 1 || !symbol || symbol.length < 1) return null;
  
  // Extract image from embeds
  const imageUrl = extractImageFromEmbeds(embeds);
  
  return { name, symbol, imageUrl };
}
