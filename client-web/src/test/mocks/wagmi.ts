/**
 * Shared wagmi mock defaults.
 *
 * Each test file calls `vi.mock("wagmi", ...)` at the top level.
 * These helpers provide reusable return values you can spread / override.
 */

import { vi } from "vitest";

/* ------------------------------------------------------------------ */
/*  Default return values                                             */
/* ------------------------------------------------------------------ */

export const mockAccount = {
  address: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`,
  isConnected: true,
  isDisconnected: false,
  isConnecting: false,
  isReconnecting: false,
  status: "connected" as const,
  chain: { id: 8453, name: "Base" },
  chainId: 8453,
  connector: undefined,
  addresses: ["0x1234567890abcdef1234567890abcdef12345678" as `0x${string}`],
};

export const mockDisconnected = {
  address: undefined,
  isConnected: false,
  isDisconnected: true,
  isConnecting: false,
  isReconnecting: false,
  status: "disconnected" as const,
  chain: undefined,
  chainId: undefined,
  connector: undefined,
  addresses: undefined,
};

export const mockEthBalance = {
  data: {
    value: 1_500_000_000_000_000_000n, // 1.5 ETH
    decimals: 18,
    formatted: "1.5",
    symbol: "ETH",
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

export const mockZeroBalance = {
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

/* ------------------------------------------------------------------ */
/*  Write-contract mock state                                          */
/* ------------------------------------------------------------------ */

export function createWriteContractMock() {
  return {
    writeContract: vi.fn(),
    data: undefined as `0x${string}` | undefined,
    error: null as Error | null,
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    isIdle: true,
    status: "idle" as const,
  };
}

/* ------------------------------------------------------------------ */
/*  Wait-for-transaction mock                                          */
/* ------------------------------------------------------------------ */

export function createReceiptMock(overrides?: {
  hash?: `0x${string}`;
  status?: "success" | "reverted";
}) {
  if (!overrides?.hash) {
    return { data: undefined, isLoading: false, isError: false };
  }
  return {
    data: overrides?.status
      ? { status: overrides.status, transactionHash: overrides.hash }
      : undefined,
    isLoading: !overrides?.status,
    isError: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Factory function – create a full wagmi module mock                 */
/* ------------------------------------------------------------------ */

export interface WagmiMockOverrides {
  /** useAccount return value */
  account?: Partial<typeof mockAccount>;
  /** useBalance return value */
  balance?: Partial<typeof mockEthBalance>;
  /** useReadContract return value builder — called with args so you can branch */
  readContract?: (args: { functionName?: string; address?: string }) => unknown;
  /** useReadContracts return value */
  readContracts?: { data: unknown[] };
  /** useWriteContract return value */
  writeContract?: ReturnType<typeof createWriteContractMock>;
  /** useWaitForTransactionReceipt return value */
  receipt?: ReturnType<typeof createReceiptMock>;
}

/**
 * Build the object you pass to `vi.mock("wagmi", () => ({ ... }))`.
 *
 * Usage in a test file:
 * ```ts
 * vi.mock("wagmi", () => buildWagmiMock({ account: mockDisconnected }));
 * ```
 */
export function buildWagmiMock(overrides: WagmiMockOverrides = {}) {
  const account = { ...mockAccount, ...overrides.account };
  const balance = { ...mockEthBalance, ...overrides.balance };
  const writeMock = overrides.writeContract ?? createWriteContractMock();
  const receiptMock = overrides.receipt ?? createReceiptMock();

  return {
    useAccount: vi.fn(() => account),
    useBalance: vi.fn(() => balance),
    useReadContract: vi.fn((opts: any) => {
      if (overrides.readContract) {
        return overrides.readContract(opts ?? {});
      }
      // Sensible default: return undefined data
      return { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
    }),
    useReadContracts: vi.fn(() =>
      overrides.readContracts ?? { data: undefined, isLoading: false },
    ),
    useWriteContract: vi.fn(() => writeMock),
    useWaitForTransactionReceipt: vi.fn(() => receiptMock),
    // Re-export things that are imported from wagmi but aren't hooks
    createConfig: vi.fn(),
    http: vi.fn(),
    WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
  };
}
