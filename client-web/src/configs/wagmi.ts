import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { fallback } from "viem";
import { BASE_RPC_ENDPOINTS } from "@/configs/rpcs";

// Create fallback transport with multiple RPCs
const transport = fallback(
  BASE_RPC_ENDPOINTS.map((url) =>
    http(url, {
      timeout: 2_000,
      retryCount: 0,
      batch: true,
    })
  ),
  { rank: false }
);

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "PumpClaw",
    }),
  ],
  transports: {
    [base.id]: transport,
  },
});
