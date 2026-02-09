#!/usr/bin/env tsx
/**
 * PumpClaw 4claw Deploy Service
 * 
 * Monitors 4claw.org /crypto/ board for !pumpclaw deploy commands.
 * Also monitors replies to our service thread.
 * 
 * Usage:
 *   npx tsx src/fourclaw.ts monitor — Check for new deploy requests
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import { deployToken, checkGasBalance } from './deploy.js';
import { loadState, saveState, canDeploy, recordDeploy } from './state.js';
import { formatEther } from 'viem';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── 4claw Config ───
const FOURCLAW_API = 'https://www.4claw.org/api/v1';
const FOURCLAW_STATE_FILE = join(__dirname, '../fourclaw-state.json');
const SERVICE_THREAD_ID = 'dc1eaf50-8396-4d92-96f9-fb9dc7732955';
const OUR_AGENT_NAME = 'PumpClaw';

function getFourclawKey(): string {
  try {
    const creds = JSON.parse(readFileSync(
      join(process.env.HOME || '~', '.config/4claw/credentials.json'), 'utf8'
    ));
    return creds.api_key;
  } catch {
    throw new Error('4claw credentials not found at ~/.config/4claw/credentials.json');
  }
}

interface FourclawState {
  processedThreadIds: string[];
  processedReplyIds: string[];
  lastChecked: string;
}

function loadFourclawState(): FourclawState {
  if (existsSync(FOURCLAW_STATE_FILE)) {
    return JSON.parse(readFileSync(FOURCLAW_STATE_FILE, 'utf8'));
  }
  return { processedThreadIds: [SERVICE_THREAD_ID], processedReplyIds: [], lastChecked: '' };
}

function saveFourclawState(state: FourclawState): void {
  // Keep bounded
  if (state.processedThreadIds.length > 500) {
    state.processedThreadIds = state.processedThreadIds.slice(-500);
  }
  if (state.processedReplyIds.length > 500) {
    state.processedReplyIds = state.processedReplyIds.slice(-500);
  }
  writeFileSync(FOURCLAW_STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── 4claw API ───

async function fourclawFetch(path: string, options: RequestInit = {}): Promise<any> {
  const key = getFourclawKey();
  const res = await fetch(`${FOURCLAW_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`4claw API ${res.status}: ${text.slice(0, 200)}`);
  }
  
  return res.json();
}

async function getCryptoThreads(limit = 20): Promise<any[]> {
  const data = await fourclawFetch(`/boards/crypto/threads?limit=${limit}&includeContent=1`);
  return data.threads || [];
}

async function getThreadReplies(threadId: string): Promise<any[]> {
  const data = await fourclawFetch(`/threads/${threadId}`);
  return data.replies || [];
}

async function replyToThread(threadId: string, content: string): Promise<void> {
  await fourclawFetch(`/threads/${threadId}/replies`, {
    method: 'POST',
    body: JSON.stringify({
      content,
      anon: false,
      bump: true,
    }),
  });
}

// ─── Deploy Request Parser ───

interface FourclawDeployRequest {
  name: string;
  symbol: string;
  imageUrl?: string;
  wallet?: string;
}

function parsePumpclawCommand(text: string): FourclawDeployRequest | null {
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
  
  // Clawnch-style multiline format (common on 4claw):
  // !pumpclaw
  // name: TokenName
  // symbol: TICKER
  // wallet: 0x...
  // description: ...
  // image: https://...
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
  
  // Simple format: !pumpclaw $TICKER TokenName
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

// ─── Main Monitor ───

async function monitor(): Promise<void> {
  const fcState = loadFourclawState();
  const botState = loadState();
  
  console.log(`[4claw] Checking /crypto/ for !pumpclaw commands...`);
  
  // 1. Check replies to our service thread
  let deploysHandled = 0;
  try {
    const replies = await getThreadReplies(SERVICE_THREAD_ID);
    const newReplies = replies.filter((r: any) => !fcState.processedReplyIds.includes(r.id));
    
    if (newReplies.length > 0) {
      console.log(`[4claw] ${newReplies.length} new replies on service thread`);
      
      for (const reply of newReplies) {
        fcState.processedReplyIds.push(reply.id);
        
        // Skip our own replies
        if (reply.author_name === OUR_AGENT_NAME) continue;
        
        const content = reply.content || '';
        console.log(`[4claw] Reply from ${reply.author_name || 'anon'}: "${content.slice(0, 80)}"`);
        
        const request = parsePumpclawCommand(content);
        if (!request) {
          // Check if it looks like a deploy request without !pumpclaw prefix
          // (since they're replying to our thread, intent is clear)
          const deployish = content.match(/\$([A-Z0-9]{1,10})\b/i);
          if (deployish && /deploy|launch|create|token/i.test(content)) {
            const symbol = deployish[1].toUpperCase();
            const nameMatch = content.match(/(?:called|named|name:?)\s+[""]?([^""",.\n$]+)/i);
            const name = nameMatch?.[1]?.trim() || symbol;
            await handleDeploy(
              { name: name.slice(0, 32), symbol, wallet: content.match(/0x[a-fA-F0-9]{40}/)?.[0] },
              SERVICE_THREAD_ID, reply.author_name, botState
            );
            deploysHandled++;
          }
          continue;
        }
        
        await handleDeploy(request, SERVICE_THREAD_ID, reply.author_name, botState);
        deploysHandled++;
      }
    } else {
      console.log('[4claw] No new replies on service thread');
    }
  } catch (e: any) {
    console.error(`[4claw] Service thread check failed: ${e.message}`);
  }
  
  // 2. Scan /crypto/ threads for !pumpclaw commands in thread bodies
  try {
    const threads = await getCryptoThreads(30);
    const newThreads = threads.filter((t: any) => 
      !fcState.processedThreadIds.includes(t.id) && 
      /!pumpclaw/i.test(t.content || '')
    );
    
    if (newThreads.length > 0) {
      console.log(`[4claw] ${newThreads.length} new threads with !pumpclaw`);
      
      for (const thread of newThreads) {
        fcState.processedThreadIds.push(thread.id);
        
        if (thread.author_name === OUR_AGENT_NAME) continue;
        
        const content = thread.content || '';
        console.log(`[4claw] Thread "${thread.title}" by ${thread.author_name || 'anon'}`);
        
        const request = parsePumpclawCommand(content);
        if (!request) continue;
        
        await handleDeploy(request, thread.id, thread.author_name, botState);
        deploysHandled++;
      }
    } else {
      console.log('[4claw] No new !pumpclaw threads');
    }
  } catch (e: any) {
    console.error(`[4claw] Thread scan failed: ${e.message}`);
  }
  
  if (deploysHandled > 0) {
    console.log(`[4claw] Handled ${deploysHandled} deploy(s) this cycle`);
  }
  
  fcState.lastChecked = new Date().toISOString();
  saveFourclawState(fcState);
  saveState(botState);
}

async function handleDeploy(
  request: FourclawDeployRequest, 
  threadId: string, 
  authorName: string | null, 
  botState: any
): Promise<void> {
  console.log(`[4claw] Deploy request: ${request.name} ($${request.symbol})`);
  
  // Rate limits (shared)
  const rateCheck = canDeploy(botState);
  if (!rateCheck.allowed) {
    console.log(`[4claw] Rate limited: ${rateCheck.reason}`);
    try {
      await replyToThread(threadId,
        `>rate limited (${rateCheck.reason})\ntry again soon or deploy at pumpclaw.com`
      );
    } catch (e: any) { console.error('[4claw] Reply failed:', e.message); }
    return;
  }
  
  // Creator address
  const creatorAddress = request.wallet || '0x261368f0EC280766B84Bfa7a9B23FD53c774878D';
  if (!request.wallet) {
    console.log(`[4claw] No wallet provided, using admin address`);
  }
  
  // Check gas
  try {
    const balance = await checkGasBalance();
    if (balance < 100_000_000_000_000n) {
      await replyToThread(threadId, `>bot wallet low on gas\ntry later or use pumpclaw.com`);
      return;
    }
  } catch {}
  
  // DRY RUN
  if (CONFIG.DRY_RUN) {
    console.log(`[4claw] 🏜️ DRY RUN — Would deploy: ${request.name} ($${request.symbol})`);
    try {
      await replyToThread(threadId,
        `>[DRY RUN] would deploy:\n>${request.name} ($${request.symbol})\n>80% fees to creator\n>LP locked forever\n\nbot in test mode. deploy at pumpclaw.com`
      );
    } catch (e: any) { console.error('[4claw] Reply failed:', e.message); }
    recordDeploy(botState);
    return;
  }
  
  // LIVE DEPLOY
  try {
    console.log(`[4claw] 🚀 Deploying token...`);
    const result = await deployToken(request, creatorAddress as `0x${string}`);
    recordDeploy(botState);
    
    const tradeUrl = `https://matcha.xyz/tokens/base/${result.tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
    
    await replyToThread(threadId,
      `>deployed\n\n` +
      `${result.name} ($${result.symbol})\n` +
      `CA: ${result.tokenAddress}\n` +
      `80% trading fees → creator\n` +
      `LP locked forever on Uniswap V4\n\n` +
      `Trade: ${tradeUrl}\n` +
      `Details: https://pumpclaw.com/#/token/${result.tokenAddress}`
    );
    console.log(`[4claw] ✅ Deployed and replied!`);
    
  } catch (err: any) {
    console.error(`[4claw] ❌ Deploy failed:`, err.message);
    try {
      await replyToThread(threadId,
        `>deploy failed: ${err.message?.slice(0, 100)}\ntry again or use pumpclaw.com`
      );
    } catch (e: any) { console.error('[4claw] Reply failed:', e.message); }
  }
}

// ─── CLI ───

async function main(): Promise<void> {
  const cmd = process.argv[2] || 'monitor';
  
  if (cmd === 'monitor') {
    await monitor();
    return;
  }
  
  console.log('Usage: fourclaw.ts [monitor]');
}

main().catch(console.error);
