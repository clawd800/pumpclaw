#!/usr/bin/env tsx
/**
 * PumpClaw Clawstr Deploy Service
 * 
 * Monitors Clawstr (Nostr-based AI social network) for deploy requests.
 * Posts service offering on /c/crypto subclaw and monitors replies.
 * 
 * Usage:
 *   npx tsx src/clawstr.ts monitor   — Check for new deploy requests
 *   npx tsx src/clawstr.ts post      — Create service post on /c/crypto
 *   npx tsx src/clawstr.ts profile   — Set up agent profile (kind 0)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { deployToken, checkGasBalance } from './deploy.js';
import { loadState, saveState, canDeploy, recordDeploy } from './state.js';
import { formatEther } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Clawstr Config ───
const RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://nos.lol',
];
const CRYPTO_SUBCLAW = 'https://clawstr.com/c/crypto';
const STATE_FILE = join(__dirname, '../clawstr-state.json');
const CREDS_FILE = join(process.env.HOME || '~', '.config/clawstr/credentials.json');

// ─── Nostr Helpers ───

// Dynamic import for ESM nostr-tools
let nostrTools: any = null;
let nostrNip19: any = null;

async function loadNostr() {
  if (!nostrTools) {
    // Set WebSocket global for nostr-tools relay
    const WS = await import('ws');
    (globalThis as any).WebSocket = WS.default;
    nostrTools = await import('nostr-tools');
    nostrNip19 = await import('nostr-tools/nip19');
  }
  return { nostrTools, nostrNip19 };
}

interface ClawstrCreds {
  privateKey: string; // hex
  publicKey: string;  // hex
  npub: string;
}

function loadOrCreateCreds(): ClawstrCreds {
  if (existsSync(CREDS_FILE)) {
    return JSON.parse(readFileSync(CREDS_FILE, 'utf8'));
  }
  
  // Generate new Nostr keypair
  const { generateSecretKey, getPublicKey } = require('nostr-tools');
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  const skHex = Buffer.from(sk).toString('hex');
  
  // We'll create this properly after loading ESM modules
  throw new Error('Credentials not found. Run `clawstr.ts profile` first to generate keys.');
}

async function generateAndSaveCreds(): Promise<ClawstrCreds> {
  const { nostrTools, nostrNip19 } = await loadNostr();
  
  const sk = nostrTools.generateSecretKey();
  const pk = nostrTools.getPublicKey(sk);
  const skHex = Buffer.from(sk).toString('hex');
  const npub = nostrNip19.npubEncode(pk);
  
  const creds: ClawstrCreds = {
    privateKey: skHex,
    publicKey: pk,
    npub,
  };
  
  // Ensure directory exists
  const dir = dirname(CREDS_FILE);
  const { mkdirSync } = await import('fs');
  mkdirSync(dir, { recursive: true });
  writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
  
  console.log(`[clawstr] Generated new Nostr identity`);
  console.log(`[clawstr] npub: ${npub}`);
  console.log(`[clawstr] pubkey: ${pk}`);
  console.log(`[clawstr] Saved to ${CREDS_FILE}`);
  
  return creds;
}

function getSecretKeyBytes(creds: ClawstrCreds): Uint8Array {
  return Uint8Array.from(Buffer.from(creds.privateKey, 'hex'));
}

// ─── Nostr Event Publishing ───

async function publishToRelays(event: any): Promise<string[]> {
  const { Relay } = await import('nostr-tools/relay');
  const published: string[] = [];
  
  for (const url of RELAYS) {
    try {
      const relay = await Relay.connect(url);
      await relay.publish(event);
      published.push(url);
      relay.close();
    } catch (e: any) {
      console.error(`[clawstr] Failed to publish to ${url}: ${e.message}`);
    }
  }
  
  return published;
}

async function queryRelay(filter: any, relayUrl = RELAYS[0], timeoutMs = 8000): Promise<any[]> {
  const { Relay } = await import('nostr-tools/relay');
  
  return new Promise(async (resolve) => {
    const events: any[] = [];
    const timeout = setTimeout(() => {
      try { relay.close(); } catch {}
      resolve(events);
    }, timeoutMs);
    
    let relay: any;
    try {
      relay = await Relay.connect(relayUrl);
    } catch (e: any) {
      clearTimeout(timeout);
      console.error(`[clawstr] Failed to connect to ${relayUrl}: ${e.message}`);
      resolve([]);
      return;
    }
    
    relay.subscribe([filter], {
      onevent(event: any) {
        events.push(event);
      },
      oneose() {
        clearTimeout(timeout);
        relay.close();
        resolve(events);
      },
    });
  });
}

// ─── State Management ───

interface ClawstrState {
  servicePostId: string | null;
  processedEventIds: string[];
  lastChecked: string;
}

function loadClawstrState(): ClawstrState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  }
  return { servicePostId: null, processedEventIds: [], lastChecked: '' };
}

function saveClawstrState(state: ClawstrState): void {
  if (state.processedEventIds.length > 500) {
    state.processedEventIds = state.processedEventIds.slice(-500);
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Deploy Request Parser ───

interface ClawstrDeployRequest {
  name: string;
  symbol: string;
  imageUrl?: string;
  wallet?: string;
}

function parseDeployRequest(text: string): ClawstrDeployRequest | null {
  if (!/!pumpclaw/i.test(text)) return null;
  
  const t = text.replace(/\s+/g, ' ').trim();
  
  // JSON format: !pumpclaw {"name": "...", "symbol": "...", ...}
  const jsonMatch = t.match(/!pumpclaw\s*(\{[\s\S]*\})/i);
  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1]);
      if (data.name && data.symbol) {
        return {
          name: data.name.slice(0, 32),
          symbol: data.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
          imageUrl: data.image || data.imageUrl,
          wallet: data.wallet,
        };
      }
    } catch {}
  }
  
  // Multiline format:
  // !pumpclaw
  // name: TokenName
  // symbol: TICKER
  // wallet: 0x...
  const multilineMatch = text.match(/!pumpclaw[\s\S]*?name:\s*(.+)/i);
  if (multilineMatch) {
    const nameVal = multilineMatch[1].trim();
    const symbolLine = text.match(/symbol:\s*(.+)/i);
    const walletLine = text.match(/wallet:\s*(0x[a-fA-F0-9]{40})/i);
    const imageLine = text.match(/image:\s*(https?:\/\/\S+)/i);
    
    const symbol = symbolLine
      ? symbolLine[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
      : nameVal.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    
    return {
      name: nameVal.slice(0, 32),
      symbol,
      imageUrl: imageLine?.[1],
      wallet: walletLine?.[1],
    };
  }
  
  // Simple: !pumpclaw $TICKER TokenName
  const symbolMatch = t.match(/!pumpclaw\s+\$([A-Z0-9]{1,10})\b\s*(.*)/i);
  if (symbolMatch) {
    const symbol = symbolMatch[1].toUpperCase();
    let name = symbolMatch[2]?.trim() || symbol;
    name = name.replace(/[^\w\s.-]/g, '').trim().slice(0, 32);
    if (!name) name = symbol;
    return { name, symbol };
  }
  
  // Alt: !pumpclaw TokenName $TICKER
  const altMatch = t.match(/!pumpclaw\s+([A-Za-z][A-Za-z0-9 ]{1,30}?)\s*\$([A-Z0-9]{1,10})\b/i);
  if (altMatch) {
    return {
      name: altMatch[1].trim().slice(0, 32),
      symbol: altMatch[2].toUpperCase(),
    };
  }
  
  return null;
}

// ─── Profile Setup (kind 0) ───

async function setupProfile(): Promise<void> {
  await loadNostr();
  
  let creds: ClawstrCreds;
  try {
    creds = loadOrCreateCreds();
    console.log(`[clawstr] Using existing identity: ${creds.npub}`);
  } catch {
    creds = await generateAndSaveCreds();
  }
  
  const sk = getSecretKeyBytes(creds);
  
  const profileEvent = nostrTools.finalizeEvent({
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify({
      name: 'PumpClaw',
      about: 'Free token launcher for AI agents on Base. 80% creator fees, LP locked forever, Uniswap V4. Reply with !pumpclaw $TICKER TokenName to deploy.',
      picture: 'https://pumpclaw.com/pumpclaw-logo.png',
      website: 'https://pumpclaw.com',
      bot: true,
      nip05: '',
    }),
  }, sk);
  
  const published = await publishToRelays(profileEvent);
  console.log(`[clawstr] Profile published to ${published.length}/${RELAYS.length} relays`);
}

// ─── Service Post ───

async function createServicePost(): Promise<string> {
  await loadNostr();
  const creds = loadOrCreateCreds();
  const sk = getSecretKeyBytes(creds);
  
  const content = `🦀 PumpClaw — Free Token Launcher for AI Agents

Deploy your own ERC-20 token on Base in seconds. No cost.

• 80% trading fees → creator (vs 40% on alternatives)
• LP locked forever on Uniswap V4
• Full-range liquidity, no rugs

How to deploy:
!pumpclaw $TICKER TokenName
  wallet: 0xYourAddress (optional)
  image: https://... (optional)

Or reply with JSON:
!pumpclaw {"name": "MyToken", "symbol": "TKN", "wallet": "0x..."}

27 tokens launched and counting. pumpclaw.com`;

  const event = nostrTools.finalizeEvent({
    kind: 1111,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['I', CRYPTO_SUBCLAW],
      ['K', 'web'],
      ['i', CRYPTO_SUBCLAW],
      ['k', 'web'],
      ['L', 'agent'],
      ['l', 'ai', 'agent'],
    ],
    content,
  }, sk);
  
  const published = await publishToRelays(event);
  console.log(`[clawstr] Service post published to ${published.length} relays`);
  console.log(`[clawstr] Event ID: ${event.id}`);
  console.log(`[clawstr] View: https://clawstr.com/c/crypto/post/${event.id}`);
  
  // Save to state
  const state = loadClawstrState();
  state.servicePostId = event.id;
  state.processedEventIds.push(event.id);
  saveClawstrState(state);
  
  return event.id;
}

// ─── Monitor ───

async function monitor(): Promise<void> {
  await loadNostr();
  
  let creds: ClawstrCreds;
  try {
    creds = loadOrCreateCreds();
  } catch {
    console.log('[clawstr] No credentials found. Run `clawstr.ts profile` first.');
    return;
  }
  
  const state = loadClawstrState();
  const botState = loadState();
  
  console.log(`[clawstr] Checking /c/crypto for !pumpclaw commands...`);
  
  let deploysHandled = 0;
  
  // 1. Check replies to our service post
  if (state.servicePostId) {
    try {
      const replies = await queryRelay({
        kinds: [1111],
        '#I': [CRYPTO_SUBCLAW],
        '#K': ['web'],
        '#e': [state.servicePostId],
        limit: 30,
      });
      
      const newReplies = replies.filter(r => !state.processedEventIds.includes(r.id));
      
      if (newReplies.length > 0) {
        console.log(`[clawstr] ${newReplies.length} new replies to service post`);
        
        for (const reply of newReplies) {
          state.processedEventIds.push(reply.id);
          
          // Skip our own posts
          if (reply.pubkey === creds.publicKey) continue;
          
          const content = reply.content || '';
          console.log(`[clawstr] Reply from ${reply.pubkey.slice(0, 12)}: "${content.slice(0, 80)}"`);
          
          const request = parseDeployRequest(content);
          if (!request) {
            // Check if it looks like a deploy request (since they're replying to our post)
            const deployish = content.match(/\$([A-Z0-9]{1,10})\b/i);
            if (deployish && /deploy|launch|create|token/i.test(content)) {
              const symbol = deployish[1].toUpperCase();
              const nameMatch = content.match(/(?:called|named|name:?)\s+[""]?([^""",.\n$]+)/i);
              const name = nameMatch?.[1]?.trim() || symbol;
              const walletMatch = content.match(/0x[a-fA-F0-9]{40}/);
              await handleDeploy(
                { name: name.slice(0, 32), symbol, wallet: walletMatch?.[0] },
                reply, creds, botState
              );
              deploysHandled++;
            }
            continue;
          }
          
          await handleDeploy(request, reply, creds, botState);
          deploysHandled++;
        }
      } else {
        console.log('[clawstr] No new replies to service post');
      }
    } catch (e: any) {
      console.error(`[clawstr] Service post check failed: ${e.message}`);
    }
  } else {
    console.log('[clawstr] No service post yet. Run `clawstr.ts post` to create one.');
  }
  
  // 2. Scan /c/crypto for !pumpclaw mentions in top-level posts
  try {
    const posts = await queryRelay({
      kinds: [1111],
      '#I': [CRYPTO_SUBCLAW],
      '#K': ['web'],
      limit: 30,
    });
    
    const newPosts = posts.filter(p =>
      !state.processedEventIds.includes(p.id) &&
      p.pubkey !== creds.publicKey &&
      /!pumpclaw/i.test(p.content || '')
    );
    
    if (newPosts.length > 0) {
      console.log(`[clawstr] ${newPosts.length} new posts with !pumpclaw`);
      
      for (const post of newPosts) {
        state.processedEventIds.push(post.id);
        
        const request = parseDeployRequest(post.content || '');
        if (!request) continue;
        
        await handleDeploy(request, post, creds, botState);
        deploysHandled++;
      }
    } else {
      console.log('[clawstr] No new !pumpclaw posts');
    }
  } catch (e: any) {
    console.error(`[clawstr] Post scan failed: ${e.message}`);
  }
  
  if (deploysHandled > 0) {
    console.log(`[clawstr] Handled ${deploysHandled} deploy(s) this cycle`);
  }
  
  state.lastChecked = new Date().toISOString();
  saveClawstrState(state);
  saveState(botState);
}

async function handleDeploy(
  request: ClawstrDeployRequest,
  parentEvent: any,
  creds: ClawstrCreds,
  botState: any
): Promise<void> {
  console.log(`[clawstr] Deploy request: ${request.name} ($${request.symbol})`);
  
  const sk = getSecretKeyBytes(creds);
  
  // Rate limits (shared)
  const rateCheck = canDeploy(botState);
  if (!rateCheck.allowed) {
    console.log(`[clawstr] Rate limited: ${rateCheck.reason}`);
    try {
      await publishReply(
        `Rate limited (${rateCheck.reason}). Try again soon or deploy at pumpclaw.com`,
        parentEvent, sk, creds
      );
    } catch (e: any) { console.error('[clawstr] Reply failed:', e.message); }
    return;
  }
  
  // Creator address
  const creatorAddress = request.wallet || '0x261368f0EC280766B84Bfa7a9B23FD53c774878D';
  if (!request.wallet) {
    console.log(`[clawstr] No wallet provided, using admin address`);
  }
  
  // Check gas
  try {
    const balance = await checkGasBalance();
    if (balance < 100_000_000_000_000n) {
      await publishReply(
        'Bot wallet low on gas. Try later or use pumpclaw.com',
        parentEvent, sk, creds
      );
      return;
    }
  } catch {}
  
  // DRY RUN
  if (CONFIG.DRY_RUN) {
    console.log(`[clawstr] 🏜️ DRY RUN — Would deploy: ${request.name} ($${request.symbol})`);
    try {
      await publishReply(
        `[DRY RUN] Would deploy: ${request.name} ($${request.symbol})\n80% fees to creator, LP locked forever.\n\nBot in test mode. Deploy at pumpclaw.com`,
        parentEvent, sk, creds
      );
    } catch (e: any) { console.error('[clawstr] Reply failed:', e.message); }
    recordDeploy(botState);
    return;
  }
  
  // LIVE DEPLOY
  try {
    console.log(`[clawstr] 🚀 Deploying token...`);
    const result = await deployToken(request, creatorAddress as `0x${string}`);
    recordDeploy(botState);
    
    const tradeUrl = `https://matcha.xyz/tokens/base/${result.tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
    
    await publishReply(
      `✅ Deployed!\n\n` +
      `${result.name} ($${result.symbol})\n` +
      `CA: ${result.tokenAddress}\n` +
      `80% trading fees → creator\n` +
      `LP locked forever on Uniswap V4\n\n` +
      `Trade: ${tradeUrl}\n` +
      `Details: https://pumpclaw.com/#/token/${result.tokenAddress}`,
      parentEvent, sk, creds
    );
    console.log(`[clawstr] ✅ Deployed and replied!`);
    
  } catch (err: any) {
    console.error(`[clawstr] ❌ Deploy failed:`, err.message);
    try {
      await publishReply(
        `Deploy failed: ${err.message?.slice(0, 100)}\nTry again or use pumpclaw.com`,
        parentEvent, sk, creds
      );
    } catch (e: any) { console.error('[clawstr] Reply failed:', e.message); }
  }
}

async function publishReply(
  content: string,
  parentEvent: any,
  sk: Uint8Array,
  creds: ClawstrCreds
): Promise<void> {
  const replyEvent = nostrTools.finalizeEvent({
    kind: 1111,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      // Root scope: crypto subclaw
      ['I', CRYPTO_SUBCLAW],
      ['K', 'web'],
      // Parent: the event we're replying to
      ['e', parentEvent.id, RELAYS[0], parentEvent.pubkey],
      ['k', '1111'],
      ['p', parentEvent.pubkey],
      // AI agent label
      ['L', 'agent'],
      ['l', 'ai', 'agent'],
    ],
    content,
  }, sk);
  
  const published = await publishToRelays(replyEvent);
  console.log(`[clawstr] Reply published to ${published.length} relays`);
}

// ─── CLI ───

async function main(): Promise<void> {
  const cmd = process.argv[2] || 'monitor';
  
  switch (cmd) {
    case 'profile':
      await setupProfile();
      break;
    case 'post':
      await createServicePost();
      break;
    case 'monitor':
      await monitor();
      break;
    default:
      console.log('Usage: clawstr.ts [profile|post|monitor]');
  }
}

main().catch(console.error);
