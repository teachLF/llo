import { useEffect, useState } from "react";
import { toast } from "sonner";

/**
 * حماية جزئية من التقاط الشاشة والنسخ.
 * ملاحظة: الحماية داخل المتصفح ليست 100% لكنها تقلل المحاولات.
 */
export function ScreenGuard() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        void navigator.clipboard?.writeText("").catch(() => {});
        toast.error("عذرًا، ممنوع لقطة الشاشة");
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) {
        e.preventDefault();
        toast.error("هذا الإجراء غير مسموح");
      }
    };

    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    const onBlur = () => setHidden(true);
    const onFocus = () => setHidden(false);

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (!hidden) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-primary text-primary-foreground">
      <p className="text-lg font-bold">المحتوى محمي — عد إلى الصفحة لعرض البيانات</p>
    </div>
  );
}
