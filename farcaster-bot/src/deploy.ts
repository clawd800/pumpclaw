// Deploy token via PumpClaw factory contract
import { createPublicClient, createWalletClient, formatEther } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONFIG, baseTransport } from './config.js';
import type { DeployRequest } from './parse.js';

const FACTORY_ABI = [
  {
    type: "function",
    name: "createToken",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "imageUrl", type: "string" },
      { name: "websiteUrl", type: "string" },
      { name: "totalSupply", type: "uint256" },
      { name: "initialFdv", type: "uint256" },
      { name: "creator", type: "address" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "positionId", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tokenCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const DEFAULT_SUPPLY = 1_000_000_000n * (10n ** 18n); // 1 billion tokens
const DEFAULT_FDV = 20n * (10n ** 18n); // 20 ETH

export interface DeployResult {
  tokenAddress: string;
  txHash: string;
  name: string;
  symbol: string;
  creator: string;
}

export async function deployToken(
  request: DeployRequest,
  creatorAddress: `0x${string}`
): Promise<DeployResult> {
  const account = privateKeyToAccount(CONFIG.PRIVATE_KEY as `0x${string}`);
  
  const publicClient = createPublicClient({
    chain: base,
    transport: baseTransport,
  });
  
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: baseTransport,
  });
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`[deploy] Wallet balance: ${formatEther(balance)} ETH`);
  
  if (balance < 100_000_000_000_000n) { // 0.0001 ETH minimum
    throw new Error(`Insufficient gas: ${formatEther(balance)} ETH`);
  }
  
  console.log(`[deploy] Creating token: ${request.name} ($${request.symbol}) for ${creatorAddress}`);
  
  const hash = await walletClient.writeContract({
    address: CONFIG.FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'createToken',
    args: [
      request.name,
      request.symbol,
      request.imageUrl || '',
      '', // websiteUrl
      DEFAULT_SUPPLY,
      DEFAULT_FDV,
      creatorAddress,
    ],
  });
  
  console.log(`[deploy] TX submitted: ${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  if (receipt.status !== 'success') {
    throw new Error(`TX failed: ${hash}`);
  }
  
  // Parse token address from TokenCreated event (last log from factory)
  // TokenCreated(address indexed token, address indexed creator, ...)
  const factoryLog = receipt.logs.find(
    log => log.address.toLowerCase() === CONFIG.FACTORY_ADDRESS.toLowerCase() 
  );
  const tokenAddress = factoryLog?.topics[1];
  const parsedAddress = tokenAddress 
    ? `0x${tokenAddress.slice(26)}` 
    : 'unknown';
  
  console.log(`[deploy] ✅ Token created at ${parsedAddress}`);
  
  return {
    tokenAddress: parsedAddress,
    txHash: hash,
    name: request.name,
    symbol: request.symbol,
    creator: creatorAddress,
  };
}

export async function checkGasBalance(): Promise<bigint> {
  const account = privateKeyToAccount(CONFIG.PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({
    chain: base,
    transport: baseTransport,
  });
  return publicClient.getBalance({ address: account.address });
}
