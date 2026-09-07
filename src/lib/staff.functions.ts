import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const studentSchema = z.object({
  student_name: z.string().trim().min(2).max(120),
  national_id: z.string().trim().min(5).max(30),
  class: z.string().trim().min(1).max(60),
});

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("users_roles")
      .select("role")
      .eq("user_id", context.userId);
    return (data ?? []).map((r) => r.role as "parent" | "director" | "admin");
  });

/** تهيئة أول حساب أدمن تقني عندما لا يوجد أي أدمن بعد */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("users_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) return { ok: false as const, message: "يوجد أدمن مسجل مسبقًا" };
    const { error } = await supabaseAdmin
      .from("users_roles")
      .insert([
        { user_id: context.userId, role: "admin" },
        { user_id: context.userId, role: "director" },
      ]);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listExcuses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("excuses")
      .select("id, date, reason, status, created_at, students(student_name, national_id, class)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setExcuseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["approved", "rejected", "pending"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("excuses")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("students")
      .select("id, student_name, national_id, class, excuses_count_this_month")
      .order("student_name")
      .limit(1000);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => studentSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("students").insert(data);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const };
  });

export const bulkAddStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(studentSchema).max(2000) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error, count } = await context.supabase
      .from("students")
      .upsert(data.rows, { onConflict: "national_id", count: "exact" });
    if (error) return { ok: false as const, message: error.message, inserted: 0 };
    return { ok: true as const, inserted: count ?? data.rows.length, message: "" };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await context.supabase
      .from("excuses")
      .select("id, date, status, students(class)")
      .limit(2000);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const byClass = new Map<string, number>();
    for (const row of rows) {
      const cls = (row.students as { class: string } | null)?.class ?? "غير محدد";
      byClass.set(cls, (byClass.get(cls) ?? 0) + 1);
    }
    return {
      today: rows.filter((r) => r.date === today).length,
      pending: rows.filter((r) => r.status === "pending").length,
      total: rows.length,
      topClasses: [...byClass.entries()]
        .map(([className, count]) => ({ className, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6),
    };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("site_settings")
      .select("site_title, site_subtitle, primary_color, accent_color, excuse_limit")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        site_title: z.string().trim().min(2).max(120),
        site_subtitle: z.string().trim().min(2).max(200),
        primary_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
        accent_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/),
        excuse_limit: z.number().int().min(1).max(30),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("site_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, message: "" };
  });
