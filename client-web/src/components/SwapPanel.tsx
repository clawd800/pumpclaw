import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSimulateContract, usePublicClient } from "wagmi";
import { parseEther, formatEther, maxUint256, keccak256, encodeAbiParameters, toHex } from "viem";
import { useQuery } from "@tanstack/react-query";
import { CONTRACTS } from "@/configs/constants";
import { SWAP_ROUTER_ABI, ERC20_ABI } from "@/configs/abis";
import { useEthUsdPrice } from "@/hooks/useTokenPrice";

// Compute ERC20 allowance storage slot (OpenZeppelin layout: _allowances at slot 1)
function allowanceSlot(owner: `0x${string}`, spender: `0x${string}`): `0x${string}` {
  const inner = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [owner, 1n]
    )
  );
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [spender, BigInt(inner)]
    )
  );
}

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
        className="flex items-center gap-1.5 text-neutral-500 hover:text-orange-400 transition-colors text-xs"
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
                    ? "bg-orange-600/30 border-orange-500/60 text-red-400"
                    : "bg-black/40 border-red-900/50 text-orange-500 hover:border-orange-500/40"
                }`}
              >
                {p}%
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`flex-1 py-1.5 text-xs font-medium border transition-all ${
                showCustom
                  ? "bg-orange-600/30 border-orange-500/60 text-red-400"
                  : "bg-black/40 border-red-900/50 text-orange-500 hover:border-orange-500/40"
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
                className="flex-1 bg-black/60 border border-red-900/50 text-red-400 text-sm px-3 py-1.5 font-mono focus:outline-none focus:border-orange-500/50"
              />
              <span className="text-orange-500 text-sm">%</span>
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
  const publicClient = usePublicClient();
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

  // Check if sell needs approval (must be defined before simulation hooks)
  const needsApproval = useCallback(() => {
    if (tab !== "sell" || !amount || !allowance) return false;
    try {
      const amountWei = parseEther(amount);
      return allowance < amountWei;
    } catch {
      return false;
    }
  }, [tab, amount, allowance]);

  // Simulate actual swap to get real output (includes price impact)
  const parsedAmount = (() => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return null;
    try { return parseEther(amount); } catch { return null; }
  })();

  // Simulate buyTokens via eth_call (stateOverride bypasses balance check)
  const { data: buySimulation, isFetching: isBuyEstimating } = useSimulateContract({
    address: CONTRACTS.SWAP_ROUTER as `0x${string}`,
    abi: SWAP_ROUTER_ABI,
    functionName: "buyTokens",
    args: [tokenAddress, 0n],
    value: parsedAmount ?? undefined,
    stateOverride: parsedAmount && address ? [
      { address, balance: parsedAmount + parseEther("10") },
    ] : undefined,
    query: { enabled: tab === "buy" && !!parsedAmount },
  } as any);

  // Sell estimation via direct publicClient call (reliable stateOverride bypass)
  const { data: sellEstimate, isFetching: isSellEstimating } = useQuery({
    queryKey: ['sellEstimate', tokenAddress, parsedAmount?.toString(), address],
    queryFn: async () => {
      if (!publicClient || !parsedAmount || !address) return null;
      try {
        const result = await publicClient.simulateContract({
          account: address,
          address: CONTRACTS.SWAP_ROUTER as `0x${string}`,
          abi: SWAP_ROUTER_ABI,
          functionName: 'sellTokens',
          args: [tokenAddress, parsedAmount, 0n],
          stateOverride: [{
            address: tokenAddress,
            stateDiff: {
              [allowanceSlot(address, CONTRACTS.SWAP_ROUTER as `0x${string}`)]: toHex(maxUint256, { size: 32 }),
            },
          }],
        });
        return result.result as bigint;
      } catch {
        try {
          const result = await publicClient.simulateContract({
            account: address,
            address: CONTRACTS.SWAP_ROUTER as `0x${string}`,
            abi: SWAP_ROUTER_ABI,
            functionName: 'sellTokens',
            args: [tokenAddress, parsedAmount, 0n],
          });
          return result.result as bigint;
        } catch {
          return null;
        }
      }
    },
    enabled: tab === 'sell' && !!parsedAmount && !!address && !!publicClient,
    retry: false,
  });

  const isEstimating = (tab === "buy" && isBuyEstimating) || (tab === "sell" && isSellEstimating);

  // Exact output from simulation
  const estimatedOutput = (() => {
    if (!parsedAmount) return null;
    if (tab === "buy" && buySimulation?.result !== undefined) {
      return parseFloat(formatEther(buySimulation.result as bigint));
    }
    if (tab === "sell" && sellEstimate != null) {
      return parseFloat(formatEther(sellEstimate));
    }
    return null;
  })();

  const estimatedOutputWei = (() => {
    if (!parsedAmount) return null;
    if (tab === "buy" && buySimulation?.result !== undefined) {
      return buySimulation.result as bigint;
    }
    if (tab === "sell" && sellEstimate != null) {
      return sellEstimate;
    }
    return null;
  })();

  const estimatedUsd = (() => {
    if (!estimatedOutput || !ethUsd) return null;
    if (tab === "buy") {
      return parseFloat(amount) * ethUsd;
    } else {
      return estimatedOutput * ethUsd;
    }
  })();

  const executeBuy = useCallback(() => {
    if (!amount) return;
    try {
      const ethAmount = parseEther(amount);
      // minTokensOut = simulated output * (1 - slippage%) — protects against frontrunning
      const minTokensOut = estimatedOutputWei
        ? (estimatedOutputWei * BigInt(Math.floor((1 - slippage / 100) * 10000))) / 10000n
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
  }, [amount, estimatedOutputWei, slippage, tokenAddress, writeContract, resetWrite]);

  const executeSell = useCallback(() => {
    if (!amount) return;
    try {
      const tokenAmount = parseEther(amount);
      // minEthOut = simulated output * (1 - slippage%) — protects against frontrunning
      const minEthOut = estimatedOutputWei
        ? (estimatedOutputWei * BigInt(Math.floor((1 - slippage / 100) * 10000))) / 10000n
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
  }, [amount, estimatedOutputWei, slippage, tokenAddress, writeContract, resetWrite]);

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

  // Insufficient balance checks
  const insufficientBalance = (() => {
    if (!parsedAmount) return false;
    if (tab === "buy") {
      return ethBalance ? parsedAmount > ethBalance.value : false;
    } else {
      return tokenBalance ? parsedAmount > (tokenBalance as bigint) : false;
    }
  })();

  return (
    <div className="border border-red-900/50 bg-black/40 p-6 space-y-5">
      <h2 className="text-orange-400 text-sm font-semibold uppercase tracking-wider">🔄 Swap</h2>

      {/* Tab Selector */}
      <div className="flex border border-red-900/50">
        <button
          onClick={() => { setTab("buy"); resetState(); setAmount(""); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
            tab === "buy"
              ? "bg-orange-600/25 text-orange-200 border-b-2 border-orange-400"
              : "text-neutral-500 hover:text-orange-400"
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setTab("sell"); resetState(); setAmount(""); }}
          className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
            tab === "sell"
              ? "bg-red-600/15 text-red-300 border-b-2 border-red-400"
              : "text-neutral-500 hover:text-orange-400"
          }`}
        >
          Sell
        </button>
      </div>

      {!isConnected ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-orange-500 text-sm">Connect your wallet to trade</p>
          <p className="text-neutral-600 text-xs">Supports MetaMask, Coinbase Wallet, and other injected wallets</p>
        </div>
      ) : (
        <>
          {/* Balances */}
          <div className="flex justify-between text-xs">
            <span className="text-neutral-500">
              ETH: <span className="text-orange-400 font-mono">{formattedEthBalance}</span>
            </span>
            <span className="text-neutral-500">
              ${tokenSymbol}: <span className="text-orange-400 font-mono">{formattedTokenBalance}</span>
            </span>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-orange-500 text-xs uppercase tracking-wider">
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
                className="text-neutral-500 hover:text-orange-300 text-xs transition-colors"
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
                className="w-full bg-black/60 border border-red-900/50 text-red-400 text-lg px-4 py-3 pr-16 font-mono focus:outline-none focus:border-orange-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 text-sm font-mono">
                {tab === "buy" ? "ETH" : tokenSymbol}
              </span>
            </div>
          </div>

          {/* Estimated Output */}
          {isEstimating && parsedAmount ? (
            <div className="bg-red-950/20 border border-red-900/30 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-orange-500">You receive (est.)</span>
                <span className="h-5 w-32 bg-red-900/30 rounded animate-pulse" />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-600">≈ USD value</span>
                <span className="h-4 w-20 bg-red-900/20 rounded animate-pulse" />
              </div>
            </div>
          ) : estimatedOutput !== null ? (
            <div className="bg-red-950/20 border border-red-900/30 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-orange-500">You receive (est.)</span>
                <span className="text-red-400 font-mono">
                  {tab === "buy"
                    ? `${estimatedOutput.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${tokenSymbol}`
                    : `${estimatedOutput.toFixed(6)} ETH`
                  }
                </span>
              </div>
              {estimatedUsd !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-600">≈ USD value</span>
                  <span className="text-neutral-500 font-mono">${estimatedUsd.toFixed(2)}</span>
                </div>
              )}
            </div>
          ) : null}

          {/* Slippage */}
          <SlippageSelector slippage={slippage} onChange={setSlippage} />

          {/* Action Button */}
          <button
            onClick={handleSwap}
            disabled={isProcessing || !amount || parseFloat(amount || "0") <= 0 || insufficientBalance}
            className={`w-full py-3.5 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              insufficientBalance
                ? "bg-red-900/20 border-2 border-red-800/50 text-red-400"
                : tab === "buy"
                  ? "bg-gradient-to-r from-red-600/25 to-orange-500/25 border-2 border-orange-500/50 text-orange-200 hover:from-red-600/35 hover:to-orange-500/35 hover:text-orange-100"
                  : "bg-red-600/20 border-2 border-red-500/40 text-red-300 hover:bg-red-600/30 hover:text-red-200"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {txStatus === "approving" ? "Approving..." : "Confirming..."}
              </span>
            ) : insufficientBalance ? (
              `Insufficient ${tab === "buy" ? "ETH" : tokenSymbol} balance`
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
            <div className="bg-orange-900/20 border border-orange-600/40 p-3 space-y-1">
              <p className="text-orange-300 text-sm font-semibold">✅ Transaction Successful!</p>
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-200 text-xs font-mono break-all transition-colors"
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
