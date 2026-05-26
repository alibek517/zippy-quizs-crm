import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getMyDashboard, getMe } from "@/lib/zippy.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminTests } from "./admin/index";
import { AdminUsers } from "./admin/users";
import { AdminHistory } from "./admin/history";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const fetchDash = useServerFn(getMyDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });

  // Fetch `me` client-side so we can show admin-only controls inside the dashboard
  const fetchMe = useServerFn(getMe);
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

  if (isLoading) return <div className="text-muted-foreground">Yuklanmoqda...</div>;
  const s = data?.stats ?? { attempts: 0, avg: 0, correct: 0, wrong: 0 };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-black">Boshqaruv paneli</h1>
        <p className="text-sm text-black/60">Profilingiz va biriktirilgan testlar</p>
      </div>

      {me?.isAdmin && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-1 text-black">Admin Panel</h2>
          <Accordion type="single" collapsible defaultValue="users">
            <AccordionItem value="users">
              <AccordionTrigger>Foydalanuvchilar</AccordionTrigger>
              <AccordionContent>
                <div className="bg-white border border-black rounded p-4"><AdminUsers /></div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="history">
              <AccordionTrigger>Tarix</AccordionTrigger>
              <AccordionContent>
                <div className="bg-white border border-black rounded p-4"><AdminHistory /></div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tests">
              <AccordionTrigger>Testlar</AccordionTrigger>
              <AccordionContent>
                <div className="bg-white border border-black rounded p-4"><AdminTests /></div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Urinishlar" value={s.attempts} />
        <Stat label="O'rtacha %" value={`${s.avg}%`} />
        <Stat label="To'g'ri" value={s.correct} />
        <Stat label="Xato" value={s.wrong} />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Biriktirilgan testlar</h2>
        {data?.assignments.length === 0 ? (
          <Card className="p-6 text-muted-foreground">Sizga hozircha test biriktirilmagan</Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.assignments.map((a: any) => (
              <Card key={a.test_id} className="p-5">
                <div className="text-xs text-muted-foreground">
                  {a.tests?.stages?.sections?.name} · {a.tests?.stages?.name}
                </div>
                <div className="font-semibold mt-1">{a.tests?.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.tests?.duration_minutes} daqiqa</div>
                <Link to="/test/$id" params={{ id: a.test_id }}>
                  <Button className="w-full mt-4">Boshlash</Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Tarix</h2>
        {data?.attempts.length === 0 ? (
          <Card className="p-6 text-muted-foreground">Hali urinish yo'q</Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-auto">
              <table className="w-full text-sm min-w-[640px]">
                 <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-black/70">Test</th>
                  <th className="text-left p-3 text-black/70">Sana</th>
                  <th className="text-left p-3 text-black/70">Natija</th>
                  <th className="text-left p-3 text-black/70">T/X</th>
                  <th className="text-left p-3 text-black/70"></th>
                </tr>
              </thead>
              <tbody>
                {data?.attempts.map((a: any) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="p-3">{a.tests?.title}</td>
                    <td className="p-3 text-muted-foreground">{new Date(a.started_at).toLocaleString()}</td>
                    <td className="p-3 text-primary">{a.finished_at ? `${a.score_percent}%` : "—"}</td>
                    <td className="p-3">{a.correct_count}/{a.wrong_count}</td>
                    <td className="p-3">
                      {a.finished_at && (
                        <Link to="/result/$id" params={{ id: a.id }} className="text-primary hover:underline">Ko'rish</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-black/60">{label}</div>
      <div className="text-3xl font-bold mt-1" style={{ background: 'var(--gradient-gold)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{value}</div>
    </Card>
  );
}
