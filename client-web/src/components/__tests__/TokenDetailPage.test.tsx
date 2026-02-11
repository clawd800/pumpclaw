import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_TOKEN_INFO = {
  token: "0xTOKENADDRESS1234567890TOKENADDRESS12345678" as `0x${string}`,
  creator: "0xCREATOR1234567890123456789012345678901234" as `0x${string}`,
  positionId: 1n,
  totalSupply: 1_000_000_000_000_000_000_000_000_000n, // 1B tokens
  initialFdv: 20_000_000_000_000_000_000n, // 20 ETH
  createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1 day ago
  name: "TestCoin",
  symbol: "TCOIN",
};

const TOKEN_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;
const goHomeFn = vi.fn();

/* ------------------------------------------------------------------ */
/*  Mutable mock state                                                 */
/* ------------------------------------------------------------------ */

let tokenInfoReturn: any;

function resetMocks() {
  tokenInfoReturn = {
    data: MOCK_TOKEN_INFO,
    isLoading: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock("@/hooks/useTokens", () => ({
  useTokenInfo: vi.fn(() => tokenInfoReturn),
  useTokenImageUrl: vi.fn(() => ({ data: undefined })),
}));

vi.mock("@/hooks/useTokenPrice", () => ({
  useTokenPrice: vi.fn(() => ({
    ethPerToken: 0.000001,
    tokensPerEth: 1_000_000,
    isLoading: false,
  })),
  useEthUsdPrice: vi.fn(() => 2500),
}));

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => ({
    address: "0x1234567890abcdef1234567890abcdef12345678",
    isConnected: true,
    isDisconnected: false,
    isConnecting: false,
    isReconnecting: false,
    status: "connected",
  })),
  useBalance: vi.fn(() => ({
    data: { value: 1_500_000_000_000_000_000n, decimals: 18, formatted: "1.5", symbol: "ETH" },
    isLoading: false,
    refetch: vi.fn(),
  })),
  useReadContract: vi.fn((opts: any) => {
    if (opts?.functionName === "websiteUrl") {
      return { data: "https://testcoin.xyz", isLoading: false };
    }
    if (opts?.functionName === "balanceOf" && opts?.address === "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432") {
      // ERC-8004 registry check — registered
      return { data: 1n, isLoading: false };
    }
    if (opts?.functionName === "totalSupply") {
      return { data: 1_000_000_000_000_000_000_000_000_000n, isLoading: false };
    }
    if (opts?.functionName === "balanceOf") {
      return { data: 500_000_000_000_000_000_000_000_000n, isLoading: false, refetch: vi.fn() };
    }
    return { data: undefined, isLoading: false, refetch: vi.fn() };
  }),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    data: undefined,
    error: null,
    reset: vi.fn(),
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
  useSimulateContract: vi.fn(() => ({
    data: { result: 990_000_000_000_000_000_000_000n },
  })),
  usePublicClient: vi.fn(() => ({
    simulateContract: vi.fn().mockResolvedValue({ result: 500_000_000_000_000n }),
  })),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: null, isFetching: false })),
  };
});

vi.mock("@/configs/constants", () => ({
  CONTRACTS: {
    FACTORY: "0xFACTORY",
    SWAP_ROUTER: "0xSWAPROUTER",
    POOL_MANAGER: "0xPOOLMANAGER",
  },
}));

vi.mock("@/configs/abis", () => ({
  FACTORY_ABI: [],
  ERC20_ABI: [],
  TOKEN_ABI: [],
  SWAP_ROUTER_ABI: [],
}));

vi.mock("../TokenMedia", () => ({
  TokenMedia: ({ alt }: { alt: string }) => <div data-testid="token-media">{alt}</div>,
}));

/* ------------------------------------------------------------------ */
/*  Import AFTER mocks                                                 */
/* ------------------------------------------------------------------ */

import TokenDetailPage from "../TokenDetailPage";

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("TokenDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  /* ---- Basic rendering ---- */

  it("renders token name", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("TestCoin")).toBeInTheDocument();
  });

  it("renders token symbol", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("$TCOIN")).toBeInTheDocument();
  });

  it("renders back button", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const backBtn = screen.getByText(/← back/i);
    expect(backBtn).toBeInTheDocument();
  });

  it("calls goHome when back button clicked", async () => {
    const user = userEvent.setup();
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);

    await user.click(screen.getByText(/← back/i));
    expect(goHomeFn).toHaveBeenCalled();
  });

  /* ---- SwapPanel is present ---- */

  it("renders SwapPanel with Buy/Sell tabs", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    // SwapPanel heading
    expect(screen.getByText("🔄 Swap")).toBeInTheDocument();
    // Buy/Sell tabs from SwapPanel
    expect(screen.getByRole("button", { name: /^buy$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sell$/i })).toBeInTheDocument();
  });

  /* ---- ChartEmbed is present ---- */

  it("renders ChartEmbed with chart heading", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("📈 Chart")).toBeInTheDocument();
  });

  /* ---- Token details section ---- */

  it("shows Contract Address label", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("Contract Address")).toBeInTheDocument();
  });

  it("shows Creator label in details section", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    // Use exact text to avoid matching "80% Creator" or other occurrences
    const creatorLabels = screen.getAllByText("Creator");
    expect(creatorLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Initial FDV", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("Initial FDV")).toBeInTheDocument();
    expect(screen.getByText("20 ETH")).toBeInTheDocument();
  });

  it("shows Total Supply", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("Total Supply")).toBeInTheDocument();
    expect(screen.getByText("1,000,000,000")).toBeInTheDocument();
  });

  it("shows LP Status as locked", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("LP Status")).toBeInTheDocument();
    expect(screen.getByText("🔒 Locked Forever")).toBeInTheDocument();
  });

  it("shows Fee Split", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("Fee Split")).toBeInTheDocument();
    expect(screen.getByText("80% Creator / 20% Protocol")).toBeInTheDocument();
  });

  /* ---- External links ---- */

  it("shows Matcha external link", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const matchaLinks = screen.getAllByRole("link", { name: /matcha/i });
    expect(matchaLinks.length).toBeGreaterThanOrEqual(1);
    expect(matchaLinks[0].getAttribute("href")).toContain("matcha.xyz");
  });

  it("shows BaseScan external link", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const links = screen.getAllByRole("link");
    const scanLink = links.find((l) =>
      l.getAttribute("href")?.includes("basescan.org/token"),
    );
    expect(scanLink).toBeTruthy();
  });

  it("shows DexScreener external link", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const links = screen.getAllByRole("link");
    const dexLink = links.find(
      (l) => l.getAttribute("href")?.includes("dexscreener.com"),
    );
    expect(dexLink).toBeTruthy();
  });

  it("shows Uniswap external link", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const uniLink = screen.getByRole("link", { name: /uniswap/i });
    expect(uniLink).toBeInTheDocument();
    expect(uniLink.getAttribute("href")).toContain("app.uniswap.org");
  });

  /* ---- Share buttons ---- */

  it("renders share section", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("shows Farcaster share button", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const links = screen.getAllByRole("link");
    const fcBtn = links.find(
      (l) => l.textContent?.includes("Farcaster") && l.getAttribute("href")?.includes("farcaster.xyz"),
    );
    expect(fcBtn).toBeTruthy();
  });

  it("shows X/Twitter share button", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const links = screen.getAllByRole("link");
    const xBtn = links.find(
      (l) => l.getAttribute("href")?.includes("twitter.com/intent/tweet"),
    );
    expect(xBtn).toBeTruthy();
  });

  it("shows Copy Link button", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const buttons = screen.getAllByRole("button");
    const linkBtn = buttons.find((b) => b.textContent?.includes("Link"));
    expect(linkBtn).toBeTruthy();
  });

  /* ---- ERC-8004 badge ---- */

  it("shows ERC-8004 badge when creator is registered", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText(/8004/)).toBeInTheDocument();
  });

  /* ---- Loading state ---- */

  it("shows loading state when data is loading", () => {
    tokenInfoReturn = { data: undefined, isLoading: true };
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText(/loading token/i)).toBeInTheDocument();
  });

  /* ---- Token not found ---- */

  it("shows not found state for invalid token", () => {
    tokenInfoReturn = {
      data: {
        token: "0x0000000000000000000000000000000000000000",
        creator: "0x0000000000000000000000000000000000000000",
        positionId: 0n,
        totalSupply: 0n,
        initialFdv: 0n,
        createdAt: 0n,
        name: "",
        symbol: "",
      },
      isLoading: false,
    };

    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText(/token not found/i)).toBeInTheDocument();
  });

  /* ---- Launch your own CTA ---- */

  it("shows launch your own CTA section", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    expect(screen.getByText(/launch your own token/i)).toBeInTheDocument();
  });

  it("has Farcaster deploy link in CTA", () => {
    render(<TokenDetailPage tokenAddress={TOKEN_ADDRESS} goHome={goHomeFn} />);
    const links = screen.getAllByRole("link");
    const fcDeploy = links.find(
      (l) => l.getAttribute("href")?.includes("farcaster.xyz/~/compose"),
    );
    expect(fcDeploy).toBeTruthy();
  });
});
