import "@fontsource-variable/public-sans";
import "@fontsource-variable/space-grotesk";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ApiError } from "./api/client";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The data only changes when someone re-seeds, so results stay "fresh"
      // for a while: stepping back to an earlier filter (or the back button)
      // shows it instantly instead of refetching.
      staleTime: 30_000,
      refetchOnWindowFocus: false,
     
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
