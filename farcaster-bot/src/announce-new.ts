#!/usr/bin/env npx tsx
/**
 * Auto-announce new PumpClaw tokens on Farcaster.
 *
 * Watches the factory for new tokens and posts announcements
 * for any that haven't been announced yet.
 * 
 * This catches tokens deployed via:
 * - The web frontend (pumpclaw.com)
 * - CLI (pumpclaw-cli)
 * - Direct contract calls
 *
 * Tokens deployed via the FC bot are already announced by bot.ts,
 * so they're tracked here to avoid double-posting.
 *
 * Usage: npx tsx src/announce-new.ts
 * Set ANNOUNCE_DRY_RUN=true to test without posting.
 */
import { createPublicClient, http, formatEther, type Address } from 'viem';
import { base } from 'viem/chains';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG, baseTransport } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dirname, '../announce-state.json');
const DRY_RUN = process.env.ANNOUNCE_DRY_RUN === 'true';
const MAX_ANNOUNCES_PER_RUN = 2; // Conservative to avoid spam

// Neynar API
const NEYNAR_API = 'https://api.neynar.com/v2/farcaster';

interface AnnounceState {
  lastTokenCount: number;
  announcedTokens: string[]; // lowercase addresses
  lastAnnounceTime: number;  // unix ms
}

function loadState(): AnnounceState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    }
  } catch {}
  return {
    lastTokenCount: 0,
    announcedTokens: [],
    lastAnnounceTime: 0,
  };
}

function saveState(state: AnnounceState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const FACTORY_ABI = [
  {
    type: 'function',
    name: 'getTokenCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTokens',
    inputs: [
      { name: 'startIndex', type: 'uint256' },
      { name: 'endIndex', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'token', type: 'address' },
          { name: 'creator', type: 'address' },
          { name: 'positionId', type: 'uint256' },
          { name: 'totalSupply', type: 'uint256' },
          { name: 'initialFdv', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'symbol', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'imageUrl',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const;

function loadDeployMap(): Record<string, {castHash: string, username: string}> {
  try {
    const mapFile = join(__dirname, '../deploy-map.json');
    if (existsSync(mapFile)) {
      return JSON.parse(readFileSync(mapFile, 'utf8'));
    }
  } catch {}
  return {};
}

async function postCast(text: string, embeds?: Array<{url: string}>): Promise<string> {
  const body: any = {
    signer_uuid: CONFIG.SIGNER_UUID,
    text,
  };
  if (embeds?.length) body.embeds = embeds;

  const res = await fetch(`${NEYNAR_API}/cast`, {
    method: 'POST',
    headers: {
      'x-api-key': CONFIG.NEYNAR_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Neynar post failed (${res.status}): ${err}`);
  }

  const data = await res.json() as any;
  return data.cast?.hash || 'unknown';
}

async function main() {
  console.log(`[announce] Starting... (DRY_RUN=${DRY_RUN})`);

  const client = createPublicClient({
    chain: base,
    transport: baseTransport,
  });

  const state = loadState();

  // Get current token count
  const tokenCount = await client.readContract({
    address: CONFIG.FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getTokenCount',
  }) as bigint;

  const count = Number(tokenCount);
  console.log(`[announce] Factory: ${count} tokens, last check: ${state.lastTokenCount}`);

  if (count <= state.lastTokenCount) {
    console.log('[announce] No new tokens');
    // Still update count in case it was behind
    state.lastTokenCount = count;
    saveState(state);
    return;
  }

  // Fetch new tokens
  const startIdx = Math.max(state.lastTokenCount, 0);
  const tokens = await client.readContract({
    address: CONFIG.FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(startIdx), BigInt(count)],
  }) as any[];

  console.log(`[announce] Found ${tokens.length} new tokens since index ${startIdx}`);

  // Filter out already announced tokens
  const unannounced = tokens.filter(
    (t: any) => !state.announcedTokens.includes(t.token.toLowerCase())
  );

  console.log(`[announce] ${unannounced.length} unannounced tokens`);

  let announced = 0;
  for (const token of unannounced) {
    if (announced >= MAX_ANNOUNCES_PER_RUN) {
      console.log(`[announce] Hit max announces per run (${MAX_ANNOUNCES_PER_RUN}), will catch up next run`);
      break;
    }

    // Cooldown: at least 2 min between announces
    const timeSinceLast = Date.now() - state.lastAnnounceTime;
    if (timeSinceLast < 120_000 && state.lastAnnounceTime > 0) {
      console.log(`[announce] Cooldown: ${Math.ceil((120_000 - timeSinceLast) / 1000)}s remaining`);
      break;
    }

    const addr = token.token as string;
    const name = token.name as string;
    const symbol = token.symbol as string;
    const creator = token.creator as string;
    const fdv = formatEther(token.initialFdv as bigint);

    // Try to get image URL
    let imageUrl = '';
    try {
      imageUrl = await client.readContract({
        address: addr as Address,
        abi: ERC20_ABI,
        functionName: 'imageUrl',
      }) as string;
    } catch {}

    const tokenPageUrl = `https://pumpclaw.com/#/token/${addr}`;
    const deployMap = loadDeployMap();
    const requestInfo = deployMap[addr.toLowerCase()];

    const text =
      `🦞 New token on PumpClaw!\n\n` +
      `📛 ${name} ($${symbol})\n` +
      `💰 ${fdv} ETH initial FDV\n` +
      (requestInfo?.username ? `👤 @${requestInfo.username}\n` : `👤 ${creator.slice(0, 6)}...${creator.slice(-4)}\n`) +
      `🔒 LP locked forever on Uniswap V4\n\n` +
      tokenPageUrl;

    // Embeds: prioritize quote cast + image (FC allows 2 embeds max)
    // Token page URL goes in text body instead
    const embeds: Array<{url: string}> = [];
    if (requestInfo?.castHash && requestInfo?.username) {
      embeds.push({ url: `https://farcaster.xyz/${requestInfo.username}/${requestInfo.castHash}` });
    }
    if (imageUrl) {
      embeds.push({ url: imageUrl });
    }
    // If no embeds at all, fall back to token page as embed
    if (embeds.length === 0) {
      embeds.push({ url: tokenPageUrl });
    }

    if (DRY_RUN) {
      console.log(`[announce] 🏜️ DRY RUN — Would post:\n${text}\nEmbeds: ${JSON.stringify(embeds)}`);
    } else {
      try {
        const hash = await postCast(text, embeds);
        console.log(`[announce] ✅ Posted $${symbol}: ${hash}`);
      } catch (err: any) {
        console.error(`[announce] ❌ Failed to post $${symbol}:`, err.message);
        // Don't mark as announced so we retry
        continue;
      }
    }

    state.announcedTokens.push(addr.toLowerCase());
    state.lastAnnounceTime = Date.now();
    announced++;
  }

  state.lastTokenCount = count;
  saveState(state);

  console.log(`[announce] Done. Announced: ${announced}, Total tracked: ${state.announcedTokens.length}`);
}

main().catch((err) => {
  console.error('[announce] Fatal:', err);
  process.exit(1);
});
