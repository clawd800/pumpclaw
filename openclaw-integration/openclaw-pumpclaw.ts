/**
 * OpenClaw x PumpClaw Integration
 * Drop-in module for OpenClaw agents to launch tokens
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TokenLaunchResult {
  success: boolean;
  tokenAddress?: string;
  poolAddress?: string;
  error?: string;
  txHash?: string;
}

export interface TokenConfig {
  name: string;
  symbol: string;
  imageUrl: string;
  supply?: string; // default: 1000000000
  fdv?: string; // default: 69420
}

/**
 * Launch a token on PumpClaw from your OpenClaw agent
 * @param config Token configuration
 * @returns TokenLaunchResult with addresses and tx hash
 */
export async function launchToken(config: TokenConfig): Promise<TokenLaunchResult> {
  try {
    // Validate inputs
    if (!config.name || !config.symbol || !config.imageUrl) {
      return {
        success: false,
        error: 'Missing required fields: name, symbol, or imageUrl'
      };
    }

    // Check if pumpclaw CLI is installed
    try {
      await execAsync('pumpclaw --version');
    } catch {
      return {
        success: false,
        error: 'pumpclaw CLI not installed. Run: npm install -g pumpclaw-cli'
      };
    }

    // Build command
    const supply = config.supply || '1000000000';
    const fdv = config.fdv || '69420';
    
    const cmd = `pumpclaw create "${config.name}" "${config.symbol}" "${config.imageUrl}" --supply ${supply} --fdv ${fdv}`;

    // Execute
    const { stdout, stderr } = await execAsync(cmd, {
      env: { ...process.env }
    });

    // Parse output
    const tokenMatch = stdout.match(/Token deployed: (0x[a-fA-F0-9]{40})/);
    const poolMatch = stdout.match(/Pool created: (0x[a-fA-F0-9]{40})/);
    const txMatch = stdout.match(/Transaction: (0x[a-fA-F0-9]{64})/);

    if (!tokenMatch) {
      return {
        success: false,
        error: stderr || 'Failed to parse token address from output'
      };
    }

    return {
      success: true,
      tokenAddress: tokenMatch[1],
      poolAddress: poolMatch?.[1],
      txHash: txMatch?.[1]
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if agent has BASE_PRIVATE_KEY configured
 */
export function isConfigured(): boolean {
  return !!process.env.BASE_PRIVATE_KEY;
}

/**
 * Get trade link for launched token
 */
export function getTradeLink(tokenAddress: string): string {
  return `https://matcha.xyz/tokens/base/${tokenAddress}?sellChain=8453&sellAddress=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`;
}

/**
 * Get Basescan link
 */
export function getBasescanLink(address: string): string {
  return `https://basescan.org/address/${address}`;
}

// Example usage for OpenClaw agents:
/*
import { launchToken, getTradeLink } from './openclaw-pumpclaw';

const result = await launchToken({
  name: "My Agent Economy",
  symbol: "AGENT",
  imageUrl: "https://myagent.com/avatar.png"
});

if (result.success) {
  console.log(`Token launched: ${result.tokenAddress}`);
  console.log(`Trade: ${getTradeLink(result.tokenAddress)}`);
} else {
  console.error(`Failed: ${result.error}`);
}
*/
