/**
 * Custom render that wraps components in necessary providers.
 *
 * Since wagmi is fully mocked at module level, we don't need
 * WagmiProvider or QueryClientProvider here. This is just a
 * convenience wrapper in case we need shared context later.
 */

import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

function Wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  return render(ui, { wrapper: Wrapper, ...options });
}
