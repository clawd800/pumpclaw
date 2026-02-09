import { useState, useEffect, useCallback } from "react";

export interface Route {
  page: "home" | "token";
  tokenAddress?: `0x${string}`;
}

function parseHash(): Route {
  const hash = window.location.hash.slice(1); // Remove #
  
  // Match /#/token/0x...
  const tokenMatch = hash.match(/^\/token\/(0x[a-fA-F0-9]{40})$/i);
  if (tokenMatch) {
    return { page: "token", tokenAddress: tokenMatch[1] as `0x${string}` };
  }
  
  return { page: "home" };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  const goHome = useCallback(() => {
    window.location.hash = "";
  }, []);

  return { route, navigate, goHome };
}
