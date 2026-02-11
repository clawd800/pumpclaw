import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_TOKENS = [
  {
    token: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" as `0x${string}`,
    creator: "0x1111111111111111111111111111111111111111" as `0x${string}`,
    positionId: 1n,
    totalSupply: 1_000_000_000_000_000_000_000_000_000n,
    initialFdv: 20_000_000_000_000_000_000n, // 20 ETH
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600), // 1h ago
    name: "AlphaToken",
    symbol: "ALPHA",
  },
  {
    token: "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB" as `0x${string}`,
    creator: "0x2222222222222222222222222222222222222222" as `0x${string}`,
    positionId: 2n,
    totalSupply: 1_000_000_000_000_000_000_000_000_000n,
    initialFdv: 10_000_000_000_000_000_000n, // 10 ETH
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1d ago
    name: "BetaToken",
    symbol: "BETA",
  },
];

const refetchFn = vi.fn();

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock("@/hooks/useTokens", () => ({
  useLatestTokens: vi.fn(() => ({
    data: MOCK_TOKENS,
    isLoading: false,
    count: 2,
    refetch: refetchFn,
  })),
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
  useReadContract: vi.fn(() => ({
    data: undefined,
    isLoading: false,
    refetch: vi.fn(),
  })),
  useReadContracts: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

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
}));

vi.mock("../TokenMedia", () => ({
  TokenMedia: ({ alt }: { alt: string }) => <div data-testid="token-media">{alt}</div>,
}));

/* ------------------------------------------------------------------ */
/*  Import AFTER mocks                                                 */
/* ------------------------------------------------------------------ */

import TokenList from "../TokenList";

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("TokenList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ---- Basic rendering ---- */

  it("renders the Token List heading", () => {
    render(<TokenList />);
    expect(screen.getByText(/token list/i)).toBeInTheDocument();
  });

  it("renders total count", () => {
    render(<TokenList />);
    expect(screen.getByText(/2 total/i)).toBeInTheDocument();
  });

  /* ---- Token cards ---- */

  it("renders token cards with name and symbol", () => {
    render(<TokenList />);
    expect(screen.getByText("AlphaToken")).toBeInTheDocument();
    expect(screen.getByText("$ALPHA")).toBeInTheDocument();
    expect(screen.getByText("BetaToken")).toBeInTheDocument();
    expect(screen.getByText("$BETA")).toBeInTheDocument();
  });

  it("shows FDV for each token", () => {
    render(<TokenList />);
    // 20 ETH and 10 ETH
    expect(screen.getByText("20 ETH")).toBeInTheDocument();
    expect(screen.getByText("10 ETH")).toBeInTheDocument();
  });

  it("shows creator address (truncated)", () => {
    render(<TokenList />);
    // Creator: 0x1111...1111 → "0x1111...1111"
    expect(screen.getByText("0x1111...1111")).toBeInTheDocument();
    expect(screen.getByText("0x2222...2222")).toBeInTheDocument();
  });

  it("shows time ago for creation date", () => {
    render(<TokenList />);
    expect(screen.getByText("1h ago")).toBeInTheDocument();
    expect(screen.getByText("1d ago")).toBeInTheDocument();
  });

  /* ---- Trade button ---- */

  it("shows Trade buttons linking to token detail page", () => {
    render(<TokenList />);
    const tradeLinks = screen.getAllByText(/trade/i);
    expect(tradeLinks.length).toBeGreaterThanOrEqual(2);

    // Check that Trade links point to correct hash URLs
    const alphaTradeLink = tradeLinks.find((el) =>
      el.closest("a")?.getAttribute("href")?.includes(MOCK_TOKENS[0].token),
    );
    expect(alphaTradeLink).toBeTruthy();
  });

  /* ---- Token card links to detail page ---- */

  it("token card header links to detail page", () => {
    render(<TokenList />);
    // Each card header is an <a> linking to #/token/{address}
    const links = screen.getAllByRole("link");
    const tokenDetailLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("#/token/"),
    );
    expect(tokenDetailLinks.length).toBeGreaterThanOrEqual(2);
  });

  /* ---- Sort tabs ---- */

  it("renders sort tabs with 'Recent Launches' active by default", () => {
    render(<TokenList />);
    const recentTab = screen.getByRole("button", { name: /recent launches/i });
    expect(recentTab).toBeInTheDocument();
    expect(recentTab.className).toContain("text-green-300");
  });

  it("has 'Highest Market Cap' tab button", () => {
    render(<TokenList />);
    const tab = screen.getByRole("button", { name: /highest market cap/i });
    expect(tab).toBeInTheDocument();
  });

  it("switches sort when tab button is clicked", async () => {
    const user = userEvent.setup();
    render(<TokenList />);

    const mcapTab = screen.getByRole("button", { name: /highest market cap/i });
    await user.click(mcapTab);
    // Active tab should have the active styling class
    expect(mcapTab.className).toContain("text-green-300");
  });

  /* ---- 8004 filter ---- */

  it("renders ERC-8004 filter checkbox", () => {
    render(<TokenList />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("toggles 8004 filter checkbox", async () => {
    const user = userEvent.setup();
    render(<TokenList />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("shows 'Registered Only' label", () => {
    render(<TokenList />);
    expect(screen.getByText(/registered only/i)).toBeInTheDocument();
  });

  /* ---- Refresh button ---- */

  it("has a refresh button that calls refetch", async () => {
    const user = userEvent.setup();
    render(<TokenList />);

    const refreshBtn = screen.getByText(/refresh/i);
    await user.click(refreshBtn);
    expect(refetchFn).toHaveBeenCalled();
  });

  /* ---- Loading state ---- */

  it("shows loading state when data is loading", async () => {
    const { useLatestTokens } = await import("@/hooks/useTokens");
    vi.mocked(useLatestTokens).mockReturnValue({
      data: [],
      isLoading: true,
      count: 0,
      refetch: refetchFn,
    });

    render(<TokenList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  /* ---- Empty state ---- */

  it("shows empty state when no tokens", async () => {
    const { useLatestTokens } = await import("@/hooks/useTokens");
    vi.mocked(useLatestTokens).mockReturnValue({
      data: [],
      isLoading: false,
      count: 0,
      refetch: refetchFn,
    });

    render(<TokenList />);
    expect(screen.getByText(/no tokens launched yet/i)).toBeInTheDocument();
  });
});
