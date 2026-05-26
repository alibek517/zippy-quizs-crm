import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin");
  if (!data || data.length === 0) throw new Error("Admin huquqi yo'q");
}

// ============ TREE ============
export const adminGetTree = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: sections } = await supabaseAdmin.from("sections").select("*").order("created_at");
    const { data: stages } = await supabaseAdmin.from("stages").select("*").order("sort_order");
    const { data: tests } = await supabaseAdmin.from("tests").select("*").order("created_at");
    return { sections: sections ?? [], stages: stages ?? [], tests: tests ?? [] };
  });

// ============ SECTIONS ============
export const adminCreateSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string }) => z.object({ name: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("sections").insert({ name: data.name });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("sections").delete().eq("id", data.id);
    return { ok: true };
  });

// ============ STAGES ============
export const adminCreateStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { section_id: string; name: string; sort_order?: number }) =>
    z.object({ section_id: z.string().uuid(), name: z.string().min(1).max(100), sort_order: z.number().int().optional() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("stages").insert({ section_id: data.section_id, name: data.name, sort_order: data.sort_order ?? 0 });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("stages").delete().eq("id", data.id);
    return { ok: true };
  });

// ============ TESTS ============
export const adminCreateTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { stage_id: string; title: string; duration_minutes: number }) =>
    z.object({ stage_id: z.string().uuid(), title: z.string().min(1).max(200), duration_minutes: z.number().int().min(1).max(600) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: t, error } = await supabaseAdmin.from("tests").insert(data).select().single();
    if (error) throw new Error(error.message);
    return t;
  });

export const adminDeleteTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("tests").delete().eq("id", data.id);
    return { ok: true };
  });

export const adminGetTest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: t } = await supabaseAdmin
      .from("tests")
      .select("*, questions(*, options(*))")
      .eq("id", data.id)
      .maybeSingle();
    return t;
  });

// ============ QUESTIONS ============
const QuestionInput = z.object({
  test_id: z.string().uuid(),
  text: z.string().max(2000).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  options: z.array(z.object({
    text: z.string().max(1000).optional().nullable(),
    image_url: z.string().max(500).optional().nullable(),
    is_correct: z.boolean(),
  })).min(2).max(10),
});

export const adminCreateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => QuestionInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (!data.text && !data.image_url) throw new Error("Savol uchun matn yoki rasm kerak");
    if (!data.options.some((o) => o.is_correct)) throw new Error("Kamida bitta to'g'ri javob belgilang");
    const { data: q, error } = await supabaseAdmin
      .from("questions")
      .insert({ test_id: data.test_id, text: data.text ?? null, image_url: data.image_url ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const opts = data.options.map((o, i) => ({
      question_id: q.id,
      text: o.text ?? null,
      image_url: o.image_url ?? null,
      is_correct: o.is_correct,
      sort_order: i,
    }));
    const { error: e2 } = await supabaseAdmin.from("options").insert(opts);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const adminDeleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("questions").delete().eq("id", data.id);
    return { ok: true };
  });

// ============ USERS ============
export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: assigns } = await supabaseAdmin.from("test_assignments").select("user_id, test_id, tests(title)");
    return {
      users: (profiles ?? []).map((p) => ({
        ...p,
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "user",
        assignments: (assigns ?? []).filter((a) => a.user_id === p.id),
      })),
    };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string; password: string; full_name?: string }) =>
    z.object({
      username: z.string().min(2).max(64).regex(/^[a-zA-Z0-9_]+$/),
      password: z.string().min(4).max(128),
      full_name: z.string().max(200).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const email = `${data.username.toLowerCase()}@zippy.local`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.full_name ?? "" },
    });
    if (error || !created.user) throw new Error(error?.message ?? "User yaratilmadi");
    await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username: data.username.toLowerCase(),
      full_name: data.full_name ?? null,
    });
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "user" });
    return { id: created.user.id };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.auth.admin.deleteUser(data.id);
    return { ok: true };
  });

export const adminAssignTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; test_id: string }) =>
    z.object({ user_id: z.string().uuid(), test_id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("test_assignments").insert(data);
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const adminUnassignTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; test_id: string }) =>
    z.object({ user_id: z.string().uuid(), test_id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("test_assignments").delete().eq("user_id", data.user_id).eq("test_id", data.test_id);
    return { ok: true };
  });

// ============ HISTORY ============
export const adminGetHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: attempts } = await supabaseAdmin
      .from("attempts")
      .select("*, tests(title), profiles!attempts_user_id_fkey(username, full_name)")
      .order("started_at", { ascending: false })
      .limit(500);
    const { data: warnings } = await supabaseAdmin
      .from("fullscreen_warnings")
      .select("*, profiles!fullscreen_warnings_user_id_fkey(username)")
      .order("created_at", { ascending: false })
      .limit(200);
    return { attempts: attempts ?? [], warnings: warnings ?? [] };
  });

// ============ IMAGE UPLOAD ============
export const adminUploadImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataUrl: string; filename: string }) =>
    z.object({ dataUrl: z.string().min(10), filename: z.string().min(1).max(200) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const match = data.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) throw new Error("Noto'g'ri rasm formati");
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = contentType.split("/")[1] || "png";
    const path = `${context.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("question-images").upload(path, buffer, { contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("question-images").getPublicUrl(path);
    return { url: pub.publicUrl };
  });
