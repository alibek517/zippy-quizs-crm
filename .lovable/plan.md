# Zippy CRM — Build Plan

To'liq ishlaydigan test/CRM tizimi. Admin va User rollar, bo'limlar → bosqichlar → testlar ierarxiyasi, rasm+text savollar, fullscreen, history.

## 1. Backend (Lovable Cloud)

**Jadvallar:**
- `profiles` (id, username, full_name, created_at) — auth.users ga bog'liq
- `user_roles` (user_id, role: 'admin'|'user') — alohida jadval (security)
- `sections` (id, name, created_at) — Matematika, Fizika
- `stages` (id, section_id, name, order) — Oson, O'rta, Qiyin
- `tests` (id, stage_id, title, duration_minutes, created_at)
- `questions` (id, test_id, text, image_url, order)
- `options` (id, question_id, text, image_url, is_correct, order)
- `test_assignments` (id, test_id, user_id) — userga biriktirish
- `attempts` (id, user_id, test_id, started_at, finished_at, score, total, correct, wrong, answers jsonb)
- `fullscreen_warnings` (id, attempt_id, user_id, count, created_at)

**RLS:** har bir jadvalga, `has_role()` security definer funksiyasi orqali admin/user ajratish.

**Auth:** username asosida — `{username}@zippy.local` email pattern bilan Supabase email auth ishlatamiz (admin user yaratadi via service role server function).

**Storage bucket:** `question-images` (public read).

**Seed:** Matematika, Fizika bo'limlari + Oson/O'rta/Qiyin bosqichlar + namuna testlar.

**Default admin:** `admin` / `admin123` (seed orqali).

## 2. Frontend (TanStack Start)

**Routes:**
- `/login` — username/password
- `/_authenticated/` — layout (rol asosida redirect)
- `/_authenticated/dashboard` — userning biriktirilgan testlari + statistikasi (Urinishlar, O'rtacha %, To'g'ri, Xato)
- `/_authenticated/test/$id` — test ishlash (fullscreen, random savollar/variantlar, navigatsiya, Send)
- `/_authenticated/result/$attemptId` — natija ko'rish
- `/_authenticated/admin` — admin layout
  - `/admin` — bo'limlar/bosqichlar/testlar CRUD
  - `/admin/users` — user yaratish, testlar biriktirish
  - `/admin/history` — barcha urinishlar tarixi + fullscreen ogohlantirishlar

**Server fns:** `auth-middleware` bilan himoyalangan; admin amallari `has_role` tekshiradi; admin user yaratish `supabaseAdmin` bilan.

**Fullscreen:** `document.requestFullscreen()` testga kirishda; `fullscreenchange` listener — chiqib ketsa counter ↑, modal ogohlantirish, 3-marta → avtomatik submit + adminga log.

**Brand:** logo (yuklangan, oltin Zippy) `src/assets/` ga; dark navy bg, oltin accent; design tokens `src/styles.css` da oklch.

## 3. Tekshirish

- Build xatosi yo'qligi
- Login → admin/user flow
- Test yaratish (rasm + text)
- Test ishlash (random, fullscreen, send)
- History admin/user

Hajmi katta — bir necha tool batchda yoziladi.