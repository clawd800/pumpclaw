// Parse Farcaster mention text into deploy request
// Supports patterns:
//   @clawd deploy $TOKEN TokenName
//   @clawd launch $SYMBOL "Token Name"  
//   @clawd create MyToken $MTK
//   Hey @clawd can you deploy a token called "Cool Token" with ticker $COOL

export interface DeployRequest {
  name: string;
  symbol: string;
  creatorAddress?: string; // Farcaster user's verified ETH address
  imageUrl?: string;
}

export function parseDeployRequest(text: string): DeployRequest | null {
  // Only parse the FIRST LINE as the deploy command
  // Subsequent lines are metadata/instructions, not token name
  const firstLine = text.split(/\n/)[0];
  // Normalize whitespace within the first line only
  const t = firstLine.replace(/\s+/g, ' ').trim();
  
  // Must mention @clawd and contain a deploy-related keyword
  if (!/@clawd/i.test(t)) return null;
  
  const deployKeywords = /\b(deploy|launch|create|mint|make)\b/i;
  if (!deployKeywords.test(t)) return null;
  
  // Extract $SYMBOL (ticker)
  const symbolMatch = t.match(/\$([A-Z0-9]{1,10})\b/i);
  
  // Extract quoted name
  const quotedMatch = t.match(/[""]([^""]+)[""]/) || t.match(/"([^"]+)"/);
  
  // Extract "called X" or "named X" pattern
  const calledMatch = t.match(/(?:called|named)\s+[""]?([^""",.\n$]+)[""]?/i);
  
  // Try to parse structured format: @clawd deploy $SYMBOL TokenName
  // or: @clawd deploy TokenName $SYMBOL
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
  
  // If we have symbol but no name, try to extract name from context
  if (symbol && !name) {
    // Pattern: deploy TokenName $SYMBOL (words between keyword and $ — preferred)
    const beforeSymbol = t.match(/(?:deploy|launch|create|mint|make)\s+(?:a\s+)?(?:token\s+)?(?:called\s+)?([A-Za-z][A-Za-z0-9 ]{1,30}?)\s*\$/i);
    if (beforeSymbol) {
      name = beforeSymbol[1].trim();
      // Clean up generic words
      name = name.replace(/^(my|a|the)\s+(token\s+)?(name\s+)?/i, '').trim();
      // If stripping generic words leaves nothing meaningful, clear it
      if (!name || name.length < 2 || /^(token|name|it|this)$/i.test(name)) {
        name = null;
      }
    }
    
    // Pattern: deploy $SYMBOL TokenName (words after symbol, same line only)
    if (!name) {
      const afterSymbol = t.match(new RegExp(`\\$${symbol}[\\t ]+([A-Za-z][A-Za-z0-9 ]{1,30})`, 'i'));
      if (afterSymbol) {
        name = afterSymbol[1].trim();
      }
    }
    
    // Fallback: use symbol as name
    if (!name) {
      name = symbol;
    }
  }
  
  // If we have name but no symbol, derive symbol from name
  if (name && !symbol) {
    // Take first letters of each word, or first 5 chars
    const words = name.split(/\s+/);
    if (words.length > 1) {
      symbol = words.map(w => w[0]).join('').toUpperCase().slice(0, 6);
    } else {
      symbol = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    }
  }
  
  // Must have both
  if (!name || !symbol) return null;
  
  // Sanitize
  name = name.replace(/[^\w\s.-]/g, '').trim().slice(0, 32);
  symbol = symbol.replace(/[^A-Z0-9]/g, '').slice(0, 10);
  
  if (!name || !symbol || symbol.length < 1) return null;
  
  return { name, symbol };
}
