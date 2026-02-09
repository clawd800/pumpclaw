#!/usr/bin/env npx tsx
/**
 * Generate static token pages for social sharing & SEO.
 *
 * For each token on PumpClaw, creates:
 *   public/token/{address}/index.html
 *
 * Each page has:
 *   - Unique OG/Twitter meta tags (name, symbol, image, creator)
 *   - Rich social card preview when shared on Twitter/Farcaster/Discord
 *   - Auto-redirect to the SPA for interactive features
 *   - SEO-indexable content (token name, links, details)
 *   - JSON-LD structured data
 *
 * Usage: npx tsx scripts/generate-token-pages.ts
 */

import { createPublicClient, http, formatEther, type Address } from "viem";
import { base } from "viem/chains";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";

const FACTORY = "0xe5bCa0eDe9208f7Ee7FCAFa0415Ca3DC03e16a90" as const;
const POOL_MANAGER = "0x498581fF718922c3f8e6A244956aF099B2652b2b" as const;
const SITE_URL = "https://pumpclaw.com";

const FACTORY_ABI = [
  {
    type: "function",
    name: "getTokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTokens",
    inputs: [
      { name: "startIndex", type: "uint256" },
      { name: "endIndex", type: "uint256" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "positionId", type: "uint256" },
          { name: "totalSupply", type: "uint256" },
          { name: "initialFdv", type: "uint256" },
          { name: "createdAt", type: "uint256" },
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
        ],
      },
    ],
    stateMutability: "view",
  },
] as const;

const TOKEN_METADATA_ABI = [
  {
    type: "function",
    name: "imageUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "websiteUrl",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const client = createPublicClient({
  chain: base,
  transport: http("https://base-rpc.publicnode.com"),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateTokenPage(token: {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  websiteUrl: string;
  totalSupply: string;
  initialFdvEth: number;
  creator: string;
  createdAt: string;
  percentPurchased: number;
}): string {
  const title = `$${escapeHtml(token.symbol)} (${escapeHtml(token.name)}) — PumpClaw`;
  const description = `$${escapeHtml(token.symbol)} on Base • ${token.percentPurchased}% purchased • ${token.initialFdvEth} ETH FDV • LP locked forever • 80% creator fees`;
  const canonicalUrl = `${SITE_URL}/token/${token.address}/`;
  const spaUrl = `${SITE_URL}/#/token/${token.address}`;
  const tradeUrl = `https://matcha.xyz/tokens/base/${token.address}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
  const basescanUrl = `https://basescan.org/token/${token.address}`;
  const ogImage = token.imageUrl || `${SITE_URL}/og-image.jpg`;
  const shortCreator = `${token.creator.slice(0, 6)}...${token.creator.slice(-4)}`;
  const createdDate = new Date(token.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `$${token.symbol}`,
    description: `${token.name} — ERC-20 token on Base, launched via PumpClaw`,
    url: canonicalUrl,
    image: ogImage,
    brand: {
      "@type": "Brand",
      name: "PumpClaw",
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      url: tradeUrl,
      priceCurrency: "ETH",
      availability: "https://schema.org/InStock",
    },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="PumpClaw">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="512">
  <meta property="og:image:height" content="512">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  
  <!-- Farcaster Frame (fc:frame) -->
  <meta property="fc:frame" content="vNext">
  <meta property="fc:frame:image" content="${escapeHtml(ogImage)}">
  <meta property="fc:frame:button:1" content="Trade $${escapeHtml(token.symbol)}">
  <meta property="fc:frame:button:1:action" content="link">
  <meta property="fc:frame:button:1:target" content="${tradeUrl}">
  <meta property="fc:frame:button:2" content="View on PumpClaw">
  <meta property="fc:frame:button:2:action" content="link">
  <meta property="fc:frame:button:2:target" content="${spaUrl}">

  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  
  <!-- JSON-LD -->
  <script type="application/ld+json">${jsonLd}</script>
  
  <!-- Redirect bots see meta, humans get SPA -->
  <meta http-equiv="refresh" content="0;url=${spaUrl}">
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      color: #4ade80;
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      max-width: 480px;
      width: 100%;
      border: 1px solid rgba(34, 197, 94, 0.3);
      padding: 2rem;
      text-align: center;
    }
    .logo {
      width: 96px;
      height: 96px;
      border-radius: 8px;
      margin: 0 auto 1rem;
      object-fit: cover;
      border: 2px solid rgba(34, 197, 94, 0.3);
    }
    .fallback-logo {
      width: 96px;
      height: 96px;
      margin: 0 auto 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      border: 2px solid rgba(34, 197, 94, 0.3);
      border-radius: 8px;
    }
    h1 { font-size: 1.5rem; color: #86efac; margin-bottom: 0.25rem; }
    .symbol { font-size: 1.25rem; color: #4ade80; margin-bottom: 1rem; }
    .meta { color: #166534; font-size: 0.8rem; margin-bottom: 1.5rem; }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .stat-label { color: #166534; font-size: 0.7rem; text-transform: uppercase; }
    .stat-value { color: #86efac; font-size: 0.9rem; font-weight: 600; }
    .progress-bar {
      height: 8px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.2);
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #16a34a, #4ade80);
      transition: width 0.5s;
    }
    .cta {
      display: block;
      padding: 0.75rem 1.5rem;
      background: rgba(34, 197, 94, 0.15);
      border: 2px solid rgba(34, 197, 94, 0.4);
      color: #4ade80;
      text-decoration: none;
      font-weight: 700;
      font-size: 1rem;
      margin-bottom: 0.75rem;
    }
    .cta:hover { background: rgba(34, 197, 94, 0.25); }
    .links {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .links a {
      color: #166534;
      text-decoration: none;
      font-size: 0.8rem;
    }
    .links a:hover { color: #4ade80; }
    .footer {
      margin-top: 2rem;
      color: #14532d;
      font-size: 0.7rem;
    }
    .footer a { color: #166534; text-decoration: none; }
    .redirect-msg { color: #166534; font-size: 0.75rem; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    ${
      token.imageUrl
        ? `<img class="logo" src="${escapeHtml(token.imageUrl)}" alt="${escapeHtml(token.symbol)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ""
    }
    <div class="fallback-logo" ${token.imageUrl ? 'style="display:none"' : ""}>🦞</div>
    
    <h1>${escapeHtml(token.name)}</h1>
    <div class="symbol">$${escapeHtml(token.symbol)}</div>
    <div class="meta">Launched ${createdDate} by ${shortCreator}</div>
    
    <div class="stats">
      <div>
        <div class="stat-label">FDV</div>
        <div class="stat-value">${token.initialFdvEth} ETH</div>
      </div>
      <div>
        <div class="stat-label">Purchased</div>
        <div class="stat-value">${token.percentPurchased}%</div>
      </div>
      <div>
        <div class="stat-label">LP</div>
        <div class="stat-value">🔒 Locked</div>
      </div>
      <div>
        <div class="stat-label">Creator Fee</div>
        <div class="stat-value">80%</div>
      </div>
    </div>
    
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${Math.min(token.percentPurchased, 100)}%"></div>
    </div>
    
    <a class="cta" href="${tradeUrl}">🔄 Trade $${escapeHtml(token.symbol)}</a>
    <a class="cta" href="${spaUrl}" style="background: rgba(147, 51, 234, 0.15); border-color: rgba(147, 51, 234, 0.4); color: #c084fc;">View Full Details →</a>
    
    <div class="links">
      <a href="${basescanUrl}">BaseScan ↗</a>
      <a href="https://dexscreener.com/base/${token.address}">DexScreener ↗</a>
      <a href="https://www.geckoterminal.com/base/tokens/${token.address}">GeckoTerminal ↗</a>
    </div>
  </div>
  
  <div class="footer">
    <p>🦞 <a href="${SITE_URL}">PumpClaw</a> — pump.fun for AI agents</p>
    <p>Free to launch • 80% creator fees • LP locked forever</p>
  </div>
  
  <noscript>
    <p class="redirect-msg">Redirecting to <a href="${spaUrl}">PumpClaw</a>...</p>
  </noscript>
</body>
</html>`;
}

async function main() {
  console.log("🦞 Generating static token pages for social sharing...\n");

  const count = await client.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokenCount",
  });
  console.log(`Total tokens: ${count}`);

  if (count === 0n) {
    console.log("No tokens found.");
    return;
  }

  const tokens = await client.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: "getTokens",
    args: [0n, count],
  });

  // Batch metadata
  const multicallContracts = tokens.flatMap((t) => [
    {
      address: t.token as Address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf" as const,
      args: [POOL_MANAGER as Address],
    },
    {
      address: t.token as Address,
      abi: TOKEN_METADATA_ABI,
      functionName: "imageUrl" as const,
    },
    {
      address: t.token as Address,
      abi: TOKEN_METADATA_ABI,
      functionName: "websiteUrl" as const,
    },
  ]);

  console.log(`Fetching metadata for ${tokens.length} tokens...`);
  const results = await client.multicall({ contracts: multicallContracts });

  const publicDir = resolve(dirname(new URL(import.meta.url).pathname), "../public");
  let generated = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const poolBalance = results[i * 3]?.result as bigint | undefined;
    const imageUrl = (results[i * 3 + 1]?.result as string) || "";
    const websiteUrl = (results[i * 3 + 2]?.result as string) || "";

    const totalSupply = t.totalSupply;
    const purchased = poolBalance !== undefined ? totalSupply - poolBalance : 0n;
    const percentPurchased =
      poolBalance !== undefined
        ? Math.round(Number((purchased * 10000n) / totalSupply)) / 100
        : 0;

    const tokenData = {
      address: t.token,
      name: t.name,
      symbol: t.symbol,
      imageUrl,
      websiteUrl,
      totalSupply: formatEther(t.totalSupply),
      initialFdvEth: Number(formatEther(t.initialFdv)),
      creator: t.creator,
      createdAt: new Date(Number(t.createdAt) * 1000).toISOString(),
      percentPurchased,
    };

    const html = generateTokenPage(tokenData);
    const outDir = resolve(publicDir, `token/${t.token}`);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, "index.html"), html);
    generated++;
    console.log(`  ✅ $${t.symbol} → /token/${t.token}/`);
  }

  // Generate a sitemap for all token pages
  const sitemapEntries = tokens.map(
    (t) => `  <url><loc>${SITE_URL}/token/${t.token}/</loc><changefreq>daily</changefreq></url>`
  );
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>${SITE_URL}/compare.html</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
${sitemapEntries.join("\n")}
</urlset>`;

  writeFileSync(resolve(publicDir, "sitemap.xml"), sitemap);
  console.log(`\n✅ Generated ${generated} token pages`);
  console.log(`✅ Generated sitemap.xml with ${generated + 2} URLs`);
  console.log(`\n🔗 Example: ${SITE_URL}/token/${tokens[0].token}/`);
}

main().catch((e) => {
  console.error("Fatal:", e.message || e);
  process.exit(1);
});
