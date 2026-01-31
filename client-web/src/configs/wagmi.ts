import { http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { createClient, fallback } from "viem";
import { BASE_RPC_ENDPOINTS } from "@/configs/rpcs";
import { APP_URL } from "@/configs/constants";

export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error("VITE_REOWN_PROJECT_ID is not defined");
}

export const networks = [base];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "PumpClaw",
      appLogoUrl: `${APP_URL}/logo.png`,
    }),
  ],
  client({ chain }) {
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

    return createClient({
      chain,
      transport,
    });
  },
});

export const config = wagmiAdapter.wagmiConfig;
