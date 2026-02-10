#!/usr/bin/env tsx
/**
 * Mark mention hashes as processed (skip deploy).
 * Used by cron AI when a mention is not a valid deploy request.
 * 
 * Usage: npx tsx src/mark-processed.ts HASH1 HASH2 ...
 */
import { loadState, saveState } from './state.js';

const hashes = process.argv.slice(2);
if (hashes.length === 0) {
  console.log('No hashes to mark');
  process.exit(0);
}

const state = loadState();
for (const h of hashes) {
  if (!state.processedHashes.includes(h)) {
    state.processedHashes.push(h);
  }
}
// Advance timestamp cursor
state.lastProcessedTimestamp = new Date().toISOString();
saveState(state);

console.log(`Marked ${hashes.length} mentions as processed`);
