import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startTest, submitTest, logFullscreenWarning } from "@/lib/zippy.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/test/$id")({
  component: TestRunner,
});

function TestRunner() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const startFn = useServerFn(startTest);
  const submitFn = useServerFn(submitTest);
  const fsWarnFn = useServerFn(logFullscreenWarning);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [fsWarnings, setFsWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);
  const attemptIdRef = useRef<string>("");

  // Init
  useEffect(() => {
    startFn({ data: { testId: id } })
      .then((d) => {
        setData(d);
        attemptIdRef.current = d.attemptId;
        setSecondsLeft(d.duration_minutes * 60);
        setLoading(false);
      })
      .catch((e) => {
        toast.error(e.message);
        navigate({ to: "/dashboard" });
      });
  }, [id, startFn, navigate]);

  const handleSubmit = async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await submitFn({ data: { attemptId: attemptIdRef.current, answers, autoSubmitted: auto } });
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      navigate({ to: "/result/$id", params: { id: res.attemptId } });
    } catch (e: any) {
      toast.error(e.message);
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  // Timer
  useEffect(() => {
    if (!data) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Fullscreen handler
  useEffect(() => {
    if (!data) return;
    const enter = () => containerRef.current?.requestFullscreen().catch(() => {});
    enter();
    const onFsChange = async () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        const next = fsWarnings + 1;
        setFsWarnings(next);
        setShowWarning(true);
        try {
          await fsWarnFn({ data: { attemptId: attemptIdRef.current, warningNumber: next } });
        } catch {}
        if (next >= 3) {
          toast.error("3-marta chiqdingiz, test avtomatik tugatildi");
          handleSubmit(true);
        }
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, fsWarnings]);

  if (loading) return <div className="p-8">Test tayyorlanmoqda...</div>;
  if (!data) return null;

  const q = data.questions[current];
  const answeredCount = Object.keys(answers).length;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div ref={containerRef} className="min-h-screen bg-background p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-black">{data.title}</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">{answeredCount}/{data.questions.length}</div>
            <div className="px-3 py-1 rounded-md bg-primary/10 text-primary font-mono font-bold">{mm}:{ss}</div>
            <div className="text-xs text-muted-foreground">FS chiqishlar: {fsWarnings}/3</div>
          </div>
        </div>

        <Card className="p-6">
          <div className="text-sm text-muted-foreground mb-2">Savol {current + 1} / {data.questions.length}</div>
          {q.text && <div className="text-lg mb-3">{q.text}</div>}
          {q.image_url && <img src={q.image_url} alt="" className="max-h-80 rounded-md mb-4" />}

          <div className="space-y-2 mt-4">
            {q.options.map((o: any, idx: number) => {
              const sel = answers[q.id] === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => setAnswers({ ...answers, [q.id]: o.id })}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    sel ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-primary">{String.fromCharCode(65 + idx)}.</span>
                    <div className="flex-1">
                      {o.text && <div>{o.text}</div>}
                      {o.image_url && <img src={o.image_url} alt="" className="max-h-40 rounded mt-2" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="flex items-center justify-between mt-4">
          <Button variant="secondary" onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
            Oldingi
          </Button>
          <div className="flex gap-2 flex-wrap justify-center">
            {data.questions.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-9 h-9 rounded-md text-sm font-medium ${
                  i === current
                    ? "bg-primary text-primary-foreground"
                    : answers[data.questions[i].id]
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          {current < data.questions.length - 1 ? (
            <Button onClick={() => setCurrent(current + 1)}>Keyingi</Button>
          ) : (
            <Button onClick={() => handleSubmit(false)} disabled={submitting}>
              {submitting ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
          )}
        </div>
      </div>

      {showWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md">
            <h2 className="text-xl font-bold text-destructive">Ogohlantirish #{fsWarnings}/3</h2>
            <p className="mt-2 text-sm">
              Siz to'liq ekran rejimidan chiqdingiz. Adminga xabar berildi.
              {fsWarnings >= 3
                ? " Test avtomatik tugatildi."
                : ` Yana ${3 - fsWarnings} marta chiqsangiz test avtomatik yakunlanadi.`}
            </p>
            {fsWarnings < 3 && (
              <Button
                className="mt-4 w-full"
                onClick={async () => {
                  setShowWarning(false);
                  await containerRef.current?.requestFullscreen().catch(() => {});
                }}
              >
                To'liq ekranga qaytish
              </Button>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
