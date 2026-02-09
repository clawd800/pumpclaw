// PumpClaw Farcaster Deploy Bot Configuration
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  // Neynar API (set via env or .env file)
  NEYNAR_API_KEY: process.env.NEYNAR_API_KEY || (() => {
    try {
      const envPath = join(__dirname, '../../.env');
      const envContent = readFileSync(envPath, 'utf8');
      const match = envContent.match(/NEYNAR_API_KEY=(.+)/);
      return match ? match[1].trim() : '';
    } catch { return ''; }
  })(),
  SIGNER_UUID: process.env.FARCASTER_SIGNER_UUID || (() => {
    try {
      const envPath = join(__dirname, '../../.env');
      const envContent = readFileSync(envPath, 'utf8');
      const match = envContent.match(/FARCASTER_SIGNER_UUID=(.+)/);
      return match ? match[1].trim() : '';
    } catch { return ''; }
  })(),
  BOT_FID: parseInt(process.env.BOT_FID || '2494420'), // @clawd
  
  // PumpClaw contracts (V3 - production)
  FACTORY_ADDRESS: '0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90' as `0x${string}`,
  RPC_URL: 'https://base-rpc.publicnode.com',
  
  // Wallet
  PRIVATE_KEY: (() => {
    let key = process.env.BASE_PRIVATE_KEY || (() => {
      try {
        const envPath = join(__dirname, '../../.env');
        const envContent = readFileSync(envPath, 'utf8');
        const match = envContent.match(/BASE_PRIVATE_KEY=(.+)/);
        return match ? match[1].trim() : '';
      } catch { return ''; }
    })();
    if (key && !key.startsWith('0x')) key = `0x${key}`;
    return key;
  })(),
  
  // Bot behavior
  DRY_RUN: process.env.DRY_RUN === 'true',
  POLL_ONCE: process.env.POLL_ONCE === 'true',
  POLL_INTERVAL_MS: 60_000, // 1 minute
  STATE_FILE: join(__dirname, '../state.json'),
  
  // Limits
  MAX_DEPLOYS_PER_HOUR: 3,
  MAX_DEPLOYS_PER_DAY: 10,
} as const;
