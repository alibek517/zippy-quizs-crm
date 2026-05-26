import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminGetHistory } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/admin/history")({
  component: AdminHistory,
});

export function AdminHistory() {
  const fn = useServerFn(adminGetHistory);
  const { data } = useQuery({ queryKey: ["adminHistory"], queryFn: () => fn() });

  return (
    <div className="space-y-6">
  <h1 className="text-3xl font-bold text-black">Tarix</h1>

      <div>
        <h2 className="text-lg font-semibold mb-2">Barcha urinishlar</h2>
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="text-left p-3">Foydalanuvchi</th>
              <th className="text-left p-3">Test</th>
              <th className="text-left p-3">Sana</th>
              <th className="text-left p-3">Foiz</th>
              <th className="text-left p-3">T/X</th>
              <th className="text-left p-3">FS</th>
              <th className="text-left p-3">Holat</th>
            </tr></thead>
            <tbody>
              {data?.attempts.map((a: any) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3">{a.profiles?.full_name || a.profiles?.username}</td>
                  <td className="p-3">{a.tests?.title}</td>
                  <td className="p-3 text-muted-foreground">{new Date(a.started_at).toLocaleString()}</td>
                  <td className="p-3 text-primary">{a.finished_at ? `${a.score_percent}%` : "—"}</td>
                  <td className="p-3">{a.correct_count}/{a.wrong_count}</td>
                  <td className="p-3">{a.fullscreen_exits}</td>
                  <td className="p-3">{a.auto_submitted ? <span className="text-destructive text-xs">Avto</span> : "OK"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Fullscreen ogohlantirishlar</h2>
        <Card className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>
              <th className="text-left p-3">Foydalanuvchi</th>
              <th className="text-left p-3">#</th>
              <th className="text-left p-3">Sana</th>
            </tr></thead>
            <tbody>
              {data?.warnings.map((w: any) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="p-3">{w.profiles?.username}</td>
                  <td className="p-3 text-destructive">{w.warning_number}</td>
                  <td className="p-3 text-muted-foreground">{new Date(w.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
