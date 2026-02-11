import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseEther } from "viem";

/* ------------------------------------------------------------------ */
/*  Mutable mock state                                                 */
/* ------------------------------------------------------------------ */

let accountReturn: any;
let balanceReturn: any;
let readContractReturn: any;
let writeContractReturn: any;
let receiptReturn: any;

const refetchEth = vi.fn();
const refetchAllowance = vi.fn().mockResolvedValue({});
const writeContractFn = vi.fn();
const resetWriteFn = vi.fn();

const CONNECTED = {
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

const DISCONNECTED = {
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

function resetMockState() {
  accountReturn = { ...CONNECTED };

  balanceReturn = {
    data: {
      value: 1_500_000_000_000_000_000n, // 1.5 ETH
      decimals: 18,
      formatted: "1.5",
      symbol: "ETH",
    },
    isLoading: false,
    isError: false,
    refetch: refetchEth,
  };

  readContractReturn = {
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: refetchAllowance,
  };

  writeContractReturn = {
    writeContract: writeContractFn,
    data: undefined,
    error: null,
    reset: resetWriteFn,
    isPending: false,
  };

  receiptReturn = {
    data: undefined,
    isLoading: false,
    isError: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Mock wagmi — uses closures to read mutable state                   */
/* ------------------------------------------------------------------ */

vi.mock("wagmi", () => ({
  useAccount: vi.fn(() => accountReturn),
  useBalance: vi.fn(() => balanceReturn),
  useReadContract: vi.fn(() => readContractReturn),
  useWriteContract: vi.fn(() => writeContractReturn),
  useWaitForTransactionReceipt: vi.fn(() => receiptReturn),
  useSimulateContract: vi.fn(() => ({
    data: { result: 990_000_000_000_000_000_000_000n }, // 990,000 tokens
  })),
  usePublicClient: vi.fn(() => ({
    simulateContract: vi.fn().mockResolvedValue({ result: 500_000_000_000_000n }), // 0.0005 ETH
  })),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: null, isFetching: false })),
  };
});

vi.mock("@/hooks/useTokenPrice", () => ({
  useEthUsdPrice: vi.fn(() => 2500),
}));

vi.mock("@/configs/constants", () => ({
  CONTRACTS: {
    FACTORY: "0xFACTORY",
    SWAP_ROUTER: "0xSWAPROUTER",
    POOL_MANAGER: "0xPOOLMANAGER",
  },
}));

vi.mock("@/configs/abis", () => ({
  SWAP_ROUTER_ABI: [],
  ERC20_ABI: [],
}));

/* ------------------------------------------------------------------ */
/*  Import AFTER mocks                                                 */
/* ------------------------------------------------------------------ */

import SwapPanel from "../SwapPanel";

const TOKEN = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;
const SYMBOL = "TEST";

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe("SwapPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  /* ---- Rendering ---- */

  it("renders Buy and Sell tabs", () => {
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByRole("button", { name: /^buy$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^sell$/i })).toBeInTheDocument();
  });

  it("defaults to Buy tab active", () => {
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/eth to spend/i)).toBeInTheDocument();
  });

  /* ---- Tab switching ---- */

  it("switches to Sell tab when clicked", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByRole("button", { name: /sell/i }));
    expect(screen.getByText(new RegExp(`${SYMBOL} to sell`, "i"))).toBeInTheDocument();
  });

  it("clears amount when switching tabs", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "0.5");
    expect(input.value).toBe("0.5");

    await user.click(screen.getByRole("button", { name: /sell/i }));
    const sellInput = screen.getByPlaceholderText("1000000") as HTMLInputElement;
    expect(sellInput.value).toBe("");
  });

  /* ---- Wallet not connected ---- */

  it("shows connect wallet message when no wallet connected", () => {
    accountReturn = { ...DISCONNECTED };
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/connect your wallet to trade/i)).toBeInTheDocument();
  });

  it("does not show input field when disconnected", () => {
    accountReturn = { ...DISCONNECTED };
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.queryByPlaceholderText("0.01")).not.toBeInTheDocument();
  });

  /* ---- Balances ---- */

  it("shows ETH balance when wallet connected", () => {
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText("1.5000")).toBeInTheDocument();
  });

  it("shows token balance when wallet connected", () => {
    readContractReturn = {
      data: 5_000_000_000_000_000_000_000_000n, // 5,000,000 tokens
      isLoading: false,
      isError: false,
      refetch: refetchAllowance,
    };
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/5,000,000/)).toBeInTheDocument();
  });

  /* ---- ETH input ---- */

  it("accepts valid decimal input", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "0.123");
    expect(input.value).toBe("0.123");
  });

  /* ---- Slippage ---- */

  it("shows slippage toggle button with default 1%", () => {
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/slippage: 1%/i)).toBeInTheDocument();
  });

  it("reveals slippage presets when ⚙️ toggle clicked", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByText(/slippage: 1%/i));
    expect(screen.getByRole("button", { name: "1%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10%" })).toBeInTheDocument();
  });

  it("changes slippage when preset clicked", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByText(/slippage: 1%/i));
    await user.click(screen.getByRole("button", { name: "3%" }));
    expect(screen.getByText(/slippage: 3%/i)).toBeInTheDocument();
  });

  it("shows custom slippage input", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByText(/slippage: 1%/i));
    await user.click(screen.getByRole("button", { name: /custom/i }));
    expect(screen.getByPlaceholderText("e.g. 7.5")).toBeInTheDocument();
  });

  /* ---- MAX button ---- */

  it("MAX button fills ETH balance minus gas reserve on Buy tab", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByRole("button", { name: /max/i }));
    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    // 1.5 ETH - 0.001 gas reserve = 1.499 ETH
    expect(input.value).toBe("1.499");
  });

  it("MAX button fills full token balance on Sell tab", async () => {
    const user = userEvent.setup();
    readContractReturn = {
      data: 1_000_000_000_000_000_000_000n, // 1000 tokens
      isLoading: false,
      isError: false,
      refetch: refetchAllowance,
    };

    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByRole("button", { name: /sell/i }));
    await user.click(screen.getByRole("button", { name: /max/i }));
    const input = screen.getByPlaceholderText("1000000") as HTMLInputElement;
    expect(input.value).toBe("1000");
  });

  /* ---- Buy button disabled states ---- */

  it("buy button is disabled when amount is empty", () => {
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    const buyButton = screen.getByRole("button", { name: new RegExp(`Buy ${SYMBOL}`) });
    expect(buyButton).toBeDisabled();
  });

  it("buy button is disabled when amount is 0", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "0");
    const buyButton = screen.getByRole("button", { name: new RegExp(`Buy ${SYMBOL}`) });
    expect(buyButton).toBeDisabled();
  });

  it("buy button is enabled with valid amount", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "0.5");
    const buyButton = screen.getByRole("button", { name: new RegExp(`Buy ${SYMBOL}`) });
    expect(buyButton).toBeEnabled();
  });

  /* ---- Estimated output ---- */

  it("shows estimated output when amount entered (buy)", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "1");
    expect(screen.getByText(/you receive/i)).toBeInTheDocument();
    // 1,000,000 * 0.99 price impact = 990,000
    expect(screen.getByText(/990,000/)).toBeInTheDocument();
  });

  it("shows USD estimate when amount entered", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "1");
    expect(screen.getByText("$2500.00")).toBeInTheDocument();
  });

  /* ---- Sell tab: approve flow ---- */

  it("shows 'Approve & Sell' when allowance is insufficient", async () => {
    const user = userEvent.setup();
    // Allowance must be truthy (non-zero) but less than the sell amount
    // Note: 0n is falsy in JS, so the component's `!allowance` check would skip approval
    // Mock returns same value for balanceOf AND allowance.
    // Set data to a value that's: enough as balance (> sell amount), but insufficient as allowance (< sell amount).
    // Sell 500 tokens. balanceOf = allowance = 200e18. 200 < 500 means both insufficient.
    // Instead: sell 0.0000000000000001 (100 wei). allowance = 1n (1 wei < 100 wei → needs approval).
    // But balanceOf = 1n too → insufficient. 
    // Simplest: just make the sell amount tiny enough that 1 wei balance covers it — impossible with parseEther.
    // Real fix: use value where both balance and allowance = X, sell amount = X-1 won't trigger approval.
    // Actually: allowance check uses raw comparison: allowance < amountWei. balanceOf check: parsedAmount > tokenBalance.
    // If data = parseEther("500"), sell "100": balance 500 >= 100 ✅, allowance 500e18 >= 100e18 → no approval ❌
    // We need allowance < sell amount AND balance >= sell amount with SAME value. That's contradictory.
    // Solution: the component calls useReadContract twice with different args. Mock call order.
    readContractReturn = {
      data: 1n, // will be overridden per call
      isLoading: false,
      isError: false,
      refetch: refetchAllowance,
    };
    const wagmi = await import("wagmi");
    const origImpl = (wagmi.useReadContract as any).getMockImplementation?.();
    let callIdx = 0;
    (wagmi.useReadContract as any).mockImplementation((...args: any[]) => {
      callIdx++;
      // balanceOf calls (1st, 3rd, ...) → large balance; allowance calls (2nd, 4th, ...) → tiny
      const isBal = callIdx % 2 === 1;
      return {
        data: isBal ? parseEther("1000") : 1n,
        isLoading: false,
        isError: false,
        refetch: refetchAllowance,
      };
    });

    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    await user.click(screen.getByRole("button", { name: /^sell$/i }));
    const input = screen.getByPlaceholderText("1000000") as HTMLInputElement;
    await user.type(input, "100");

    // Restore mock for subsequent tests
    (wagmi.useReadContract as any).mockImplementation(() => readContractReturn);

    expect(
      screen.getByRole("button", { name: new RegExp(`Approve & Sell ${SYMBOL}`) }),
    ).toBeInTheDocument();
  });

  /* ---- TX: buy triggers writeContract ---- */

  it("calls writeContract when Buy is clicked with valid amount", async () => {
    const user = userEvent.setup();
    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    const input = screen.getByPlaceholderText("0.01") as HTMLInputElement;
    await user.type(input, "0.5");

    const buyBtn = screen.getByRole("button", { name: new RegExp(`Buy ${SYMBOL}`) });
    await user.click(buyBtn);

    expect(writeContractFn).toHaveBeenCalled();
  });

  /* ---- TX status: success ---- */

  it("shows success message with BaseScan link after successful TX", () => {
    const txHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`;

    writeContractReturn = {
      writeContract: writeContractFn,
      data: txHash,
      error: null,
      reset: resetWriteFn,
      isPending: false,
    };

    receiptReturn = {
      data: { status: "success", transactionHash: txHash },
      isLoading: false,
      isError: false,
    };

    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);

    expect(screen.getByText(/transaction successful/i)).toBeInTheDocument();
    const link = screen.getByText(/view on basescan/i);
    expect(link).toHaveAttribute("href", `https://basescan.org/tx/${txHash}`);
  });

  /* ---- TX status: failed ---- */

  it("shows failure message when transaction fails", () => {
    writeContractReturn = {
      writeContract: writeContractFn,
      data: undefined,
      error: new Error("Execution reverted"),
      reset: resetWriteFn,
      isPending: false,
    };

    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
  });

  it("shows user-friendly message when user rejects tx", () => {
    writeContractReturn = {
      writeContract: writeContractFn,
      data: undefined,
      error: new Error("User rejected the request"),
      reset: resetWriteFn,
      isPending: false,
    };

    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/rejected by user/i)).toBeInTheDocument();
  });

  it('shows "Try again" button on failure', () => {
    writeContractReturn = {
      writeContract: writeContractFn,
      data: undefined,
      error: new Error("Something went wrong"),
      reset: resetWriteFn,
      isPending: false,
    };

    render(<SwapPanel tokenAddress={TOKEN} tokenSymbol={SYMBOL} />);
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });
});
