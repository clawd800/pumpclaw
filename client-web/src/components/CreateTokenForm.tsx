import { useState } from "react";
import { useAccount } from "wagmi";
import { useCreateToken } from "@/hooks/useCreateToken";
import { formatEther } from "viem";
import { MIN_ETH } from "@/configs/constants";

export default function CreateTokenForm({ onSuccess }: { onSuccess?: () => void }) {
  const { isConnected } = useAccount();
  const { createToken, isPending, isConfirming, isSuccess, error, hash } = useCreateToken();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ethAmount, setEthAmount] = useState("0.001");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !symbol || !ethAmount) return;

    await createToken({
      name,
      symbol,
      imageUrl: imageUrl || "",
      ethAmount,
    });
  };

  // Reset form on success
  if (isSuccess && name) {
    setName("");
    setSymbol("");
    setImageUrl("");
    setEthAmount("0.001");
    onSuccess?.();
  }

  const minEth = formatEther(MIN_ETH);

  return (
    <div className="border border-green-900/50 bg-black/30 p-6">
      <h2 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
        <span>🚀</span> Launch Token
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-green-600 mb-1">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Token"
            className="w-full px-3 py-2 bg-black/50 border border-green-900/50 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-green-600 mb-1">Symbol *</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="AWSM"
            maxLength={10}
            className="w-full px-3 py-2 bg-black/50 border border-green-900/50 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none uppercase"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-green-600 mb-1">Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/token.png"
            className="w-full px-3 py-2 bg-black/50 border border-green-900/50 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm text-green-600 mb-1">
            Initial ETH (min {minEth}) *
          </label>
          <input
            type="number"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            placeholder="0.001"
            step="0.0001"
            min={minEth}
            className="w-full px-3 py-2 bg-black/50 border border-green-900/50 text-green-400 placeholder-green-800 focus:border-green-500 focus:outline-none"
            required
          />
          <p className="text-xs text-green-700 mt-1">
            This ETH pairs with your tokens for initial liquidity
          </p>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-900/50 p-2">
            {error.message}
          </div>
        )}

        {hash && (
          <div className="text-green-400 text-sm bg-green-900/20 border border-green-900/50 p-2">
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-300"
            >
              View transaction →
            </a>
          </div>
        )}

        <button
          type="submit"
          disabled={!isConnected || isPending || isConfirming}
          className="w-full py-3 bg-green-500 text-black font-bold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!isConnected
            ? "Connect Wallet"
            : isPending
            ? "Confirm in Wallet..."
            : isConfirming
            ? "Deploying..."
            : "🦞 Launch Token"}
        </button>
      </form>

      <div className="mt-4 text-xs text-green-700 space-y-1">
        <p>• 1B tokens minted (100% to liquidity)</p>
        <p>• LP permanently locked</p>
        <p>• 1% swap fee (80% to you, 20% protocol)</p>
      </div>
    </div>
  );
}
