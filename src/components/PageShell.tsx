import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { GraduationCap } from "lucide-react";

export function PageShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-foreground/15">
              <GraduationCap className="size-6" />
            </span>
            <span>
              <span className="block text-lg font-extrabold">{title}</span>
              {subtitle ? <span className="block text-sm opacity-85">{subtitle}</span> : null}
            </span>
          </Link>
          {action}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        جميع البيانات محفوظة في قاعدة بيانات الموقع الآمنة
      </footer>
    </div>
  );
}
