import { createAppKit } from "@reown/appkit/react";
import { base } from "@reown/appkit/networks";
import { wagmiAdapter, projectId } from "./wagmi";
import { APP_NAME, APP_DESCRIPTION, APP_URL } from "./constants";

let initialized = false;

export const initializeAppKit = () => {
  if (initialized) {
    return;
  }

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: [base],
    defaultNetwork: base,
    allowUnsupportedChain: true,
    metadata: {
      name: APP_NAME,
      description: APP_DESCRIPTION,
      url: typeof window !== "undefined" ? window.location.origin : APP_URL,
      icons: [`${APP_URL}/logo.png`],
    },
    features: {
      analytics: true,
      email: false,
      socials: false,
      onramp: true,
      swaps: false,
      send: false,
      history: false,
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#00ff88",
      "--w3m-color-mix": "#000000",
      "--w3m-color-mix-strength": 40,
      "--w3m-font-family": "'JetBrains Mono', monospace",
      "--w3m-border-radius-master": "0px",
      "--w3m-z-index": 10000,
    },
  });

  initialized = true;
};
