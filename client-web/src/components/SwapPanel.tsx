import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther, maxUint256 } from "viem";
import { CONTRACTS } from "@/configs/constants";
import { SWAP_ROUTER_ABI, ERC20_ABI } from "@/configs/abis";
import { useTokenPrice, useEthUsdPrice } from "@/hooks/useTokenPrice";

type SwapTab = "buy" | "sell";
type TxStatus = "idle" | "approving" | "pending" | "success" | "failed";

interface SwapPanelProps {
  tokenAddress: `0x${string}`;
  tokenSymbol: string;
}

function SlippageSelector({ slippage, onChange }: { slippage: number; onChange: (v: number) => void }) {
  const presets = [1, 3, 5, 10];
  const [isOpen, setIsOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-green-700 hover:text-green-500 transition-colors text-xs"
      >
        <span>⚙️</span>
        <span>Slippage: {slippage}%</span>
        <span className="text-[10px]">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="space-y-2 pt-1">
          <div className="flex gap-1.5">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => { onChange(p); setShowCustom(false); }}
                className={`flex-1 py-1.5 text-xs font-medium border transition-all ${
                  slippage === p && !showCustom
                    ? "bg-green-600/30 border-green-500/60 text-green-300"
                    : "bg-black/40 border-green-900/50 text-green-600 hover:border-green-700/50"
                }`}
              >
                {p}%
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`flex-1 py-1.5 text-xs font-medium border transition-all ${
                showCustom
                  ? "bg-green-600/30 border-green-500/60 text-green-300"
                  : "bg-black/40 border-green-900/50 text-green-600 hover:border-green-700/50"
              }`}
            >
              Custom
            </button>
          </div>
          {showCustom && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0 && val <= 50) onChange(val);
                }}
                placeholder="e.g. 7.5"
                className="flex-1 bg-black/60 border border-green-900/50 text-green-300 text-sm px-3 py-1.5 font-mono focus:outline-none focus:border-green-500/50"
              />
              <span className="text-green-600 text-sm">%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SwapPanel({ tokenAddress, tokenSymbol }: SwapPanelProps) {
  const [tab, setTab] = useState<SwapTab>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [errorMsg, setErrorMsg] = useState("");

  const { address, isConnected } = useAccount();
  const { ethPerToken, tokensPerEth } = useTokenPrice(tokenAddress);
  const ethUsd = useEthUsdPrice();

  // ETH balance
  const { data: ethBalance, refetch: refetchEthBalance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  // Token balance
  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Token allowance for SwapRouter
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: [{
      type: "function",
      name: "allowance",
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
      ],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    }] as const,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.SWAP_ROUTER as `0x${string}`] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: writeData, error: writeError, reset: resetWrite } = useWriteContract();

  // Watch for writeContract hash
  useEffect(() => {
    if (writeData) {
      setTxHash(writeData);
    }
  }, [writeData]);

  // Watch for writeContract error
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message || "Transaction failed";
      if (msg.includes("User rejected") || msg.includes("denied")) {
        setErrorMsg("Transaction rejected by user");
      } else {
        setErrorMsg(msg.length > 120 ? msg.slice(0, 120) + "..." : msg);
      }
      setTxStatus("failed");
    }
  }, [writeError]);

  // Wait for TX receipt
  const { data: receipt, isLoading: isWaiting } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    if (!receipt) return;
    if (receipt.status === "success") {
      if (pendingApproval) {
        // Approval done, now execute swap
        setPendingApproval(false);
        refetchAllowance().then(() => {
          executeSell();
        });
      } else {
        setTxStatus("success");
        setAmount("");
        // Refresh balances
        refetchEthBalance();
        refetchTokenBalance();
      }
    } else {
      setTxStatus("failed");
      setErrorMsg("Transaction reverted");
      setPendingApproval(false);
    }
  }, [receipt]);

  // Estimate output (apply ~1% price impact estimate since spot price != swap price)
  const PRICE_IMPACT_FACTOR = 0.99;
  const estimatedOutput = (() => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return null;
    if (tab === "buy") {
      if (!tokensPerEth) return null;
      return parseFloat(amount) * tokensPerEth * PRICE_IMPACT_FACTOR;
    } else {
      if (!ethPerToken) return null;
      return parseFloat(amount) * ethPerToken * PRICE_IMPACT_FACTOR;
    }
  })();

  const estimatedUsd = (() => {
    if (!estimatedOutput || !ethUsd) return null;
    if (tab === "buy") {
      // Output is tokens, input is ETH
      return parseFloat(amount) * ethUsd;
    } else {
      // Output is ETH
      return estimatedOutput * ethUsd;
    }
  })();

  const needsApproval = useCallback(() => {
    if (tab !== "sell" || !amount || !allowance) return false;
    try {
      const amountWei = parseEther(amount);
      return allowance < amountWei;
    } catch {
      return false;
    }
  }, [tab, amount, allowance]);

  const executeBuy = useCallback(() => {
    if (!amount) return;
    try {
      const ethAmount = parseEther(amount);
      // Apply slippage + extra 2% buffer for price impact (spot price != swap price)
      const minTokensOut = estimatedOutput
        ? parseEther(String(Math.max(0, estimatedOutput * (1 - slippage / 100) * 0.98)))
        : 0n;

      setTxStatus("pending");
      setTxHash(undefined);
      setErrorMsg("");
      resetWrite();

      writeContract({
        address: CONTRACTS.SWAP_ROUTER as `0x${string}`,
        abi: SWAP_ROUTER_ABI,
        functionName: "buyTokens",
        args: [tokenAddress, minTokensOut],
        value: ethAmount,
      });
    } catch (e: any) {
      setTxStatus("failed");
      setErrorMsg(e.message?.slice(0, 120) || "Failed to submit");
    }
  }, [amount, estimatedOutput, slippage, tokenAddress, writeContract, resetWrite]);

  const executeSell = useCallback(() => {
    if (!amount) return;
    try {
      const tokenAmount = parseEther(amount);
      // Apply slippage + extra 2% buffer for price impact
      const minEthOut = estimatedOutput
        ? parseEther(String(Math.max(0, estimatedOutput * (1 - slippage / 100) * 0.98)))
        : 0n;

      setTxStatus("pending");
      setTxHash(undefined);
      setErrorMsg("");
      resetWrite();

      writeContract({
        address: CONTRACTS.SWAP_ROUTER as `0x${string}`,
        abi: SWAP_ROUTER_ABI,
        functionName: "sellTokens",
        args: [tokenAddress, tokenAmount, minEthOut],
      });
    } catch (e: any) {
      setTxStatus("failed");
      setErrorMsg(e.message?.slice(0, 120) || "Failed to submit");
    }
  }, [amount, estimatedOutput, slippage, tokenAddress, writeContract, resetWrite]);

  const handleApprove = useCallback(() => {
    setTxStatus("approving");
    setTxHash(undefined);
    setErrorMsg("");
    setPendingApproval(true);
    resetWrite();

    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.SWAP_ROUTER as `0x${string}`, maxUint256],
    });
  }, [tokenAddress, writeContract, resetWrite]);

  const handleSwap = () => {
    setErrorMsg("");
    if (tab === "buy") {
      executeBuy();
    } else {
      if (needsApproval()) {
        handleApprove();
      } else {
        executeSell();
      }
    }
  };

  const resetState = () => {
    setTxStatus("idle");
    setTxHash(undefined);
    setErrorMsg("");
    setPendingApproval(false);
    resetWrite();
  };

  const isProcessing = txStatus === "pending" || txStatus === "approving" || isWaiting;
  const formattedEthBalance = ethBalance ? parseFloat(formatEther(ethBalance.value)).toFixed(4) : "0";
  const formattedTokenBalance = tokenBalance ? parseFloat(formatEther(tokenBalance as bigint)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";

  return (
    <div className="border border-green-900/50 bg-black/40 p-6 space-y-5">
      <h2 className="text-green-500 text-sm font-semibold uppercase tracking-wider">🔄 Swap</h2>

      {/* Tab Selector */}
      <div className="flex border border-green-900/50">
        <button
          onClick={() => { setTab("buy"); resetState(); setAmount(""); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
            tab === "buy"
              ? "bg-green-600/25 text-green-300 border-b-2 border-green-400"
              : "text-green-700 hover:text-green-500"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setTab("sell"); resetState(); setAmount(""); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
            tab === "sell"
              ? "bg-red-600/15 text-red-300 border-b-2 border-red-400"
              : "text-green-700 hover:text-green-500"
          }`}
        >
          Sell
        </button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-green-600 text-sm">Connect your wallet to trade</p>
          <p className="text-green-800 text-xs">Supports MetaMask, Coinbase Wallet, and other injected wallets</p>
        </div>
      ) : (
        <>
          {/* Balances */}
          <div className="flex justify-between text-xs">
            <span className="text-green-700">
              ETH: <span className="text-green-500 font-mono">{formattedEthBalance}</span>
            </span>
            <span className="text-green-700">
              ${tokenSymbol}: <span className="text-green-500 font-mono">{formattedTokenBalance}</span>
            </span>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-green-600 text-xs uppercase tracking-wider">
                {tab === "buy" ? "ETH to spend" : `${tokenSymbol} to sell`}
              </label>
              <button
                onClick={() => {
                  if (tab === "buy" && ethBalance) {
                    // Leave some gas
                    const max = ethBalance.value > parseEther("0.001")
                      ? ethBalance.value - parseEther("0.001")
                      : 0n;
                    setAmount(formatEther(max));
                  } else if (tab === "sell" && tokenBalance) {
                    setAmount(formatEther(tokenBalance as bigint));
                  }
                }}
                className="text-green-700 hover:text-green-400 text-xs transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); resetState(); }}
                placeholder={tab === "buy" ? "0.01" : "1000000"}
                step="any"
                min="0"
                className="w-full bg-black/60 border border-green-900/50 text-green-300 text-lg px-4 py-3 pr-16 font-mono focus:outline-none focus:border-green-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 text-sm font-mono">
                {tab === "buy" ? "ETH" : tokenSymbol}
              </span>
            </div>
          </div>

          {/* Estimated Output */}
          {estimatedOutput !== null && (
            <div className="bg-green-900/10 border border-green-900/30 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">You receive (est.)</span>
                <span className="text-green-300 font-mono">
                  {tab === "buy"
                    ? `${estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tokenSymbol}`
                    : `${estimatedOutput.toFixed(6)} ETH`
                  }
                </span>
              </div>
              {estimatedUsd !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-green-800">≈ USD value</span>
                  <span className="text-green-700 font-mono">${estimatedUsd.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Slippage */}
          <SlippageSelector slippage={slippage} onChange={setSlippage} />

          {/* Action Button */}
          <button
            onClick={handleSwap}
            disabled={isProcessing || !amount || parseFloat(amount || "0") <= 0}
            className={`w-full py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === "buy"
                ? "bg-green-600/25 border-2 border-green-500/50 text-green-300 hover:bg-green-600/35 hover:text-green-200"
                : "bg-red-600/20 border-2 border-red-500/40 text-red-300 hover:bg-red-600/30 hover:text-red-200"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {txStatus === "approving" ? "Approving..." : "Confirming..."}
              </span>
            ) : tab === "buy" ? (
              `Buy ${tokenSymbol}`
            ) : needsApproval() ? (
              `Approve & Sell ${tokenSymbol}`
            ) : (
              `Sell ${tokenSymbol}`
            )}
          </button>

          {/* TX Status */}
          {txStatus === "success" && txHash && (
            <div className="bg-green-900/20 border border-green-600/40 p-3 space-y-1">
              <p className="text-green-400 text-sm font-semibold">✅ Transaction Successful!</p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-300 text-xs font-mono break-all transition-colors"
              >
                View on BaseScan ↗
              </a>
            </div>
          )}

          {txStatus === "failed" && (
            <div className="bg-red-900/20 border border-red-600/40 p-3 space-y-1">
              <p className="text-red-400 text-sm font-semibold">❌ Transaction Failed</p>
              {errorMsg && <p className="text-red-500/70 text-xs break-all">{errorMsg}</p>}
              <button
                onClick={resetState}
                className="text-red-400 hover:text-red-300 text-xs underline transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
