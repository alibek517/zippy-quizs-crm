import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminListUsers, adminCreateUser, adminDeleteUser,
  adminAssignTest, adminUnassignTest, adminGetTree,
} from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_app/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const qc = useQueryClient();
  const list = useServerFn(adminListUsers);
  const create = useServerFn(adminCreateUser);
  const del = useServerFn(adminDeleteUser);
  const assign = useServerFn(adminAssignTest);
  const unassign = useServerFn(adminUnassignTest);
  const tree = useServerFn(adminGetTree);

  const { data } = useQuery({ queryKey: ["adminUsers"], queryFn: () => list() });
  const { data: t } = useQuery({ queryKey: ["adminTree"], queryFn: () => tree() });

  const [u, setU] = useState({ username: "", password: "", full_name: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["adminUsers"] });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold gold-text">Foydalanuvchilar</h1>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Yangi foydalanuvchi</h3>
        <div className="grid grid-cols-3 gap-2">
          <div><Label>Username</Label><Input value={u.username} onChange={(e) => setU({...u, username:e.target.value})} /></div>
          <div><Label>Parol</Label><Input type="text" value={u.password} onChange={(e) => setU({...u, password:e.target.value})} /></div>
          <div><Label>F.I.O</Label><Input value={u.full_name} onChange={(e) => setU({...u, full_name:e.target.value})} /></div>
        </div>
        <Button onClick={() => {
          create({ data: u }).then(() => { toast.success("Yaratildi"); setU({username:"",password:"",full_name:""}); refresh(); }).catch((e)=>toast.error(e.message));
        }}>Yaratish</Button>
      </Card>

      <div className="space-y-3">
        {data?.users.filter((u: any) => u.role !== "admin").map((user: any) => (
          <Card key={user.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{user.full_name || user.username}</div>
                <div className="text-xs text-muted-foreground">@{user.username}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => del({data:{id:user.id}}).then(()=>{toast.success("O'chirildi"); refresh();})}>
                <Trash2 size={14} />
              </Button>
            </div>

            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Biriktirilgan testlar:</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {user.assignments.map((a: any) => (
                  <span key={a.test_id} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded flex items-center gap-1">
                    {a.tests?.title}
                    <button onClick={() => unassign({data:{user_id:user.id, test_id:a.test_id}}).then(refresh)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {user.assignments.length === 0 && <span className="text-xs text-muted-foreground">Yo'q</span>}
              </div>
              <select
                className="bg-input border border-border rounded p-2 text-sm w-full"
                onChange={(e) => {
                  if (!e.target.value) return;
                  assign({ data: { user_id: user.id, test_id: e.target.value } }).then(() => { toast.success("Biriktirildi"); refresh(); });
                  e.target.value = "";
                }}
              >
                <option value="">+ Test biriktirish...</option>
                {t?.tests.map((test: any) => {
                  if (user.assignments.some((a: any) => a.test_id === test.id)) return null;
                  return <option key={test.id} value={test.id}>{test.title}</option>;
                })}
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
