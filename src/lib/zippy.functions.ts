import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// ============ BOOTSTRAP ADMIN ============
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  // Check if any admin exists
  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);
  if (existing && existing.length > 0) return { created: false };

  const email = "admin@zippy.local";
  const password = "admin123";
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: "admin", full_name: "Administrator" },
  });
  if (error || !created.user) throw new Error(error?.message ?? "Admin yaratilmadi");

  await supabaseAdmin.from("profiles").insert({
    id: created.user.id,
    username: "admin",
    full_name: "Administrator",
  });
  await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
  return { created: true };
});

// ============ LOGIN HELPER: resolve username -> email ============
export const resolveLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string }) => z.object({ username: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data }) => {
    return { email: `${data.username.toLowerCase()}@zippy.local` };
  });

// ============ ME ============
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return { profile, isAdmin, userId };
  });

// ============ USER DASHBOARD ============
export const getMyDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: assignments } = await supabaseAdmin
      .from("test_assignments")
      .select("test_id, tests(id, title, duration_minutes, stage_id, stages(name, sections(name)))")
      .eq("user_id", userId);

    const { data: attempts } = await supabaseAdmin
      .from("attempts")
      .select("*, tests(title)")
      .eq("user_id", userId)
      .order("started_at", { ascending: false });

    const completed = (attempts ?? []).filter((a) => a.finished_at);
    const avg = completed.length
      ? completed.reduce((s, a) => s + Number(a.score_percent), 0) / completed.length
      : 0;
    const totalCorrect = completed.reduce((s, a) => s + a.correct_count, 0);
    const totalWrong = completed.reduce((s, a) => s + a.wrong_count, 0);
    return {
      assignments: assignments ?? [],
      attempts: attempts ?? [],
      stats: {
        attempts: completed.length,
        avg: Math.round(avg * 10) / 10,
        correct: totalCorrect,
        wrong: totalWrong,
      },
    };
  });

// ============ START TEST ============
export const startTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { testId: string }) => z.object({ testId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // verify assignment
    const { data: assign } = await supabaseAdmin
      .from("test_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("test_id", data.testId)
      .maybeSingle();
    if (!assign) throw new Error("Bu test sizga biriktirilmagan");

    const { data: test } = await supabaseAdmin
      .from("tests")
      .select("*, questions(*, options(*))")
      .eq("id", data.testId)
      .maybeSingle();
    if (!test) throw new Error("Test topilmadi");

    // shuffle
    const questions = [...(test.questions ?? [])]
      .sort(() => Math.random() - 0.5)
      .map((q: any) => ({
        ...q,
        options: [...(q.options ?? [])]
          .sort(() => Math.random() - 0.5)
          .map((o: any) => ({ id: o.id, text: o.text, image_url: o.image_url })),
      }));

    const { data: attempt, error } = await supabaseAdmin
      .from("attempts")
      .insert({
        user_id: userId,
        test_id: data.testId,
        total_questions: questions.length,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return {
      attemptId: attempt.id,
      duration_minutes: test.duration_minutes,
      title: test.title,
      questions: questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        image_url: q.image_url,
        options: q.options,
      })),
    };
  });

// ============ SUBMIT TEST ============
export const submitTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string; answers: Record<string, string>; autoSubmitted?: boolean }) =>
    z.object({
      attemptId: z.string().uuid(),
      answers: z.record(z.string(), z.string()),
      autoSubmitted: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: attempt } = await supabaseAdmin
      .from("attempts")
      .select("*")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!attempt) throw new Error("Urinish topilmadi");

    const qIds = Object.keys(data.answers);
    const { data: correctOpts } = await supabaseAdmin
      .from("options")
      .select("id, question_id, is_correct")
      .in("question_id", qIds.length ? qIds : ["00000000-0000-0000-0000-000000000000"]);

    let correct = 0;
    const detailed: any[] = [];
    for (const qId of qIds) {
      const chosen = data.answers[qId];
      const correctOpt = (correctOpts ?? []).find((o) => o.question_id === qId && o.is_correct);
      const isCorrect = correctOpt?.id === chosen;
      if (isCorrect) correct++;
      detailed.push({ question_id: qId, chosen, correct_option_id: correctOpt?.id, is_correct: isCorrect });
    }
    const total = attempt.total_questions || qIds.length;
    const wrong = total - correct;
    const score = total ? (correct / total) * 100 : 0;

    const { error } = await supabaseAdmin
      .from("attempts")
      .update({
        finished_at: new Date().toISOString(),
        correct_count: correct,
        wrong_count: wrong,
        score_percent: Math.round(score * 100) / 100,
        answers: detailed,
        auto_submitted: data.autoSubmitted ?? false,
      })
      .eq("id", data.attemptId);
    if (error) throw new Error(error.message);

    return { attemptId: data.attemptId, correct, wrong, total, score };
  });

// ============ FULLSCREEN WARNING ============
export const logFullscreenWarning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string; warningNumber: number }) =>
    z.object({ attemptId: z.string().uuid(), warningNumber: z.number().int().min(1).max(10) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await supabaseAdmin.from("fullscreen_warnings").insert({
      attempt_id: data.attemptId,
      user_id: userId,
      warning_number: data.warningNumber,
    });
    await supabaseAdmin
      .from("attempts")
      .update({ fullscreen_exits: data.warningNumber })
      .eq("id", data.attemptId)
      .eq("user_id", userId);
    return { ok: true };
  });

// ============ GET ATTEMPT RESULT ============
export const getAttempt = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { attemptId: string }) => z.object({ attemptId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: attempt } = await supabaseAdmin
      .from("attempts")
      .select("*, tests(title)")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Topilmadi");
    // Check access
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin && attempt.user_id !== userId) throw new Error("Ruxsat yo'q");
    return attempt;
  });
