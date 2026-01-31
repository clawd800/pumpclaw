/**
 * PumpClaw FDV Simulation
 * Simulates token creation and buying scenarios with different FDV settings
 */

const TOTAL_SUPPLY = 1_000_000_000; // 1B tokens

interface SimResult {
  scenario: string;
  fdvEth: number;
  depositEth: number;
  tokenLiquidity: number;
  tokenLiquidityPct: string;
  burnedTokens: number;
  burnedPct: string;
  initialPricePerToken: number;
  buys: BuyResult[];
}

interface BuyResult {
  buyEth: number;
  tokensReceived: number;
  tokensPct: string;
  priceAfter: number;
  priceImpact: string;
  poolEthAfter: number;
  poolTokensAfter: number;
}

function simulate(fdvEth: number, depositEth: number, buyAmounts: number[]): SimResult {
  // Calculate initial token liquidity based on FDV
  // tokenLiquidity = (depositEth / fdvEth) * totalSupply
  const tokenLiquidity = (depositEth / fdvEth) * TOTAL_SUPPLY;
  const burnedTokens = TOTAL_SUPPLY - tokenLiquidity;
  
  // Initial price
  const initialPricePerToken = fdvEth / TOTAL_SUPPLY;
  
  // AMM state (constant product: x * y = k)
  let poolEth = depositEth;
  let poolTokens = tokenLiquidity;
  let k = poolEth * poolTokens;
  
  const buys: BuyResult[] = [];
  
  for (const buyEth of buyAmounts) {
    const priceBefore = poolEth / poolTokens;
    
    // Add ETH to pool
    const newPoolEth = poolEth + buyEth;
    // Calculate new token amount (k = x * y)
    const newPoolTokens = k / newPoolEth;
    // Tokens received
    const tokensReceived = poolTokens - newPoolTokens;
    
    const priceAfter = newPoolEth / newPoolTokens;
    const priceImpact = ((priceAfter - priceBefore) / priceBefore) * 100;
    
    buys.push({
      buyEth,
      tokensReceived: Math.floor(tokensReceived),
      tokensPct: ((tokensReceived / TOTAL_SUPPLY) * 100).toFixed(4) + '%',
      priceAfter,
      priceImpact: priceImpact.toFixed(2) + '%',
      poolEthAfter: newPoolEth,
      poolTokensAfter: Math.floor(newPoolTokens),
    });
    
    // Update pool state for next buy
    poolEth = newPoolEth;
    poolTokens = newPoolTokens;
    // k stays constant
  }
  
  return {
    scenario: `FDV=${fdvEth}ETH, Deposit=${depositEth}ETH`,
    fdvEth,
    depositEth,
    tokenLiquidity: Math.floor(tokenLiquidity),
    tokenLiquidityPct: ((tokenLiquidity / TOTAL_SUPPLY) * 100).toFixed(4) + '%',
    burnedTokens: Math.floor(burnedTokens),
    burnedPct: ((burnedTokens / TOTAL_SUPPLY) * 100).toFixed(4) + '%',
    initialPricePerToken,
    buys,
  };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toFixed(2);
}

console.log('='.repeat(80));
console.log('PUMPCLAW FDV SIMULATION');
console.log('='.repeat(80));
console.log('Total Supply: 1B tokens\n');

// Scenarios to test
const scenarios = [
  // Old system (no FDV concept, price = deposit/supply)
  { fdv: 0.001, deposit: 0.001, label: 'OLD SYSTEM (V1): deposit=price' },
  
  // New system with different FDV values
  { fdv: 20, deposit: 0.001, label: 'V2: Low deposit, 20 ETH FDV' },
  { fdv: 20, deposit: 0.01, label: 'V2: 0.01 ETH deposit, 20 ETH FDV' },
  { fdv: 20, deposit: 0.1, label: 'V2: 0.1 ETH deposit, 20 ETH FDV' },
  { fdv: 20, deposit: 1, label: 'V2: 1 ETH deposit, 20 ETH FDV' },
  { fdv: 50, deposit: 0.1, label: 'V2: 0.1 ETH deposit, 50 ETH FDV' },
];

// Buy amounts to simulate
const buyAmounts = [0.001, 0.01, 0.1, 1];

for (const { fdv, deposit, label } of scenarios) {
  const result = simulate(fdv, deposit, buyAmounts);
  
  console.log('-'.repeat(80));
  console.log(`📊 ${label}`);
  console.log('-'.repeat(80));
  console.log(`Initial Liquidity: ${formatNumber(result.tokenLiquidity)} tokens (${result.tokenLiquidityPct})`);
  console.log(`Burned: ${formatNumber(result.burnedTokens)} tokens (${result.burnedPct})`);
  console.log(`Initial Price: ${result.initialPricePerToken.toExponential(4)} ETH/token`);
  console.log('');
  console.log('Buys:');
  console.log('  ETH In     | Tokens Out      | % Supply | Price Impact | Pool After');
  console.log('  ' + '-'.repeat(70));
  
  for (const buy of result.buys) {
    console.log(
      `  ${buy.buyEth.toString().padEnd(10)} | ` +
      `${formatNumber(buy.tokensReceived).padEnd(15)} | ` +
      `${buy.tokensPct.padEnd(8)} | ` +
      `${buy.priceImpact.padEnd(12)} | ` +
      `${formatNumber(buy.poolEthAfter)}E/${formatNumber(buy.poolTokensAfter)}T`
    );
  }
  console.log('');
}

console.log('='.repeat(80));
console.log('KEY INSIGHTS:');
console.log('='.repeat(80));
console.log('1. FDV sets the STARTING price, not the liquidity depth');
console.log('2. Lower deposit = less liquidity = higher price impact per trade');
console.log('3. With FDV pricing, early buyers cannot exploit low initial prices');
console.log('4. Trade-off: creators want low deposit, buyers want deep liquidity');
console.log('');
console.log('RECOMMENDATION:');
console.log('- Let creators choose any FDV (default 20-30 ETH)');
console.log('- No MIN_ETH requirement - let market decide');
console.log('- Show estimated price impact on UI before buying');
