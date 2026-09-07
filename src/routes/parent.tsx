import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, ShieldCheck } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getParentState, requestExcuse } from "@/lib/parent.functions";
import { useParentSession } from "@/lib/parent-session";

export const Route = createFileRoute("/parent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة ولي الأمر — نظام استئذان الطلاب" },
      { name: "description", content: "تابع رصيد الاستئذانات الشهري وقدّم طلب استئذان جديد." },
      { property: "og:title", content: "لوحة ولي الأمر — نظام استئذان الطلاب" },
      { property: "og:description", content: "متابعة طلبات الاستئذان ورصيد الشهر للطالب." },
    ],
  }),
  component: ParentDashboard,
});

const statusLabel: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

function ParentDashboard() {
  const { student } = useParentSession();
  const navigate = useNavigate();
  const state = useServerFn(getParentState);
  const submit = useServerFn(requestExcuse);
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!student) navigate({ to: "/", replace: true });
  }, [student, navigate]);

  const query = useQuery({
    queryKey: ["parent-state", student?.id],
    enabled: !!student,
    queryFn: () => state({ data: { student_id: student!.id, national_id: student!.national_id } }),
  });

  if (!student) return null;

  const used = query.data?.used ?? 0;
  const limit = query.data?.limit ?? 3;
  const remaining = Math.max(limit - used, 0);
  const reachedLimit = remaining === 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 3) {
      toast.error("اكتب سبب الاستئذان");
      return;
    }
    setSending(true);
    try {
      const res = await submit({
        data: {
          student_id: student!.id,
          national_id: student!.national_id,
          reason: reason.trim(),
          date,
        },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("تم إرسال طلب الاستئذان");
      setReason("");
      await queryClient.invalidateQueries({ queryKey: ["parent-state", student!.id] });
    } catch {
      toast.error("تعذّر إرسال الطلب");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell
      title="لوحة ولي الأمر"
      subtitle={student.student_name}
      action={
        <Button variant="secondary" onClick={() => navigate({ to: "/" })}>
          خروج
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="surface-gradient lg:col-span-3">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 py-6">
            <div>
              <p className="text-sm text-muted-foreground">اسم الطالب</p>
              <p className="text-xl font-bold">{student.student_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الفصل</p>
              <p className="text-xl font-bold">{student.class}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">المتبقي هذا الشهر</p>
              <p className="text-3xl font-extrabold text-primary">
                {remaining} <span className="text-base font-medium text-muted-foreground">من {limit}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>طلب استئذان</CardTitle>
            <CardDescription>الحد المسموح {limit} استئذانات شهريًا، ويُصفّر تلقائيًا بداية كل شهر.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">تاريخ الاستئذان</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">السبب</Label>
                <Textarea
                  id="reason"
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="اكتب سبب الاستئذان"
                />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={reachedLimit || sending}>
                {reachedLimit ? "استنفذت الحد الشهري" : sending ? "جارٍ الإرسال..." : "طلب استئذان"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" /> سجل الطلبات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(query.data?.excuses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد طلبات بعد.</p>
            ) : (
              query.data!.excuses.map((ex) => (
                <div
                  key={ex.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
                >
                  <div>
                    <p className="font-semibold">{ex.reason}</p>
                    <p className="text-xs text-muted-foreground">{ex.date}</p>
                  </div>
                  <Badge variant={ex.status === "approved" ? "default" : "secondary"}>
                    {statusLabel[ex.status] ?? ex.status}
                  </Badge>
                </div>
              ))
            )}
            <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4" /> بياناتك محفوظة في قاعدة البيانات الآمنة فقط.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
