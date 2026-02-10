/**
 * AI-powered deploy request parser
 * Uses Claude Sonnet to understand context and extract token name, symbol, and image.
 * Falls back to regex parser if API is unavailable.
 */

import { parseDeployRequest as regexParse, extractImageFromEmbeds, type DeployRequest } from './parse.js';

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

function getAnthropicKey(): string {
  // Try env vars (OpenClaw may inject these)
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  if (process.env.AUTH_TOKEN?.startsWith('sk-ant-')) return process.env.AUTH_TOKEN;
  
  // Try reading from pumpclaw .env
  try {
    const { readFileSync } = require('fs');
    const { join, dirname } = require('path');
    const envPath = join(dirname(new URL(import.meta.url).pathname), '../../.env');
    const envContent = readFileSync(envPath, 'utf8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.+)/);
    if (match) return match[1].trim();
  } catch {}
  
  return '';
}

const DEPLOY_KEYWORDS = /\b(deploy|launch|create|mint|make)\b/i;

/**
 * Quick check: is this text likely a deploy request?
 * Cheap regex — no API call needed.
 */
export function isDeployRequest(text: string): boolean {
  return /@clawd/i.test(text) && DEPLOY_KEYWORDS.test(text);
}

/**
 * AI-powered parsing: understands context to extract name, symbol, imageUrl.
 */
export async function aiParseDeployRequest(
  text: string,
  embeds?: any[],
  authorUsername?: string,
): Promise<DeployRequest | null> {
  
  if (!isDeployRequest(text)) return null;
  
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    console.log('[ai-parse] No Anthropic API key, falling back to regex parser');
    return regexParse(text, embeds);
  }
  
  // Build context about embeds
  const embedInfo = (embeds || []).map(e => {
    const url = e?.url || '';
    const contentType = e?.metadata?.content_type || '';
    return `URL: ${url} (${contentType})`;
  }).join('\n');
  
  const prompt = `You are a token deploy request parser for PumpClaw (a token launcher on Base).

A user posted this on Farcaster:
---
@${authorUsername || 'unknown'}: ${text}
---
${embedInfo ? `\nAttached media:\n${embedInfo}\n` : ''}
Extract the token details the user wants to deploy. Respond with ONLY valid JSON (no markdown, no explanation):

{
  "name": "the token name",
  "symbol": "THE_SYMBOL",
  "imageUrl": "url or null"
}

Rules:
- "name" = the human-readable token name (e.g., "base babes", "Cool Token", "Shawarma")
- "symbol" = the ticker symbol, ALL CAPS, no $, max 10 chars (e.g., "BASEBABES", "COOL", "SHWRMA")
- If the user provided a $SYMBOL explicitly (not a placeholder like $TICKER), use it
- If no explicit symbol, derive a natural one from the name (CamelCase or abbreviation)
- Ignore placeholder text from templates like "$TICKER", "TokenName", "$SYMBOL" — those are NOT real values
- "imageUrl" = extract from the cast embeds if an image is attached. For video embeds, use the thumbnail URL if available. null if no image.
- If you cannot determine what the user wants to deploy, respond: {"error": "unclear"}`;

  try {
    const res = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    
    if (!res.ok) {
      console.log(`[ai-parse] API error ${res.status}, falling back to regex`);
      return regexParse(text, embeds);
    }
    
    const data = await res.json() as any;
    const content = data.content?.[0]?.text || '';
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[ai-parse] No JSON in response, falling back to regex`);
      return regexParse(text, embeds);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    if (parsed.error) {
      console.log(`[ai-parse] AI says: ${parsed.error}`);
      return null;
    }
    
    if (!parsed.name || !parsed.symbol) {
      console.log(`[ai-parse] Missing name or symbol, falling back to regex`);
      return regexParse(text, embeds);
    }
    
    // Sanitize
    const name = String(parsed.name).slice(0, 32).trim();
    const symbol = String(parsed.symbol).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const imageUrl = parsed.imageUrl || extractImageFromEmbeds(embeds) || undefined;
    
    if (!name || !symbol) return regexParse(text, embeds);
    
    console.log(`[ai-parse] Extracted: name="${name}", symbol="${symbol}", image=${imageUrl ? 'yes' : 'no'}`);
    
    return { name, symbol, imageUrl };
    
  } catch (err: any) {
    console.log(`[ai-parse] Error: ${err.message}, falling back to regex`);
    return regexParse(text, embeds);
  }
}
