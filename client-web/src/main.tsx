import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ContextProvider from "./context";
import App from "./App";
import "./assets/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ContextProvider>
      <App />
    </ContextProvider>
  </StrictMode>
);
