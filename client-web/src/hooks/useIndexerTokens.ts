/**
 * Hook to fetch token data from the PumpClaw indexer API.
 * Falls back gracefully - if API is down, returns null so the component
 * can use on-chain data instead.
 */
import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "https://api.pumpclaw.com/api/v1";
const REFRESH_INTERVAL = 30_000; // 30s

export interface IndexerTokenPrice {
  ethPerToken: number | null;
  usdPerToken: number | null;
  mcapUsd: number | null;
}

export interface IndexerTokenVolume {
  volumeEth: number;
  volumeUsd: number;
  txns: number;
  buys: number;
  sells: number;
}

export interface IndexerToken {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  imageUrl: string;
  websiteUrl: string;
  totalSupply: string;
  initialFdv: string;
  createdAt: number;
  blockNumber: number;
  price: IndexerTokenPrice;
  volume24h: IndexerTokenVolume;
  priceChange24h: number | null;
}

interface IndexerResponse {
  tokens: IndexerToken[];
  total: number;
  lastSynced: number;
  currentBlock: number;
}

interface UseIndexerTokensResult {
  tokens: IndexerToken[] | null;
  total: number;
  loading: boolean;
  error: string | null;
  lastSynced: number;
  refetch: () => void;
}

let cachedData: Map<string, IndexerResponse> = new Map();
let lastFetchTime: Map<string, number> = new Map();

async function fetchFromApi(sort: string): Promise<IndexerResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/tokens?sort=${sort}&limit=200`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedData.set(sort, data);
    lastFetchTime.set(sort, Date.now());
    return data;
  } catch {
    // API down - return cached data if available
    return cachedData.get(sort) ?? null;
  }
}

export function useIndexerTokens(sort: string = "newest"): UseIndexerTokensResult {
  const cached = cachedData.get(sort);
  const [data, setData] = useState<IndexerResponse | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const sortRef = useRef(sort);
  sortRef.current = sort;

  // Manual refetch (user-triggered) - shows loading
  const refetch = useCallback(() => {
    setLoading(true);
    fetchFromApi(sortRef.current).then((result) => {
      if (result) {
        setData(result);
        setError(null);
      } else {
        setError("API unavailable");
      }
      setLoading(false);
    });
  }, []);

  // Background refresh - silent, no loading state
  const silentRefresh = useCallback(() => {
    fetchFromApi(sortRef.current).then((result) => {
      if (result) {
        setData(result);
        setError(null);
      }
      // On failure, keep existing data (no flicker)
    });
  }, []);

  useEffect(() => {
    const c = cachedData.get(sort);
    const t = lastFetchTime.get(sort) ?? 0;

    if (c && Date.now() - t < 10_000) {
      // Fresh cache - use it, no fetch
      setData(c);
      setLoading(false);
    } else if (c) {
      // Stale cache - show it immediately, refresh in background
      setData(c);
      setLoading(false);
      silentRefresh();
    } else {
      // No cache - full loading
      refetch();
    }

    const interval = setInterval(silentRefresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [sort, refetch, silentRefresh]);

  return {
    tokens: data?.tokens ?? null,
    total: data?.total ?? 0,
    loading,
    error,
    lastSynced: data?.lastSynced ?? 0,
    refetch,
  };
}
