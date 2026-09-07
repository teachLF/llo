import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parentLogin } from "@/lib/parent.functions";
import { useParentSession } from "@/lib/parent-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "دخول ولي الأمر — نظام استئذان الطلاب" },
      {
        name: "description",
        content: "سجّل دخولك باسم الطالب ورقم الهوية والفصل لتقديم طلب استئذان ومتابعة حالته.",
      },
      { property: "og:title", content: "دخول ولي الأمر — نظام استئذان الطلاب" },
      {
        property: "og:description",
        content: "بوابة أولياء الأمور لتقديم طلبات الاستئذان ومتابعتها إلكترونيًا.",
      },
    ],
  }),
  component: ParentLoginPage,
});

const schema = z.object({
  student_name: z.string().trim().min(2, "أدخل اسم الطالب").max(120),
  national_id: z
    .string()
    .trim()
    .min(5, "أدخل رقم هوية صحيح")
    .max(30)
    .regex(/^[0-9]+$/, "رقم الهوية أرقام فقط"),
  class: z.string().trim().min(1, "أدخل الفصل").max(60),
});

function ParentLoginPage() {
  const login = useServerFn(parentLogin);
  const navigate = useNavigate();
  const { setStudent } = useParentSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ student_name: "", national_id: "", class: "" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "تحقق من البيانات");
      return;
    }
    setLoading(true);
    try {
      const res = await login({ data: parsed.data });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setStudent(res.student);
      navigate({ to: "/parent" });
    } catch {
      toast.error("تعذّر الاتصال، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="نظام استئذان الطلاب"
      subtitle="بوابة أولياء الأمور"
      action={
        <Button asChild variant="secondary">
          <Link to="/staff">دخول الإدارة</Link>
        </Button>
      }
    >
      <div className="mx-auto max-w-lg">
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle className="text-2xl">تسجيل دخول ولي الأمر</CardTitle>
            <CardDescription>
              أدخل بيانات الطالب كما هي مسجلة لدى إدارة المدرسة للدخول إلى لوحة الاستئذان.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student_name">اسم الطالب</Label>
                <Input
                  id="student_name"
                  value={form.student_name}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                  placeholder="الاسم الرباعي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="national_id">رقم الهوية</Label>
                <Input
                  id="national_id"
                  inputMode="numeric"
                  value={form.national_id}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                  placeholder="رقم هوية الطالب"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">الفصل</Label>
                <Input
                  id="class"
                  value={form.class}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, class: e.target.value })}
                  placeholder="مثال: أول متوسط/أ"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "جارٍ التحقق..." : "دخول"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
