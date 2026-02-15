import { useState, useEffect } from "react";

interface OGData {
  title?: string;
  description?: string;
  images?: string[];
  siteName?: string;
  favicon?: string;
}

export function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OGData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchPreview() {
      try {
        const res = await fetch(
          `https://fc.hunt.town/preview?url=${encodeURIComponent(url)}`
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (!cancelled) {
          // Only show if we got at least a title
          if (json.title || json.description || json.images?.length) {
            setData(json);
          } else {
            setError(true);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPreview();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="border border-red-900/30 bg-black/30 p-3 animate-pulse">
        <div className="h-3 bg-red-900/20 rounded w-1/3 mb-2" />
        <div className="h-3 bg-red-900/20 rounded w-2/3" />
      </div>
    );
  }

  if (error || !data) return null;

  const ogImage = data.images?.[0];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-red-900/30 bg-black/30 hover:bg-black/50 transition-colors overflow-hidden group"
    >
      <div className="flex">
        {/* Text content */}
        <div className="flex-1 min-w-0 p-3 space-y-1.5">
          {/* Favicon + site name */}
          {(data.favicon || data.siteName) && (
            <div className="flex items-center gap-1.5">
              {data.favicon && (
                <img
                  src={data.favicon}
                  alt=""
                  className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              {data.siteName && (
                <span className="text-neutral-500 text-xs truncate">
                  {data.siteName}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          {data.title && (
            <p className="text-orange-200 group-hover:text-orange-100 text-sm font-medium line-clamp-2 transition-colors">
              {data.title}
            </p>
          )}

          {/* Description */}
          {data.description && (
            <p className="text-neutral-500 text-xs line-clamp-2">
              {data.description}
            </p>
          )}
        </div>

        {/* OG Image thumbnail */}
        {ogImage && (
          <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-red-900/20">
            <img
              src={ogImage}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement?.style.setProperty("display", "none"); }}
            />
          </div>
        )}
      </div>
    </a>
  );
}
