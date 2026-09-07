import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ChartBar as BarChart3, Check, Clock, FileSpreadsheet, Plus, Search, Trash2, Users, X } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  addStudent,
  bulkAddStudents,
  claimFirstAdmin,
  deleteStudent,
  getMyRoles,
  getStats,
  listExcuses,
  listStudents,
  setExcuseStatus,
} from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — نظام استئذان الطلاب" },
      { name: "description", content: "إدارة طلبات الاستئذان والطلاب والإحصائيات." },
    ],
  }),
  component: DashboardPage,
});

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

const chartConfig: ChartConfig = {
  count: { label: "عدد الطلبات" },
};

function DashboardPage() {
  const navigate = useNavigate();
  const rolesFn = useServerFn(getMyRoles);
  const claimFn = useServerFn(claimFirstAdmin);
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const rolesQuery = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => rolesFn(),
  });

  const roles = rolesQuery.data ?? [];
  const noAdminExists = roles.length === 0;

  async function handleClaimAdmin() {
    setClaiming(true);
    try {
      const res = await claimFn();
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تم منحك صلاحيات الأدمن والمدير");
      await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    } catch {
      toast.error("تعذّر منح الصلاحيات");
    } finally {
      setClaiming(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/staff", replace: true });
  }

  if (rolesQuery.isLoading) {
    return (
      <PageShell title="لوحة الإدارة" subtitle="جارٍ التحميل...">
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">جارٍ التحقق من الصلاحيات...</p>
        </div>
      </PageShell>
    );
  }

  if (noAdminExists) {
    return (
      <PageShell title="لوحة الإدارة" action={<Button variant="secondary" onClick={handleSignOut}>خروج</Button>}>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>تفعيل حساب الأدمن</CardTitle>
              <CardDescription>
                لا يوجد أدمن مسجل بعد. اضغط الزر لمنح نفسك صلاحيات الأدمن والمدير وإدارة النظام.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" disabled={claiming} onClick={handleClaimAdmin}>
                {claiming ? "جارٍ التفعيل..." : "تفعيل صلاحيات الأدمن"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  if (!roles.includes("director") && !roles.includes("admin")) {
    return (
      <PageShell title="لوحة الإدارة" action={<Button variant="secondary" onClick={handleSignOut}>خروج</Button>}>
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>لا تملك صلاحية الدخول</CardTitle>
              <CardDescription>حسابك لا يحتوي على صلاحيات إدارية. تواصل مع الأدمن التقني.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="لوحة الإدارة"
      subtitle={roles.includes("admin") ? "مدير + أدمن تقني" : "مدير"}
      action={
        <div className="flex gap-2">
          {roles.includes("admin") && (
            <Button variant="secondary" asChild>
              <a href="/admin">إعدادات النظام</a>
            </Button>
          )}
          <Button variant="secondary" onClick={handleSignOut}>خروج</Button>
        </div>
      }
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="excuses">طلبات الاستئذان</TabsTrigger>
          <TabsTrigger value="students">الطلاب</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="excuses">
          <ExcusesTab />
        </TabsContent>
        <TabsContent value="students">
          <StudentsTab />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function OverviewTab() {
  const statsFn = useServerFn(getStats);
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => statsFn(),
  });

  const stats = statsQuery.data;
  const cards = [
    { label: "طلبات اليوم", value: stats?.today ?? 0, icon: Clock },
    { label: "قيد المراجعة", value: stats?.pending ?? 0, icon: Clock },
    { label: "إجمالي الطلبات", value: stats?.total ?? 0, icon: BarChart3 },
    { label: "عدد الطلاب", value: "—", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-4 py-5">
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                <c.icon className="size-6 text-primary" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" /> أكثر الفصول استئذانًا
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(stats?.topClasses ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات بعد.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stats?.topClasses ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="className" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={8} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExcusesTab() {
  const listFn = useServerFn(listExcuses);
  const setStatusFn = useServerFn(setExcuseStatus);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["excuses"],
    queryFn: () => listFn(),
  });

  async function handleStatus(id: string, status: "approved" | "rejected") {
    try {
      await setStatusFn({ data: { id, status } });
      toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
      await queryClient.invalidateQueries({ queryKey: ["excuses"] });
      await queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch {
      toast.error("تعذّر تحديث الحالة");
    }
  }

  const excuses = query.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>طلبات الاستئذان</CardTitle>
        <CardDescription>مراجعة طلبات الاستئذان والموافقة عليها أو رفضها.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading && <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>}
        {excuses.length === 0 && !query.isLoading && (
          <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
        )}
        {excuses.map((ex) => {
          const student = ex.students as { student_name: string; national_id: string; class: string } | null;
          return (
            <div
              key={ex.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
            >
              <div className="space-y-1">
                <p className="font-semibold">{ex.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {student?.student_name ?? "—"} · {student?.class ?? "—"} · {ex.date}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ex.status === "approved" ? "default" : ex.status === "rejected" ? "destructive" : "secondary"}>
                  {statusLabel[ex.status] ?? ex.status}
                </Badge>
                {ex.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleStatus(ex.id, "approved")}>
                      <Check className="size-4" /> موافقة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleStatus(ex.id, "rejected")}>
                      <X className="size-4" /> رفض
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StudentsTab() {
  const listFn = useServerFn(listStudents);
  const addFn = useServerFn(addStudent);
  const bulkFn = useServerFn(bulkAddStudents);
  const deleteFn = useServerFn(deleteStudent);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["students"],
    queryFn: () => listFn(),
  });

  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newStudent, setNewStudent] = useState({ student_name: "", national_id: "", class: "" });
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const students = query.data ?? [];
  const filtered = students.filter((s) => {
    const q = search.trim();
    if (!q) return true;
    return s.national_id.includes(q) || s.class.includes(q) || s.student_name.includes(q);
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (newStudent.student_name.trim().length < 2 || newStudent.national_id.trim().length < 5 || newStudent.class.trim().length < 1) {
      toast.error("أكمل بيانات الطالب");
      return;
    }
    setAdding(true);
    try {
      const res = await addFn({ data: newStudent });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تمت إضافة الطالب");
      setNewStudent({ student_name: "", national_id: "", class: "" });
      setShowAdd(false);
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      toast.error("تعذّر إضافة الطالب");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFn({ data: { id } });
      toast.success("تم حذف الطالب");
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      toast.error("تعذّر حذف الطالب");
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      const valid: { student_name: string; national_id: string; class: string }[] = [];
      for (const row of rows) {
        const name = String(row["student_name"] ?? row["الاسم"] ?? row["اسم الطالب"] ?? "").trim();
        const id = String(row["national_id"] ?? row["رقم الهوية"] ?? row["الهوية"] ?? "").trim();
        const cls = String(row["class"] ?? row["الفصل"] ?? row["الصف"] ?? "").trim();
        if (name.length >= 2 && id.length >= 5 && cls.length >= 1) {
          valid.push({ student_name: name, national_id: id, class: cls });
        }
      }
      if (valid.length === 0) {
        toast.error("لم يتم العثور على بيانات صالحة. تأكد من الأعمدة: الاسم، رقم الهوية، الفصل");
        return;
      }
      const res = await bulkFn({ data: { rows: valid } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`تم رفع ${res.inserted} طالب`);
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    } catch {
      toast.error("تعذّر قراءة الملف");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>إدارة الطلاب</CardTitle>
              <CardDescription>إضافة طلاب يدويًا أو برفع ملف Excel، والبحث بالاسم أو الهوية أو الفصل.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowAdd(!showAdd)}>
                <Plus className="size-4" /> إضافة يدوية
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <FileSpreadsheet className="size-4" /> {uploading ? "جارٍ الرفع..." : "رفع Excel"}
              </Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <form onSubmit={handleAdd} className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="add-name">اسم الطالب</Label>
                <Input id="add-name" value={newStudent.student_name} onChange={(e) => setNewStudent({ ...newStudent, student_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-id">رقم الهوية</Label>
                <Input id="add-id" inputMode="numeric" value={newStudent.national_id} onChange={(e) => setNewStudent({ ...newStudent, national_id: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="add-class">الفصل</Label>
                <Input id="add-class" value={newStudent.class} onChange={(e) => setNewStudent({ ...newStudent, class: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={adding}>
                  {adding ? "جارٍ الإضافة..." : "إضافة"}
                </Button>
              </div>
            </form>
          )}

          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رقم الهوية أو الفصل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>

          <div className="overflow-hidden rounded-xl border">
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="p-3 text-right font-medium">اسم الطالب</th>
                    <th className="p-3 text-right font-medium">رقم الهوية</th>
                    <th className="p-3 text-right font-medium">الفصل</th>
                    <th className="p-3 text-center font-medium">استئذانات الشهر</th>
                    <th className="p-3 text-center font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground">لا يوجد طلاب مطابقون.</td>
                    </tr>
                  )}
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b transition-colors hover:bg-muted/30">
                      <td className="p-3 font-medium">{s.student_name}</td>
                      <td className="p-3 text-muted-foreground" dir="ltr">{s.national_id}</td>
                      <td className="p-3">{s.class}</td>
                      <td className="p-3 text-center">{s.excuses_count_this_month}</td>
                      <td className="p-3 text-center">
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">إجمالي الطلاب: {students.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}
