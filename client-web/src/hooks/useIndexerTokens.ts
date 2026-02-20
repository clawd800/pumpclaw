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

let cachedData: IndexerResponse | null = null;
let lastFetchTime = 0;

async function fetchFromApi(sort: string): Promise<IndexerResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/tokens?sort=${sort}&limit=200`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    cachedData = data;
    lastFetchTime = Date.now();
    return data;
  } catch {
    // API down - return cached data if available
    return cachedData;
  }
}

export function useIndexerTokens(sort: string = "newest"): UseIndexerTokensResult {
  const [data, setData] = useState<IndexerResponse | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);
  const sortRef = useRef(sort);
  sortRef.current = sort;

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

  useEffect(() => {
    // Use cached data if fresh enough
    if (cachedData && Date.now() - lastFetchTime < 10_000) {
      setData(cachedData);
      setLoading(false);
    } else {
      refetch();
    }

    const interval = setInterval(refetch, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refetch]);

  // Re-fetch when sort changes
  useEffect(() => {
    refetch();
  }, [sort, refetch]);

  return {
    tokens: data?.tokens ?? null,
    total: data?.total ?? 0,
    loading,
    error,
    lastSynced: data?.lastSynced ?? 0,
    refetch,
  };
}
