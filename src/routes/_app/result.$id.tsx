import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAttempt } from "@/lib/zippy.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/result/$id")({
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getAttempt);
  const { data, isLoading } = useQuery({
    queryKey: ["attempt", id],
    queryFn: () => fn({ data: { attemptId: id } }),
  });

  if (isLoading || !data) return <div>Yuklanmoqda...</div>;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-3xl font-bold gold-text">Natija</h1>
        <p className="text-muted-foreground">{(data as any).tests?.title}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Foiz</div><div className="text-2xl font-bold gold-text">{data.score_percent}%</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">To'g'ri</div><div className="text-2xl font-bold text-primary">{data.correct_count}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Xato</div><div className="text-2xl font-bold text-destructive">{data.wrong_count}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Jami</div><div className="text-2xl font-bold">{data.total_questions}</div></Card>
      </div>
      {data.auto_submitted && (
        <Card className="p-4 border-destructive/50">
          <div className="text-sm text-destructive">⚠ Test avtomatik yakunlandi (vaqt tugadi yoki to'liq ekrandan 3-marta chiqildi)</div>
        </Card>
      )}
      <Link to="/dashboard"><Button>Boshqaruvga qaytish</Button></Link>
    </div>
  );
}
