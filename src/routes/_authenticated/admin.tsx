import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Settings } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles, getSettings, updateSettings } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إعدادات النظام — نظام استئذان الطلاب" },
      { name: "description", content: "إعدادات الموقع: النصوص والألوان وحد الاستئذان الشهري." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const rolesFn = useServerFn(getMyRoles);
  const getFn = useServerFn(getSettings);
  const updateFn = useServerFn(updateSettings);
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => getFn(),
  });

  const [form, setForm] = useState({
    site_title: "",
    site_subtitle: "",
    primary_color: "#0f766e",
    accent_color: "#c2872b",
    excuse_limit: 3,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (settingsQuery.data && !loaded) {
    const d = settingsQuery.data;
    setForm({
      site_title: d.site_title ?? "",
      site_subtitle: d.site_subtitle ?? "",
      primary_color: d.primary_color ?? "#0f766e",
      accent_color: d.accent_color ?? "#c2872b",
      excuse_limit: d.excuse_limit ?? 3,
    });
    setLoaded(true);
  }

  const roles = rolesQuery.data ?? [];

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/staff", replace: true });
  }

  if (rolesQuery.isLoading) {
    return (
      <PageShell title="إعدادات النظام" subtitle="جارٍ التحميل...">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </PageShell>
    );
  }

  if (!roles.includes("admin")) {
    return (
      <PageShell title="إعدادات النظام" action={<Button variant="secondary" onClick={handleSignOut}>خروج</Button>}>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>صلاحية الأدمن فقط</CardTitle>
              <CardDescription>هذه الصفحة متاحة للأدمن التقني حصرًا.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href="/dashboard">العودة للوحة الإدارة</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateFn({ data: form });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تم حفظ الإعدادات");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch {
      toast.error("تعذّر حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="إعدادات النظام"
      subtitle="الأدمن التقني"
      action={
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <a href="/dashboard">لوحة الإدارة</a>
          </Button>
          <Button variant="secondary" onClick={handleSignOut}>خروج</Button>
        </div>
      }
    >
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5 text-primary" /> إعدادات الموقع
            </CardTitle>
            <CardDescription>تعديل النصوص والألوان وحد الاستئذان الشهري.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="site_title">عنوان الموقع</Label>
                <Input
                  id="site_title"
                  maxLength={120}
                  value={form.site_title}
                  onChange={(e) => setForm({ ...form, site_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site_subtitle">الوصف الفرعي</Label>
                <Input
                  id="site_subtitle"
                  maxLength={200}
                  value={form.site_subtitle}
                  onChange={(e) => setForm({ ...form, site_subtitle: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">اللون الأساسي</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primary_color"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="size-9 shrink-0 cursor-pointer rounded-md border"
                    />
                    <Input
                      dir="ltr"
                      value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent_color">اللون المميز</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="accent_color"
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      className="size-9 shrink-0 cursor-pointer rounded-md border"
                    />
                    <Input
                      dir="ltr"
                      value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="excuse_limit">حد الاستئذان الشهري</Label>
                <Input
                  id="excuse_limit"
                  type="number"
                  min={1}
                  max={30}
                  value={form.excuse_limit}
                  onChange={(e) => setForm({ ...form, excuse_limit: Number(e.target.value) })}
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
