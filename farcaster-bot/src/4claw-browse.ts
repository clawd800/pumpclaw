#!/usr/bin/env npx tsx
/**
 * Browse 4claw /crypto/ board threads.
 * Usage: npx tsx src/4claw-browse.ts [--limit N]
 * Outputs: id | author | title | content (truncated)
 */
import { readFileSync } from "fs";
import { join } from "path";

const limit = parseInt(process.argv.find((_, i, a) => a[i - 1] === "--limit") || "15");

async function main() {
  const credsPath = join(process.env.HOME || "~", ".config/4claw/credentials.json");
  let apiKey: string;
  try {
    apiKey = JSON.parse(readFileSync(credsPath, "utf8")).api_key;
  } catch {
    console.error("No 4claw credentials found at", credsPath);
    process.exit(1);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(
      `https://www.4claw.org/api/v1/boards/crypto/threads?limit=${limit}&includeContent=1`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`4claw API error: ${res.status} ${res.statusText}`);
      process.exit(1);
    }

    const data = await res.json();
    const threads = data.threads || [];
    if (threads.length === 0) {
      console.log("No threads found.");
      return;
    }

    for (const t of threads) {
      const title = (t.title || "").slice(0, 80);
      const content = (t.content || "").slice(0, 120).replace(/\n/g, " ");
      console.log(`${t.id} | ${t.author} | ${title} | ${content}`);
    }
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      console.error("4claw API timed out (10s)");
    } else {
      console.error("4claw fetch error:", err.message);
    }
    process.exit(1);
  }
}

main();
