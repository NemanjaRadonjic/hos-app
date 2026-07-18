import {
  createRootRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";

import { useCompany } from "@/lib/hooks/useCompany";
import { supabase } from "@/lib/supabase";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { health } from "@/lib/helpers/health-check";
import { HealthToast } from "@/components/health-toast";
import Navbar from "@/components/navbar";

const RootComponent = () => {
  useCompany();

  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const isDriverRoute = pathname.startsWith("/drivers/");

  useEffect(() => {
    return health.startAutoPing();
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {!isDriverRoute && <Navbar />}
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
        <Toaster richColors offset={{ bottom: 62 }} />
      </main>
      <HealthToast />
    </div>
  );
};

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session && location.pathname !== "/login") {
      throw redirect({ to: "/login" });
    }
  },
  component: RootComponent,
  notFoundComponent: () => <div>404</div>,
});
