#!/usr/bin/env node
/**
 * PumpClaw API Stats Updater
 * Zero-dependency script — uses native fetch for Base RPC calls.
 * Reads all tokens from the factory contract and generates:
 *   - client-web/public/api/v1/stats.json
 *   - client-web/public/api/v1/tokens.json
 *
 * Usage: node tools/update-api.mjs
 */

const RPC = process.env.BASE_RPC || "https://base-rpc.publicnode.com";
const FACTORY = "0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90";

// ── ABI helpers (minimal selectors) ────────────────────────────
const sel = (sig) => {
  // keccak256 of function signature → first 4 bytes
  // We hardcode the selectors we need to avoid a crypto dependency.
  const map = {
    "getTokenCount()": "0x78a89567",
    "getTokens(uint256,uint256)": "0x494cfc6c",
  };
  return map[sig];
};

// Token-level selectors (called on each token address)
const TOKEN_IMAGE_SEL = "0xaba83150"; // imageUrl()
const TOKEN_WEBSITE_SEL = "0xabb5ca09"; // websiteUrl()

// ── RPC helpers ────────────────────────────────────────────────
let rpcId = 1;
async function rpcCall(to, data) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: rpcId++,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC error: ${JSON.stringify(json.error)}`);
  return json.result;
}

// ── ABI decode helpers ─────────────────────────────────────────
function decodeUint(hex) {
  return BigInt("0x" + hex.replace(/^0x/, ""));
}

function pad32(n) {
  return BigInt(n).toString(16).padStart(64, "0");
}

function decodeString(data, offsetWords) {
  // ABI-encoded dynamic string: offset → length → bytes
  const raw = data.replace(/^0x/, "");
  const strOffset = Number(decodeUint(raw.slice(offsetWords * 64, offsetWords * 64 + 64))) * 2;
  const strLen = Number(decodeUint(raw.slice(strOffset, strOffset + 64)));
  const strHex = raw.slice(strOffset + 64, strOffset + 64 + strLen * 2);
  return Buffer.from(strHex, "hex").toString("utf8");
}

function decodeTokenTuple(raw, tupleStart) {
  // tuple: token(address), creator(address), positionId, totalSupply, initialFdv, createdAt, name(dynamic), symbol(dynamic)
  const s = tupleStart; // character offset into raw hex (no 0x)

  const token = "0x" + raw.slice(s + 24, s + 64);
  const creator = "0x" + raw.slice(s + 64 + 24, s + 128);
  const positionId = decodeUint(raw.slice(s + 128, s + 192));
  const totalSupply = decodeUint(raw.slice(s + 192, s + 256));
  const initialFdv = decodeUint(raw.slice(s + 256, s + 320));
  const createdAt = Number(decodeUint(raw.slice(s + 320, s + 384)));

  // name & symbol are dynamic — relative offsets from tuple start
  const nameOffset = Number(decodeUint(raw.slice(s + 384, s + 448))) * 2;
  const symbolOffset = Number(decodeUint(raw.slice(s + 448, s + 512))) * 2;

  const nameLen = Number(decodeUint(raw.slice(s + nameOffset, s + nameOffset + 64)));
  const nameHex = raw.slice(s + nameOffset + 64, s + nameOffset + 64 + nameLen * 2);
  const name = Buffer.from(nameHex, "hex").toString("utf8");

  const symbolLen = Number(decodeUint(raw.slice(s + symbolOffset, s + symbolOffset + 64)));
  const symbolHex = raw.slice(s + symbolOffset + 64, s + symbolOffset + 64 + symbolLen * 2);
  const symbol = Buffer.from(symbolHex, "hex").toString("utf8");

  return { token, creator, positionId, totalSupply, initialFdv, createdAt, name, symbol };
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Querying PumpClaw factory...");

  // 1. Get token count
  const countHex = await rpcCall(FACTORY, sel("getTokenCount()"));
  const count = Number(decodeUint(countHex));
  console.log(`   Total tokens: ${count}`);

  if (count === 0) {
    console.log("   No tokens found, skipping update.");
    return;
  }

  // 2. Get all tokens via getTokens(0, count)
  const data = sel("getTokens(uint256,uint256)") + pad32(0) + pad32(count);
  const tokensRaw = await rpcCall(FACTORY, data);
  const raw = tokensRaw.replace(/^0x/, "");

  // Decode: first 32 bytes = offset to array, next 32 = array length, then tuples
  const arrayOffset = Number(decodeUint(raw.slice(0, 64))) * 2;
  const arrayLen = Number(decodeUint(raw.slice(arrayOffset, arrayOffset + 64)));

  // Each tuple element has an offset pointer
  const tokens = [];
  for (let i = 0; i < arrayLen; i++) {
    const ptrStart = arrayOffset + 64 + i * 64;
    const tupleOffset = Number(decodeUint(raw.slice(ptrStart, ptrStart + 64))) * 2;
    const tupleAbsolute = arrayOffset + 64 + tupleOffset;
    try {
      const t = decodeTokenTuple(raw, tupleAbsolute);
      tokens.push(t);
    } catch (e) {
      console.error(`   ⚠️  Failed to decode token ${i}: ${e.message}`);
    }
  }

  console.log(`   Decoded ${tokens.length} tokens`);

  // 3. Fetch imageUrl and websiteUrl for each token (batch-friendly)
  const enriched = [];
  for (const t of tokens) {
    let imageUrl = "";
    let websiteUrl = "";
    try {
      const imgRaw = await rpcCall(t.token, TOKEN_IMAGE_SEL);
      imageUrl = decodeString(imgRaw, 0);
    } catch {}
    try {
      const webRaw = await rpcCall(t.token, TOKEN_WEBSITE_SEL);
      websiteUrl = decodeString(webRaw, 0);
    } catch {}

    const fdvEth = Number(t.initialFdv) / 1e18;
    const supplyFormatted = (Number(t.totalSupply) / 1e18).toString();

    enriched.push({
      address: t.token,
      name: t.name,
      symbol: t.symbol,
      imageUrl,
      websiteUrl,
      totalSupply: supplyFormatted,
      initialFdv: fdvEth.toString(),
      initialFdvEth: fdvEth,
      creator: t.creator,
      createdAt: new Date(t.createdAt * 1000).toISOString(),
      createdAtUnix: t.createdAt,
      links: {
        pumpclaw: `https://pumpclaw.com/#/token/${t.token}`,
        trade: `https://matcha.xyz/tokens/base/${t.token}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,
        basescan: `https://basescan.org/token/${t.token}`,
        geckoTerminal: `https://www.geckoterminal.com/base/tokens/${t.token}`,
        dexScreener: `https://dexscreener.com/base/${t.token}`,
      },
    });
  }

  // 4. Compute stats
  const uniqueCreators = new Set(enriched.map((t) => t.creator.toLowerCase())).size;
  const latest = enriched[enriched.length - 1];

  const stats = {
    totalTokens: enriched.length,
    uniqueCreators,
    latestToken: latest?.symbol || "",
    chain: "Base (8453)",
    dex: "Uniswap V4",
    factory: FACTORY,
    feeSplit: { creator: "80%", protocol: "20%" },
    lpStatus: "locked_forever",
    launchCost: "free",
    generatedAt: new Date().toISOString(),
    endpoints: {
      tokens: "https://pumpclaw.com/api/v1/tokens.json",
      stats: "https://pumpclaw.com/api/v1/stats.json",
    },
    links: {
      website: "https://pumpclaw.com",
      github: "https://github.com/clawd800/pumpclaw",
      npm: "https://www.npmjs.com/package/pumpclaw-cli",
      farcaster: "https://farcaster.xyz/clawd",
    },
  };

  const tokensJson = { tokens: enriched, generatedAt: stats.generatedAt };

  // 5. Write files
  const { mkdirSync, writeFileSync } = await import("fs");
  const { join } = await import("path");

  const apiDir = join(import.meta.dirname, "..", "client-web", "public", "api", "v1");
  mkdirSync(apiDir, { recursive: true });

  writeFileSync(join(apiDir, "stats.json"), JSON.stringify(stats, null, 2) + "\n");
  writeFileSync(join(apiDir, "tokens.json"), JSON.stringify(tokensJson, null, 2) + "\n");

  console.log(`\n✅ API updated: ${enriched.length} tokens, ${uniqueCreators} creators`);
  console.log(`   → client-web/public/api/v1/stats.json`);
  console.log(`   → client-web/public/api/v1/tokens.json`);
}

main().catch((e) => {
  console.error("❌ Update failed:", e.message);
  process.exit(1);
});
