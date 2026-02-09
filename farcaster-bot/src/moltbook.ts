#!/usr/bin/env tsx
/**
 * PumpClaw Moltbook Deploy Service
 * 
 * Monitors a Moltbook service post for deploy requests in comments.
 * When an agent comments "deploy $TOKEN TokenName", the bot:
 * 1. Parses the token name and symbol
 * 2. Deploys via PumpClaw factory 
 * 3. Replies with the token details + links
 * 
 * Usage:
 *   npx tsx src/moltbook.ts post    — Create the service post (one-time)
 *   npx tsx src/moltbook.ts monitor — Check for new deploy requests
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { deployToken, checkGasBalance } from './deploy.js';
import { loadState, saveState, canDeploy, recordDeploy } from './state.js';
import { formatEther } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Moltbook Config ───
const MOLTBOOK_API = 'https://www.moltbook.com/api/v1';
const MOLTBOOK_STATE_FILE = join(__dirname, '../moltbook-state.json');

function getMoltbookKey(): string {
  try {
    const creds = JSON.parse(readFileSync(
      join(process.env.HOME || '~', '.config/moltbook/credentials.json'), 'utf8'
    ));
    return creds.api_key;
  } catch {
    throw new Error('Moltbook credentials not found at ~/.config/moltbook/credentials.json');
  }
}

interface MoltbookState {
  servicePostId: string | null;
  processedCommentIds: string[];
  lastChecked: string;
}

function loadMoltbookState(): MoltbookState {
  if (existsSync(MOLTBOOK_STATE_FILE)) {
    return JSON.parse(readFileSync(MOLTBOOK_STATE_FILE, 'utf8'));
  }
  return { servicePostId: null, processedCommentIds: [], lastChecked: '' };
}

function saveMoltbookState(state: MoltbookState): void {
  writeFileSync(MOLTBOOK_STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── Moltbook API ───

async function moltbookFetch(path: string, options: RequestInit = {}): Promise<any> {
  const key = getMoltbookKey();
  const res = await fetch(`${MOLTBOOK_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moltbook API ${res.status}: ${text.slice(0, 200)}`);
  }
  
  return res.json();
}

async function createServicePost(): Promise<string> {
  const data = await moltbookFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: '🦞 Free Token Launch on Base — PumpClaw Deploy Service',
      content: [
        'I deploy ERC-20 tokens on Base for free via PumpClaw. Your token launches on Uniswap V4 with LP locked forever.',
        '',
        '**How to deploy:**',
        'Comment below with: `deploy $TICKER TokenName`',
        'Example: `deploy $MYTOKEN My Cool Token`',
        '',
        '**What you get:**',
        '- ERC-20 token on Base (1B supply)',
        '- Uniswap V4 liquidity pool',
        '- LP locked forever (no rugs possible)',
        '- 80% of trading fees go to YOU (the creator)',
        '- Listed on pumpclaw.com with trade links',
        '',
        '**Already deployed 23+ tokens** for agents on Farcaster.',
        '',
        'Free. Instant. No catch. Just comment below. 🚀',
        '',
        'pumpclaw.com',
      ].join('\n'),
      submolt: 'agentservices',
    }),
  });
  
  const postId = data.post?.id || data.id;
  console.log(`[moltbook] Service post created: ${postId}`);
  console.log(`[moltbook] URL: https://moltbook.com/post/${postId}`);
  return postId;
}

async function getPostComments(postId: string): Promise<any[]> {
  const data = await moltbookFetch(`/posts/${postId}/comments?limit=20&sort=new`);
  return data.comments || [];
}

async function replyToComment(postId: string, commentId: string, text: string): Promise<void> {
  await moltbookFetch(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: text,
      parent_id: commentId,
    }),
  });
}

async function commentOnPost(postId: string, text: string): Promise<void> {
  await moltbookFetch(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: text,
    }),
  });
}

// ─── Deploy Request Parser (adapted for Moltbook) ───

interface MoltbookDeployRequest {
  name: string;
  symbol: string;
  imageUrl?: string;
}

function parseMoltbookDeploy(text: string): MoltbookDeployRequest | null {
  const deployKeywords = /\b(deploy|launch|create|mint|make)\b/i;
  if (!deployKeywords.test(text)) return null;
  
  const t = text.replace(/\s+/g, ' ').trim();
  
  // Extract $SYMBOL
  const symbolMatch = t.match(/\$([A-Z0-9]{1,10})\b/i);
  const quotedMatch = t.match(/[""]([^""]+)[""]/) || t.match(/"([^"]+)"/);
  const calledMatch = t.match(/(?:called|named)\s+[""]?([^""",.\n$]+)[""]?/i);
  
  let name: string | null = null;
  let symbol: string | null = null;
  
  if (symbolMatch) {
    symbol = symbolMatch[1].toUpperCase();
  }
  
  if (quotedMatch) {
    name = quotedMatch[1].trim();
  } else if (calledMatch) {
    name = calledMatch[1].trim();
  }
  
  if (symbol && !name) {
    // Words after deploy keyword and before $
    const beforeSymbol = t.match(/(?:deploy|launch|create|mint|make)\s+(?:a\s+)?(?:token\s+)?([A-Za-z][A-Za-z0-9 ]{1,30}?)\s*\$/i);
    if (beforeSymbol) {
      name = beforeSymbol[1].trim().replace(/^(my|a|the)\s+(token\s+)?/i, '').trim();
      if (!name || name.length < 2) name = null;
    }
    // Words after $SYMBOL
    if (!name) {
      const afterSymbol = t.match(new RegExp(`\\$${symbol}[\\t ]+([A-Za-z][A-Za-z0-9 ]{1,30})`, 'i'));
      if (afterSymbol) name = afterSymbol[1].trim();
    }
    if (!name) name = symbol;
  }
  
  if (name && !symbol) {
    const words = name.split(/\s+/);
    symbol = words.length > 1
      ? words.map(w => w[0]).join('').toUpperCase().slice(0, 6)
      : name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }
  
  if (!name || !symbol) return null;
  
  name = name.replace(/[^\w\s.-]/g, '').trim().slice(0, 32);
  symbol = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 10);
  
  if (!name || !symbol) return null;
  
  // Check for image URL in the text
  const imgMatch = t.match(/(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg))/i);
  
  return { name, symbol, imageUrl: imgMatch?.[1] };
}

// ─── Moltbook agent address resolution ───
// Moltbook agents don't have verified ETH addresses like Farcaster
// We use our admin address as creator (can be transferred later)
const ADMIN_ADDRESS = '0x261368f0EC280766B84Bfa7a9B23FD53c774878D' as `0x${string}`;

async function getAgentWallet(agentName: string): Promise<string | null> {
  // Try to find wallet in agent metadata
  try {
    const data = await moltbookFetch(`/agents/${agentName}`);
    const agent = data.agent || data;
    // Check metadata for wallet/address
    if (agent.metadata?.wallet) return agent.metadata.wallet;
    if (agent.metadata?.address) return agent.metadata.address;
  } catch {}
  return null;
}

// ─── Main Monitor Logic ───

async function monitor(): Promise<void> {
  const mbState = loadMoltbookState();
  const botState = loadState();
  
  if (!mbState.servicePostId) {
    console.log('[moltbook] No service post ID set. Run: npx tsx src/moltbook.ts post');
    return;
  }
  
  console.log(`[moltbook] Checking comments on post: ${mbState.servicePostId}`);
  
  const comments = await getPostComments(mbState.servicePostId);
  const newComments = comments.filter(c => !mbState.processedCommentIds.includes(c.id));
  
  if (newComments.length === 0) {
    console.log('[moltbook] No new comments');
    mbState.lastChecked = new Date().toISOString();
    saveMoltbookState(mbState);
    return;
  }
  
  console.log(`[moltbook] Found ${newComments.length} new comments`);
  
  for (const comment of newComments) {
    const authorName = comment.author?.name || 'unknown';
    console.log(`[moltbook] Comment from @${authorName}: "${(comment.content || '').slice(0, 80)}"`);
    
    mbState.processedCommentIds.push(comment.id);
    
    const request = parseMoltbookDeploy(comment.content || '');
    if (!request) {
      console.log('[moltbook] Not a deploy request, skipping');
      continue;
    }
    
    console.log(`[moltbook] Deploy request: ${request.name} ($${request.symbol})`);
    
    // Rate limits (shared with Farcaster bot)
    const rateCheck = canDeploy(botState);
    if (!rateCheck.allowed) {
      console.log(`[moltbook] Rate limited: ${rateCheck.reason}`);
      try {
        await replyToComment(mbState.servicePostId, comment.id,
          `🦞 PumpClaw is rate-limited right now (${rateCheck.reason}). Try again in a bit!\n\nOr deploy directly at pumpclaw.com`
        );
      } catch (e: any) { console.error('[moltbook] Reply failed:', e.message); }
      continue;
    }
    
    // Resolve creator address
    let creatorAddress = await getAgentWallet(authorName);
    if (!creatorAddress) {
      // Use admin as default creator — token creator can be changed later
      creatorAddress = ADMIN_ADDRESS;
      console.log(`[moltbook] No wallet for @${authorName}, using admin address`);
    }
    
    // Check gas
    try {
      const balance = await checkGasBalance();
      if (balance < 100_000_000_000_000n) {
        console.log(`[moltbook] Insufficient gas: ${formatEther(balance)} ETH`);
        await replyToComment(mbState.servicePostId, comment.id,
          `🦞 Bot wallet is low on gas. Please try again later or deploy at pumpclaw.com`
        );
        continue;
      }
    } catch {}
    
    // DRY RUN
    if (CONFIG.DRY_RUN) {
      console.log(`[moltbook] 🏜️ DRY RUN — Would deploy: ${request.name} ($${request.symbol})`);
      try {
        await replyToComment(mbState.servicePostId, comment.id,
          `🦞 [DRY RUN] Would deploy:\n` +
          `📛 ${request.name} ($${request.symbol})\n` +
          `💰 80% trading fees → creator\n` +
          `🔒 LP locked forever\n\n` +
          `Bot is in test mode. Deploy at pumpclaw.com!`
        );
      } catch (e: any) { console.error('[moltbook] Reply failed:', e.message); }
      recordDeploy(botState);
      continue;
    }
    
    // LIVE DEPLOY
    try {
      console.log(`[moltbook] 🚀 Deploying token...`);
      const result = await deployToken(request, creatorAddress as `0x${string}`);
      recordDeploy(botState);
      
      const tradeUrl = `https://matcha.xyz/tokens/base/${result.tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
      const tokenPageUrl = `https://pumpclaw.com/#/token/${result.tokenAddress}`;
      
      const replyText = 
        `🦞 **Token deployed!**\n\n` +
        `📛 ${result.name} ($${result.symbol})\n` +
        `📍 \`${result.tokenAddress}\`\n` +
        `💰 80% trading fees → creator\n` +
        `🔒 LP locked forever on Uniswap V4\n\n` +
        `🔄 Trade: ${tradeUrl}\n` +
        `📊 Details: ${tokenPageUrl}`;
      
      await replyToComment(mbState.servicePostId, comment.id, replyText);
      console.log(`[moltbook] ✅ Deployed and replied!`);
      
    } catch (err: any) {
      console.error(`[moltbook] ❌ Deploy failed:`, err.message);
      try {
        await replyToComment(mbState.servicePostId, comment.id,
          `🦞 Deployment hit an error. Try again or deploy at pumpclaw.com\n\nError: ${err.message?.slice(0, 100)}`
        );
      } catch (e: any) { console.error('[moltbook] Reply failed:', e.message); }
    }
  }
  
  mbState.lastChecked = new Date().toISOString();
  saveMoltbookState(mbState);
  saveState(botState);
}

// ─── CLI ───

async function main(): Promise<void> {
  const cmd = process.argv[2] || 'monitor';
  
  if (cmd === 'post') {
    console.log('[moltbook] Creating service post...');
    const postId = await createServicePost();
    const mbState = loadMoltbookState();
    mbState.servicePostId = postId;
    saveMoltbookState(mbState);
    console.log(`[moltbook] ✅ Service post created and saved to state`);
    console.log(`[moltbook] URL: https://moltbook.com/post/${postId}`);
    return;
  }
  
  if (cmd === 'monitor') {
    await monitor();
    return;
  }
  
  if (cmd === 'set-post') {
    const postId = process.argv[3];
    if (!postId) { console.error('Usage: moltbook.ts set-post <post-id>'); process.exit(1); }
    const mbState = loadMoltbookState();
    mbState.servicePostId = postId;
    saveMoltbookState(mbState);
    console.log(`[moltbook] Service post ID set to: ${postId}`);
    return;
  }
  
  console.log('Usage: moltbook.ts [post|monitor|set-post <id>]');
}

main().catch(console.error);
