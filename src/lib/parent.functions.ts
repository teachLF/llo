import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const loginSchema = z.object({
  student_name: z.string().trim().min(2).max(120),
  national_id: z.string().trim().min(5).max(30),
  class: z.string().trim().min(1).max(60),
});

const requestSchema = z.object({
  student_id: z.string().uuid(),
  national_id: z.string().trim().min(5).max(30),
  reason: z.string().trim().min(3).max(500),
  date: z.string().trim().min(8).max(10),
});

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function excuseLimit(db: Awaited<ReturnType<typeof admin>>) {
  const { data } = await db.from("site_settings").select("excuse_limit").eq("id", true).maybeSingle();
  return data?.excuse_limit ?? 3;
}

/** يصفّر العداد تلقائيًا مع بداية كل شهر ميلادي */
async function resetIfNeeded(db: Awaited<ReturnType<typeof admin>>, student: {
  id: string;
  excuses_count_this_month: number;
  last_excuse_reset: string;
}) {
  const start = monthStart();
  if (student.last_excuse_reset >= start) return student.excuses_count_this_month;
  await db
    .from("students")
    .update({ excuses_count_this_month: 0, last_excuse_reset: start })
    .eq("id", student.id);
  return 0;
}

export const parentLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: student } = await db
      .from("students")
      .select("id, student_name, national_id, class, excuses_count_this_month, last_excuse_reset")
      .eq("national_id", data.national_id)
      .maybeSingle();

    if (
      !student ||
      student.student_name.trim() !== data.student_name ||
      student.class.trim() !== data.class
    ) {
      return { ok: false as const, message: "البيانات غير صحيحة، راجع إدارة المدرسة" };
    }

    const used = await resetIfNeeded(db, student);
    const limit = await excuseLimit(db);
    const { data: excuses } = await db
      .from("excuses")
      .select("id, date, reason, status, created_at")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(30);

    return {
      ok: true as const,
      student: {
        id: student.id,
        student_name: student.student_name,
        class: student.class,
        national_id: student.national_id,
      },
      used,
      limit,
      excuses: excuses ?? [],
    };
  });

export const getParentState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ student_id: z.string().uuid(), national_id: z.string().trim().min(5) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: student } = await db
      .from("students")
      .select("id, student_name, national_id, class, excuses_count_this_month, last_excuse_reset")
      .eq("id", data.student_id)
      .maybeSingle();
    if (!student || student.national_id !== data.national_id) throw new Error("بيانات غير صالحة");

    const used = await resetIfNeeded(db, student);
    const limit = await excuseLimit(db);
    const { data: excuses } = await db
      .from("excuses")
      .select("id, date, reason, status, created_at")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(30);

    return { used, limit, excuses: excuses ?? [] };
  });

export const requestExcuse = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestSchema.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: student } = await db
      .from("students")
      .select("id, national_id, excuses_count_this_month, last_excuse_reset")
      .eq("id", data.student_id)
      .maybeSingle();
    if (!student || student.national_id !== data.national_id) throw new Error("بيانات غير صالحة");

    const used = await resetIfNeeded(db, student);
    const limit = await excuseLimit(db);
    if (used >= limit) {
      return { ok: false as const, message: "استنفذت الحد الشهري" };
    }

    const { error } = await db.from("excuses").insert({
      student_id: student.id,
      date: data.date,
      reason: data.reason,
    });
    if (error) throw new Error(error.message);

    await db
      .from("students")
      .update({ excuses_count_this_month: used + 1 })
      .eq("id", student.id);

    return { ok: true as const, used: used + 1, limit };
  });

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db
    .from("site_settings")
    .select("site_title, site_subtitle, primary_color, accent_color, excuse_limit")
    .eq("id", true)
    .maybeSingle();
  return (
    data ?? {
      site_title: "نظام استئذان الطلاب",
      site_subtitle: "بوابة أولياء الأمور والإدارة المدرسية",
      primary_color: "#0f766e",
      accent_color: "#c2872b",
      excuse_limit: 3,
    }
  );
});
