#!/usr/bin/env npx tsx
/**
 * Generate static token pages for social sharing & SEO.
 *
 * Fetches token data from the PumpClaw indexer API (api.pumpclaw.com)
 * instead of making hundreds of on-chain RPC calls.
 *
 * For each token, creates: public/token/{address}/index.html
 * with OG/Twitter/Farcaster meta tags, JSON-LD, and SEO content.
 *
 * Usage: npx tsx scripts/generate-token-pages.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

const API_BASE = "https://api.pumpclaw.com/api/v1";
const SITE_URL = "https://pumpclaw.com";

interface ApiToken {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  imageUrl: string;
  websiteUrl: string;
  totalSupply: string;
  initialFdv: string;
  createdAt: number;
  price: { mcapUsd: number | null };
  volume24h: { volumeUsd: number; txns: number };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.hostname === "imgur.com" && u.pathname.startsWith("/a/")) return false;
    if (u.hostname === "base.app") return false;
    if (u.hostname === "pin.it" || u.hostname.includes("pinterest")) return false;
    if (u.hostname === "ibb.co.com" || u.hostname === "ibb.co") return false;
    if (u.hostname === "i.imgur.com") return true;
    if (u.hostname === "imagedelivery.net") return true;
    if (u.hostname.includes("cloudinary.com")) return true;
    if (u.hostname === "iili.io") return true;
    if (u.hostname === "wrpcd.net") return true;
    if (u.hostname.includes("etsystatic.com")) return true;
    const ext = u.pathname.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) return true;
    if (u.pathname.includes("/image") || u.pathname.includes("/cdn-cgi/imagedelivery")) return true;
    return false;
  } catch {
    return false;
  }
}

function generateTokenPage(token: ApiToken): string {
  const fdvEth = Number(BigInt(token.initialFdv)) / 1e18;
  const shortCreator = `${token.creator.slice(0, 6)}...${token.creator.slice(-4)}`;
  const createdDate = new Date(token.createdAt * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const title = `$${escapeHtml(token.symbol)} (${escapeHtml(token.name)}) - PumpClaw`;
  const description = `$${escapeHtml(token.symbol)} on Base - ${fdvEth} ETH FDV - LP locked forever - 80% creator fees`;
  const canonicalUrl = `${SITE_URL}/token/${token.address}/`;
  const spaUrl = `${SITE_URL}/#/token/${token.address}`;
  const tradeUrl = `https://matcha.xyz/tokens/base/${token.address}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
  const basescanUrl = `https://basescan.org/token/${token.address}`;
  const validTokenImage = isDirectImageUrl(token.imageUrl) ? token.imageUrl : "";
  const ogImage = validTokenImage || `${SITE_URL}/og-image.jpg`;
  const hasCustomImage = !!validTokenImage;

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `$${token.symbol}`,
    description: `${token.name} - ERC-20 token on Base, launched via PumpClaw`,
    url: canonicalUrl,
    image: ogImage,
    brand: { "@type": "Brand", name: "PumpClaw", url: SITE_URL },
    offers: { "@type": "Offer", url: tradeUrl, priceCurrency: "ETH", availability: "https://schema.org/InStock" },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="PumpClaw">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="${hasCustomImage ? "1200" : "512"}">
  <meta property="og:image:height" content="${hasCustomImage ? "630" : "512"}">
  <meta name="twitter:card" content="${hasCustomImage ? "summary_large_image" : "summary"}">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <meta property="fc:frame" content="vNext">
  <meta property="fc:frame:image" content="${escapeHtml(ogImage)}">
  <meta property="fc:frame:image:aspect_ratio" content="${hasCustomImage ? "1.91:1" : "1:1"}">
  <meta property="fc:frame:button:1" content="Trade $${escapeHtml(token.symbol)}">
  <meta property="fc:frame:button:1:action" content="link">
  <meta property="fc:frame:button:1:target" content="${tradeUrl}">
  <meta property="fc:frame:button:2" content="Chart">
  <meta property="fc:frame:button:2:action" content="link">
  <meta property="fc:frame:button:2:target" content="https://www.geckoterminal.com/base/tokens/${token.address}">
  <meta property="fc:frame:button:3" content="PumpClaw">
  <meta property="fc:frame:button:3:action" content="link">
  <meta property="fc:frame:button:3:target" content="${spaUrl}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <script type="application/ld+json">${jsonLd}</script>
  <meta http-equiv="refresh" content="0;url=${spaUrl}">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#000;color:#4ade80;font-family:'JetBrains Mono','Courier New',monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem}
    .card{max-width:480px;width:100%;border:1px solid rgba(34,197,94,.3);padding:2rem;text-align:center}
    .logo{width:96px;height:96px;border-radius:8px;margin:0 auto 1rem;object-fit:cover;border:2px solid rgba(34,197,94,.3)}
    .fallback-logo{width:96px;height:96px;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-size:3rem;border:2px solid rgba(34,197,94,.3);border-radius:8px}
    h1{font-size:1.5rem;color:#86efac;margin-bottom:.25rem}
    .symbol{font-size:1.25rem;color:#4ade80;margin-bottom:1rem}
    .meta{color:#166534;font-size:.8rem;margin-bottom:1.5rem}
    .stats{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;text-align:left}
    .stat-label{color:#166534;font-size:.7rem;text-transform:uppercase}
    .stat-value{color:#86efac;font-size:.9rem;font-weight:600}
    .cta{display:block;padding:.75rem 1.5rem;background:rgba(34,197,94,.15);border:2px solid rgba(34,197,94,.4);color:#4ade80;text-decoration:none;font-weight:700;font-size:1rem;margin-bottom:.75rem}
    .cta:hover{background:rgba(34,197,94,.25)}
    .links{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:1rem}
    .links a{color:#166534;text-decoration:none;font-size:.8rem}
    .links a:hover{color:#4ade80}
    .footer{margin-top:2rem;color:#14532d;font-size:.7rem}
    .footer a{color:#166534;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    ${token.imageUrl ? `<img class="logo" src="${escapeHtml(token.imageUrl)}" alt="${escapeHtml(token.symbol)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ""}
    <div class="fallback-logo" ${token.imageUrl ? 'style="display:none"' : ""}>🦞</div>
    <h1>${escapeHtml(token.name)}</h1>
    <div class="symbol">$${escapeHtml(token.symbol)}</div>
    <div class="meta">Launched ${createdDate} by ${shortCreator}</div>
    <div class="stats">
      <div><div class="stat-label">FDV</div><div class="stat-value">${fdvEth} ETH</div></div>
      <div><div class="stat-label">LP</div><div class="stat-value">Locked</div></div>
      <div><div class="stat-label">Creator Fee</div><div class="stat-value">80%</div></div>
      <div><div class="stat-label">Chain</div><div class="stat-value">Base</div></div>
    </div>
    <a class="cta" href="${tradeUrl}">Trade $${escapeHtml(token.symbol)}</a>
    <a class="cta" href="${spaUrl}" style="background:rgba(147,51,234,.15);border-color:rgba(147,51,234,.4);color:#c084fc">View Full Details</a>
    <div class="links">
      <a href="${basescanUrl}">BaseScan</a>
      <a href="https://dexscreener.com/base/${token.address}">DexScreener</a>
      <a href="https://www.geckoterminal.com/base/tokens/${token.address}">GeckoTerminal</a>
    </div>
  </div>
  <div class="footer">
    <p><a href="${SITE_URL}">PumpClaw</a> - Free token launcher for AI agents on Base</p>
    <p>80% creator fees - LP locked forever - Uniswap V4</p>
  </div>
</body>
</html>`;
}

async function main() {
  console.log("Generating static token pages from API...\n");

  const res = await fetch(`${API_BASE}/tokens?sort=newest&limit=200`);
  if (!res.ok) {
    console.error(`API error: ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  const tokens: ApiToken[] = data.tokens;
  console.log(`Fetched ${tokens.length} tokens from API`);

  const publicDir = resolve(dirname(new URL(import.meta.url).pathname), "../public");
  let generated = 0;

  for (const token of tokens) {
    const html = generateTokenPage(token);
    const outDir = resolve(publicDir, `token/${token.address}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "index.html"), html);
    generated++;
  }

  // Generate sitemap
  const sitemapEntries = tokens.map(
    (t) => `  <url><loc>${SITE_URL}/token/${t.address}/</loc><changefreq>daily</changefreq></url>`
  );
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/compare.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
${sitemapEntries.join("\n")}
</urlset>`;

  writeFileSync(resolve(publicDir, "sitemap.xml"), sitemap);
  console.log(`\nGenerated ${generated} token pages + sitemap (${generated + 2} URLs)`);
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
