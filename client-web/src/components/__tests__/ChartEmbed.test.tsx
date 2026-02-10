import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChartEmbed from "../ChartEmbed";

const TOKEN = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";

describe("ChartEmbed", () => {
  /* ---- Basic rendering ---- */

  it("renders chart section heading", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    expect(screen.getByText(/chart/i)).toBeInTheDocument();
  });

  it("renders DexScreener and GeckoTerminal provider buttons", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    expect(screen.getByRole("button", { name: /dexscreener/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /geckoterminal/i })).toBeInTheDocument();
  });

  /* ---- Default provider ---- */

  it("defaults to DexScreener provider", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    expect(iframe.src).toContain("dexscreener.com");
    expect(iframe.src).toContain(TOKEN);
  });

  /* ---- Provider toggle ---- */

  it("switches to GeckoTerminal when button clicked", async () => {
    const user = userEvent.setup();
    render(<ChartEmbed tokenAddress={TOKEN} />);

    await user.click(screen.getByRole("button", { name: /geckoterminal/i }));
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("geckoterminal.com");
    expect(iframe.src).toContain(TOKEN);
  });

  it("switches back to DexScreener", async () => {
    const user = userEvent.setup();
    render(<ChartEmbed tokenAddress={TOKEN} />);

    await user.click(screen.getByRole("button", { name: /geckoterminal/i }));
    await user.click(screen.getByRole("button", { name: /dexscreener/i }));
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("dexscreener.com");
  });

  /* ---- Correct iframe src ---- */

  it("DexScreener iframe has correct embed URL", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    const expectedUrl = `https://dexscreener.com/base/${TOKEN}?embed=1&theme=dark&trades=0&info=0`;
    expect(iframe.src).toBe(expectedUrl);
  });

  it("GeckoTerminal iframe has correct embed URL", async () => {
    const user = userEvent.setup();
    render(<ChartEmbed tokenAddress={TOKEN} />);

    await user.click(screen.getByRole("button", { name: /geckoterminal/i }));
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    const expectedUrl = `https://www.geckoterminal.com/base/tokens/${TOKEN}?embed=1&info=0&swaps=1`;
    expect(iframe.src).toBe(expectedUrl);
  });

  /* ---- Iframe sandbox attribute ---- */

  it("iframe has sandbox attribute for security", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("sandbox")).toBeTruthy();
    expect(iframe.getAttribute("sandbox")).toContain("allow-scripts");
    expect(iframe.getAttribute("sandbox")).toContain("allow-same-origin");
  });

  /* ---- Error / fallback state ---- */

  it("shows fallback state when iframe errors", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;

    // jsdom + React 19: iframe error events don't trigger React's onError handler
    // through standard dispatchEvent. Access React's internal fiber to call the
    // handler directly — this reliably tests the error → fallback transition.
    const fiberKey = Object.keys(iframe).find((k) => k.startsWith("__reactFiber"));
    const fiber = (iframe as any)[fiberKey!];
    const onError = fiber?.memoizedProps?.onError;
    expect(onError).toBeDefined();

    act(() => {
      onError();
    });

    expect(screen.getByText(/no chart data/i)).toBeInTheDocument();
  });

  it("fallback state has links to DexScreener and GeckoTerminal", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;

    const fiberKey = Object.keys(iframe).find((k) => k.startsWith("__reactFiber"));
    const fiber = (iframe as any)[fiberKey!];

    act(() => {
      fiber.memoizedProps.onError();
    });

    const dexLink = screen.getByRole("link", { name: /dexscreener/i });
    expect(dexLink).toHaveAttribute("href", `https://dexscreener.com/base/${TOKEN}`);

    const geckoLink = screen.getByRole("link", { name: /geckoterminal/i });
    expect(geckoLink).toHaveAttribute(
      "href",
      `https://www.geckoterminal.com/base/tokens/${TOKEN}`,
    );
  });

  it("iframe has loading=lazy attribute", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("loading")).toBe("lazy");
  });

  it("iframe has descriptive title", () => {
    render(<ChartEmbed tokenAddress={TOKEN} />);
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.title).toContain("chart");
  });
});
