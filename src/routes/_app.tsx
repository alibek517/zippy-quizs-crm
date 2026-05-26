import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMe } from "@/lib/zippy.functions";
import { Button } from "@/components/ui/button";
import logo from "@/assets/zippy-logo.webp";
import { LogOut, LayoutDashboard, Settings, Users, History } from "lucide-react";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/" });
  },
  component: AppLayout,
});

function AppLayout() {
  const fetchMe = useServerFn(getMe);
  const navigate = useNavigate();
  // Fetch `me` only on the client to avoid SSR serverFn auth issues where the
  // Authorization header isn't available. This prevents ambiguous admin/user
  // detection during server render and avoids unexpected redirects after updates.
  const [me, setMe] = useState<any | undefined>(undefined);
  useEffect(() => {
    let mounted = true;
    fetchMe()
      .then((d) => {
        if (!mounted) return;
        setMe(d);
      })
      .catch(() => {
        if (!mounted) return;
        setMe(null);
      });
    return () => {
      mounted = false;
    };
  }, [fetchMe]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <header className="w-full bg-white border-b border-black p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Zippy" className="h-10 w-10 rounded-full" />
          <div>
            <div className="font-bold text-black">Zippy</div>
            <div className="text-xs text-black/70">reliable service</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-black/80">
            {me?.profile?.full_name || me?.profile?.username}
            {me?.isAdmin && <span className="ml-1">(admin)</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut size={16} />
          </Button>
        </div>
      </header>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
