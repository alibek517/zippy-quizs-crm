import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapAdmin, resolveLogin } from "@/lib/zippy.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/zippy-logo.webp";

export const Route = createFileRoute("/")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const bootstrap = useServerFn(bootstrapAdmin);
  const resolve = useServerFn(resolveLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    bootstrap().catch(() => {});
    // Client-side redirect: if session exists (user already signed in), go to dashboard.
    // We do this in useEffect so SSR doesn't try to run an auth check without the
    // browser's auth token and cause incorrect redirects.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [bootstrap]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { email } = await resolve({ data: { username } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Xush kelibsiz!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Login xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-white text-black">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Zippy" className="h-20 w-20 rounded-full border border-gray-200" />
        </div>
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
          <h1 className="text-3xl font-bold text-center" style={{ background: "var(--gradient-gold)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Zippy CRM</h1>
          <p className="text-center text-sm text-black/70 mt-1">reliable service</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="u">Foydalanuvchi nomi</Label>
              <Input id="u" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div>
              <Label htmlFor="p">Parol</Label>
              <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-black text-white hover:brightness-90">
              {loading ? "Kirilmoqda..." : "Kirish"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
