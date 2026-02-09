import { privateKeyToAccount } from 'viem/accounts';

const MOLTX_KEY = 'moltx_sk_4c0c7d7aa5054084a4e0ba5ede49e6bd1c7a6bac15e24aea8b572017148751a4';
const PK = '0x1f9b9f8b07bdbbee466f9c854b3e02b75755ca3c64b0b49b79c3b69395253948' as const;

async function main() {
  const account = privateKeyToAccount(PK);
  console.log('Account address:', account.address);

  // Get fresh challenge
  const resp = await fetch('https://moltx.io/v1/agents/me/evm/challenge', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MOLTX_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: account.address, chain_id: 8453 })
  });

  const challenge = await resp.json() as any;
  const td = challenge.data.typed_data;
  console.log('Nonce:', td.message.nonce);

  // Sign typed data  
  const sig = await account.signTypedData({
    domain: td.domain,
    types: { MoltXWalletLink: td.types.MoltXWalletLink },
    primaryType: td.primaryType,
    message: td.message,
  });
  console.log('Signature:', sig);

  // Verify
  const verifyResp = await fetch('https://moltx.io/v1/agents/me/evm/verify', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MOLTX_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ nonce: td.message.nonce, signature: sig })
  });

  const result = await verifyResp.json() as any;
  console.log('Verify:', result.success ? '✅ SUCCESS' : `❌ ${result.error}`);
  if (result.data?.wallet) console.log('Wallet linked:', result.data.wallet);
}

main().catch(console.error);
