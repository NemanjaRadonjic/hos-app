import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import "./index.css";
import { Settings } from "luxon";
import { TZ_MAP } from "./lib/maps";
import { TooltipProvider } from "./components/ui/tooltip";

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

Settings.defaultZone = TZ_MAP["CT"];

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>,
);
