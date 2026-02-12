// Bot state management - track processed mentions and rate limits
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CONFIG } from './config.js';

interface BotState {
  lastProcessedTimestamp: string; // ISO timestamp of last processed mention
  processedHashes: string[];     // Recent hashes to avoid reprocessing
  deploysThisHour: number;
  deploysToday: number;
  hourStart: number;             // epoch ms
  dayStart: number;              // epoch ms
  totalDeploys: number;
  lastBroadcastTime?: number;    // epoch ms — throttle broadcast announcements
}

const DEFAULT_STATE: BotState = {
  lastProcessedTimestamp: new Date().toISOString(),
  processedHashes: [],
  deploysThisHour: 0,
  deploysToday: 0,
  hourStart: Date.now(),
  dayStart: Date.now(),
  totalDeploys: 0,
};

export function loadState(): BotState {
  if (!existsSync(CONFIG.STATE_FILE)) return { ...DEFAULT_STATE };
  try {
    return JSON.parse(readFileSync(CONFIG.STATE_FILE, 'utf8'));
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(state: BotState): void {
  // Keep only last 200 hashes
  state.processedHashes = state.processedHashes.slice(-200);
  writeFileSync(CONFIG.STATE_FILE, JSON.stringify(state, null, 2));
}

export function resetRateLimitsIfNeeded(state: BotState): void {
  const now = Date.now();
  if (now - state.hourStart > 3_600_000) {
    state.deploysThisHour = 0;
    state.hourStart = now;
  }
  if (now - state.dayStart > 86_400_000) {
    state.deploysToday = 0;
    state.dayStart = now;
  }
}

export function canDeploy(state: BotState): { allowed: boolean; reason?: string } {
  resetRateLimitsIfNeeded(state);
  
  if (state.deploysThisHour >= CONFIG.MAX_DEPLOYS_PER_HOUR) {
    return { allowed: false, reason: `Rate limit: ${CONFIG.MAX_DEPLOYS_PER_HOUR}/hour reached` };
  }
  if (state.deploysToday >= CONFIG.MAX_DEPLOYS_PER_DAY) {
    return { allowed: false, reason: `Rate limit: ${CONFIG.MAX_DEPLOYS_PER_DAY}/day reached` };
  }
  return { allowed: true };
}

export function recordDeploy(state: BotState): void {
  state.deploysThisHour++;
  state.deploysToday++;
  state.totalDeploys++;
}

/**
 * Check if a broadcast announcement should be posted.
 * Throttles to max 1 broadcast per hour to avoid flooding the feed.
 * Deploy reply to the requester is always sent — only the public
 * announcement cast is throttled.
 */
const BROADCAST_COOLDOWN_MS = 3_600_000; // 1 hour

export function canBroadcast(state: BotState): boolean {
  if (!state.lastBroadcastTime) return true;
  return Date.now() - state.lastBroadcastTime >= BROADCAST_COOLDOWN_MS;
}

export function recordBroadcast(state: BotState): void {
  state.lastBroadcastTime = Date.now();
}
