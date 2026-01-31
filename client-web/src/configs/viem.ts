import { http, fallback, createPublicClient } from "viem";
import { base } from "viem/chains";
import { BASE_RPC_ENDPOINTS } from "@/configs/rpcs";

function _getTransport(rpcEndpoints: readonly string[]) {
  return fallback(
    rpcEndpoints.map((url) =>
      http(url, {
        timeout: 2_000,
        retryCount: 0,
        batch: true,
      })
    ),
    { rank: false }
  );
}

export const basePublicClient = createPublicClient({
  chain: base,
  transport: _getTransport(BASE_RPC_ENDPOINTS),
});
