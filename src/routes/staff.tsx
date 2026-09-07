import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول الإدارة — نظام استئذان الطلاب" },
      { name: "description", content: "تسجيل دخول آمن لمدير المدرسة والأدمن التقني." },
      { property: "og:title", content: "دخول الإدارة — نظام استئذان الطلاب" },
      { property: "og:description", content: "بوابة دخول الإدارة لمتابعة طلبات الاستئذان." },
    ],
  }),
  component: StaffAuth,
});

const schema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صحيح").max(255),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
});

function StaffAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function handle(mode: "signin" | "signup") {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "تحقق من البيانات");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. يمكنك الدخول الآن.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="دخول الإدارة" subtitle="المدير والأدمن التقني">
      <div className="mx-auto max-w-md">
        <Card className="shadow-[var(--shadow-soft)]">
          <CardHeader>
            <CardTitle>حساب الإدارة</CardTitle>
            <CardDescription>
              الدخول ببريد إلكتروني وكلمة مرور آمنة، والصلاحيات تُمنح من جدول الصلاحيات في قاعدة البيانات.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
              </TabsList>
              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
                <TabsContent value="signin" className="m-0">
                  <Button className="w-full" size="lg" disabled={loading} onClick={() => handle("signin")}>
                    {loading ? "جارٍ الدخول..." : "دخول"}
                  </Button>
                </TabsContent>
                <TabsContent value="signup" className="m-0">
                  <Button className="w-full" size="lg" disabled={loading} onClick={() => handle("signup")}>
                    {loading ? "جارٍ الإنشاء..." : "إنشاء حساب"}
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
