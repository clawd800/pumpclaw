import { replyCast } from './farcaster.js';
const hash = process.argv[2];
const author = process.argv[3];
const msg = `@${author} Hey! To deploy your token, you need a verified ETH address on your Farcaster profile. Add one at warpcast.com/~/settings and then mention me again! 🦞`;
replyCast(hash, msg).then(h => { console.log('replied:', h); process.exit(0); }).catch(e => { console.error('error:', e.message); process.exit(1); });
