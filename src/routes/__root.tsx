import { createRootRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios";
import Navbar from "@/components/navbar";
import { useCompany } from "@/lib/hooks/useCompany";
import { supabase } from "@/lib/supabase";

const RootComponent = () => {
  useCompany();

  return (
    <div className="flex h-screen flex-col">
      {/* <Navbar /> */}
      <main className="min-h-0 flex-1 overflow-auto">
        <Outlet />
      </main>
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
