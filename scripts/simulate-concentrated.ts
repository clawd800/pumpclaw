/**
 * Concentrated Liquidity Simulation
 * Single-sided token deposit, no ETH required from creator
 */

const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens

// In concentrated liquidity (Uniswap V3/V4):
// At price P within range [Pa, Pb]:
//   token0_amount = L * (1/sqrt(P) - 1/sqrt(Pb))
//   token1_amount = L * (sqrt(P) - sqrt(Pa))
// 
// At P = Pa (lower bound): hold 100% token0
// At P = Pb (upper bound): hold 100% token1

function simulateConcentratedBuy(
  fdvEth: number,
  priceRangeMultiplier: number, // e.g., 10x means range goes up to 10x FDV price
  buyEthAmounts: number[]
) {
  // Price per token at FDV
  const priceLower = fdvEth / TOTAL_SUPPLY; // ETH per token
  const priceUpper = priceLower * priceRangeMultiplier;
  
  const sqrtPa = Math.sqrt(priceLower);
  const sqrtPb = Math.sqrt(priceUpper);
  
  // Calculate liquidity L from token amount at lower bound
  // At P = Pa: token1_amount = L * (sqrt(Pa) - sqrt(Pa)) = 0 (if token is token1)
  // At P = Pa: token0_amount = L * (1/sqrt(Pa) - 1/sqrt(Pb))
  // So: L = token0_amount / (1/sqrt(Pa) - 1/sqrt(Pb))
  
  // For simplicity, let's assume Token is token0 (Token < WETH by address)
  // Then at lower bound, we deposit all tokens
  const L = TOTAL_SUPPLY / (1/sqrtPa - 1/sqrtPb);
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FDV: ${fdvEth} ETH | Range: ${priceRangeMultiplier}x`);
  console.log(`Price range: ${priceLower.toExponential(4)} - ${priceUpper.toExponential(4)} ETH/token`);
  console.log(`Liquidity L: ${L.toExponential(4)}`);
  console.log(`${'='.repeat(70)}`);
  
  let currentPrice = priceLower;
  let sqrtP = sqrtPa;
  
  console.log('\nBuy Simulations:');
  console.log('-'.repeat(70));
  console.log('ETH In    | Tokens Out    | % Supply  | New Price        | Price Δ');
  console.log('-'.repeat(70));
  
  for (const ethIn of buyEthAmounts) {
    // In concentrated liquidity, buying tokens with ETH:
    // ΔY (ETH in) = L * (sqrt(P_new) - sqrt(P_old))
    // So: sqrt(P_new) = sqrt(P_old) + ΔY/L
    
    const deltaSqrtP = ethIn / L;
    const newSqrtP = sqrtP + deltaSqrtP;
    
    if (newSqrtP > sqrtPb) {
      console.log(`${ethIn.toString().padEnd(9)} | OUT OF RANGE - price exceeds upper bound`);
      continue;
    }
    
    const newPrice = newSqrtP * newSqrtP;
    
    // Tokens out = L * (1/sqrt(P_old) - 1/sqrt(P_new))
    const tokensOut = L * (1/sqrtP - 1/newSqrtP);
    const tokensPct = (tokensOut / TOTAL_SUPPLY) * 100;
    const priceChange = ((newPrice - currentPrice) / currentPrice) * 100;
    
    console.log(
      `${ethIn.toString().padEnd(9)} | ` +
      `${formatNum(tokensOut).padEnd(13)} | ` +
      `${tokensPct.toFixed(4).padEnd(9)}% | ` +
      `${newPrice.toExponential(4).padEnd(16)} | ` +
      `+${priceChange.toFixed(2)}%`
    );
    
    // Update for next iteration (cumulative)
    sqrtP = newSqrtP;
    currentPrice = newPrice;
  }
  
  // Show remaining tokens in pool
  const remainingTokens = L * (1/sqrtP - 1/sqrtPb);
  console.log('-'.repeat(70));
  console.log(`Remaining in pool: ${formatNum(remainingTokens)} tokens (${(remainingTokens/TOTAL_SUPPLY*100).toFixed(2)}%)`);
}

function formatNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  CONCENTRATED LIQUIDITY - NO ETH DEPOSIT REQUIRED                    ║');
console.log('║  All 1B tokens deposited, released as buyers push price up           ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

// Simulate with 20 ETH FDV, 10x price range (can go up to 200 ETH mcap)
simulateConcentratedBuy(20, 10, [0.001, 0.01, 0.1, 1, 5, 10]);

// Simulate with 20 ETH FDV, 100x price range
simulateConcentratedBuy(20, 100, [0.001, 0.01, 0.1, 1, 5, 10]);

console.log('\n' + '='.repeat(70));
console.log('KEY BENEFITS:');
console.log('='.repeat(70));
console.log('✅ Creator deposits ZERO ETH');
console.log('✅ All 1B tokens go into pool');
console.log('✅ Price starts at FDV level');
console.log('✅ Tokens released progressively as price rises');
console.log('✅ Price range defines max mcap (e.g., 10x FDV)');
console.log('');
console.log('TRADEOFF:');
console.log('⚠️  When price hits upper bound, pool is exhausted (all tokens sold)');
console.log('⚠️  Need to choose sensible price range multiplier');
