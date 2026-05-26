import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminGetTree, adminCreateSection, adminDeleteSection,
  adminCreateStage, adminDeleteStage,
  adminCreateTest, adminDeleteTest, adminGetTest,
  adminCreateQuestion, adminDeleteQuestion, adminUploadImage,
} from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminTests,
});

function AdminTests() {
  const qc = useQueryClient();
  const getTree = useServerFn(adminGetTree);
  const { data } = useQuery({ queryKey: ["adminTree"], queryFn: () => getTree() });

  const createSec = useServerFn(adminCreateSection);
  const delSec = useServerFn(adminDeleteSection);
  const createSt = useServerFn(adminCreateStage);
  const delSt = useServerFn(adminDeleteStage);
  const createT = useServerFn(adminCreateTest);
  const delT = useServerFn(adminDeleteTest);

  const [newSec, setNewSec] = useState("");
  const [openTestId, setOpenTestId] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["adminTree"] });

  const run = (p: Promise<any>, msg = "Bajarildi") =>
    p.then(() => { toast.success(msg); refresh(); }).catch((e) => toast.error(e.message));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold gold-text">Testlar boshqaruvi</h1>

      <Card className="p-4">
        <div className="flex gap-2">
          <Input placeholder="Yangi bo'lim nomi" value={newSec} onChange={(e) => setNewSec(e.target.value)} />
          <Button onClick={() => { if(newSec) run(createSec({data:{name:newSec}}), "Bo'lim qo'shildi").then(()=>setNewSec("")); }}>
            <Plus size={16} /> Bo'lim
          </Button>
        </div>
      </Card>

      {data?.sections.map((sec: any) => (
        <Card key={sec.id} className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{sec.name}</h2>
            <Button size="sm" variant="ghost" onClick={() => run(delSec({data:{id:sec.id}}), "O'chirildi")}>
              <Trash2 size={14} />
            </Button>
          </div>

          <StageAdder sectionId={sec.id} onAdd={(n) => run(createSt({data:{section_id:sec.id, name:n}}), "Bosqich qo'shildi")} />

          <div className="mt-3 space-y-3">
            {data.stages.filter((s:any) => s.section_id === sec.id).map((st:any) => (
              <div key={st.id} className="border border-border rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-primary">{st.name}</div>
                  <Button size="sm" variant="ghost" onClick={() => run(delSt({data:{id:st.id}}), "O'chirildi")}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <TestAdder onAdd={(title, dur) => run(createT({data:{stage_id:st.id, title, duration_minutes:dur}}), "Test yaratildi")} />
                <div className="mt-2 space-y-1">
                  {data.tests.filter((t:any) => t.stage_id === st.id).map((t:any) => (
                    <div key={t.id} className="flex items-center justify-between text-sm bg-muted/30 rounded p-2">
                      <button onClick={() => setOpenTestId(t.id === openTestId ? null : t.id)} className="text-left flex-1 hover:text-primary">
                        {t.title} <span className="text-muted-foreground">({t.duration_minutes} daq)</span>
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => run(delT({data:{id:t.id}}), "O'chirildi")}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {openTestId && <QuestionsManager testId={openTestId} onClose={() => setOpenTestId(null)} />}
    </div>
  );
}

function StageAdder({ sectionId, onAdd }: { sectionId: string; onAdd: (n: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex gap-2 mt-3">
      <Input placeholder="Bosqich nomi (Oson, O'rta, Qiyin)" value={v} onChange={(e) => setV(e.target.value)} />
      <Button size="sm" onClick={() => { if(v){ onAdd(v); setV(""); }}}>+ Bosqich</Button>
    </div>
  );
}

function TestAdder({ onAdd }: { onAdd: (title: string, dur: number) => void }) {
  const [title, setTitle] = useState("");
  const [dur, setDur] = useState(15);
  return (
    <div className="flex gap-2 mt-2">
      <Input placeholder="Test nomi" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Input type="number" min={1} className="w-24" value={dur} onChange={(e) => setDur(Number(e.target.value))} />
      <Button size="sm" onClick={() => { if(title){ onAdd(title, dur); setTitle(""); }}}>+ Test</Button>
    </div>
  );
}

function QuestionsManager({ testId, onClose }: { testId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const getTest = useServerFn(adminGetTest);
  const createQ = useServerFn(adminCreateQuestion);
  const delQ = useServerFn(adminDeleteQuestion);
  const upload = useServerFn(adminUploadImage);
  const { data, refetch } = useQuery({ queryKey: ["test", testId], queryFn: () => getTest({ data: { id: testId } }) });

  const [qText, setQText] = useState("");
  const [qImg, setQImg] = useState("");
  const [opts, setOpts] = useState([
    { text: "", image_url: "", is_correct: true },
    { text: "", image_url: "", is_correct: false },
    { text: "", image_url: "", is_correct: false },
    { text: "", image_url: "", is_correct: false },
  ]);

  const handleFile = async (file: File, cb: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const r = await upload({ data: { dataUrl: reader.result as string, filename: file.name } });
        cb(r.url);
        toast.success("Rasm yuklandi");
      } catch (e: any) { toast.error(e.message); }
    };
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    try {
      await createQ({ data: { test_id: testId, text: qText || null, image_url: qImg || null, options: opts.filter(o => o.text || o.image_url) } });
      toast.success("Savol qo'shildi");
      setQText(""); setQImg("");
      setOpts([{text:"",image_url:"",is_correct:true},{text:"",image_url:"",is_correct:false},{text:"",image_url:"",is_correct:false},{text:"",image_url:"",is_correct:false}]);
      refetch();
      qc.invalidateQueries({ queryKey: ["adminTree"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 overflow-auto p-4" onClick={onClose}>
      <Card className="max-w-4xl mx-auto p-6 my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold gold-text">{(data as any)?.title} — Savollar</h2>
          <Button variant="ghost" onClick={onClose}>Yopish</Button>
        </div>

        <div className="space-y-3 border border-border rounded-md p-4">
          <h3 className="font-semibold">Yangi savol</h3>
          <Label>Savol matni (ixtiyoriy)</Label>
          <textarea className="w-full p-2 rounded bg-input border border-border" rows={2} value={qText} onChange={(e) => setQText(e.target.value)} />
          <Label>Savol rasmi (ixtiyoriy)</Label>
          <div className="flex gap-2 items-center">
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], setQImg)} />
            {qImg && <img src={qImg} className="h-12 rounded" alt="" />}
          </div>

          <div className="space-y-2 mt-3">
            <Label>Variantlar (to'g'risini belgilang)</Label>
            {opts.map((o, i) => (
              <div key={i} className="flex gap-2 items-center border border-border rounded p-2">
                <input type="radio" checked={o.is_correct} onChange={() => setOpts(opts.map((x, j) => ({ ...x, is_correct: i === j })))} />
                <Input placeholder={`Variant ${String.fromCharCode(65+i)} matni`} value={o.text} onChange={(e) => setOpts(opts.map((x,j) => j===i ? {...x, text:e.target.value} : x))} />
                <input type="file" accept="image/*" className="text-xs w-32" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], (u) => setOpts(opts.map((x,j) => j===i ? {...x, image_url:u} : x)))} />
                {o.image_url && <img src={o.image_url} className="h-10 rounded" alt="" />}
              </div>
            ))}
          </div>
          <Button onClick={submit} className="w-full">Savolni saqlash</Button>
        </div>

        <div className="mt-6 space-y-2">
          <h3 className="font-semibold">Mavjud savollar ({(data as any)?.questions?.length ?? 0})</h3>
          {(data as any)?.questions?.map((q: any, i: number) => (
            <div key={q.id} className="border border-border rounded p-3 text-sm">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{i+1}. {q.text}</div>
                  {q.image_url && <img src={q.image_url} className="h-20 rounded mt-1" alt="" />}
                  <div className="text-xs text-muted-foreground mt-1">
                    {q.options?.map((o: any) => <span key={o.id} className={o.is_correct ? "text-primary mr-2" : "mr-2"}>{o.text || "[rasm]"}</span>)}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => delQ({data:{id:q.id}}).then(()=>refetch())}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
