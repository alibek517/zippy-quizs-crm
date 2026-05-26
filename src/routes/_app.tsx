import { createFileRoute, redirect, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-sidebar border-r border-sidebar-border p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-6 px-2">
          <img src={logo} alt="Zippy" className="h-10 w-10 rounded-full" />
          <div>
            <div className="font-bold gold-text text-lg">Zippy</div>
            <div className="text-xs text-muted-foreground">reliable service</div>
          </div>
        </div>
        <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sm" activeProps={{ className: "bg-sidebar-accent text-primary" }}>
          <LayoutDashboard size={16} /> Boshqaruv
        </Link>
        {me?.isAdmin && (
          <>
            <Link to="/admin" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sm" activeProps={{ className: "bg-sidebar-accent text-primary" }}>
              <Settings size={16} /> Testlar
            </Link>
            <Link to="/admin/users" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sm" activeProps={{ className: "bg-sidebar-accent text-primary" }}>
              <Users size={16} /> Foydalanuvchilar
            </Link>
            <Link to="/admin/history" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-sidebar-accent text-sm" activeProps={{ className: "bg-sidebar-accent text-primary" }}>
              <History size={16} /> Tarix
            </Link>
          </>
        )}
        <div className="mt-auto">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {me?.profile?.full_name || me?.profile?.username}
            {me?.isAdmin && <span className="ml-1 text-primary">(admin)</span>}
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start">
            <LogOut size={16} /> Chiqish
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
