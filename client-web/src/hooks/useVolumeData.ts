import { useState, useEffect } from "react";

interface VolumeEntry {
  address: string;
  symbol: string;
  priceUsd: string | null;
  volume24h: number;
  txns24h: { buys: number; sells: number };
  fdvUsd: number | null;
  liquidityUsd: number | null;
  priceChange24h: number | null;
  pairUrl: string | null;
}

interface VolumeData {
  generatedAt: string;
  totalTokens: number;
  activeTokens: number;
  totalVolume24h: number;
  totalTxns24h: number;
  hotTokens: VolumeEntry[];
  tokens: VolumeEntry[];
}

const VOLUME_API = "/api/v1/volume.json";

let cachedData: VolumeData | null = null;
let fetchPromise: Promise<VolumeData | null> | null = null;

async function fetchVolumeData(): Promise<VolumeData | null> {
  try {
    const res = await fetch(VOLUME_API);
    if (!res.ok) return null;
    const data = await res.json();
    cachedData = data;
    return data;
  } catch {
    return null;
  }
}

export function useVolumeData() {
  const [data, setData] = useState<VolumeData | null>(cachedData);
  const [loading, setLoading] = useState(!cachedData);

  useEffect(() => {
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchVolumeData();
    }

    fetchPromise.then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

/**
 * Get volume info for a specific token address.
 */
export function useTokenVolume(address: string) {
  const { data, loading } = useVolumeData();

  if (!data || loading) {
    return { volume: null, loading };
  }

  const entry = data.tokens.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );

  return { volume: entry || null, loading: false };
}
