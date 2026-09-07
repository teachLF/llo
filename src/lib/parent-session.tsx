import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type ParentStudent = {
  id: string;
  student_name: string;
  class: string;
  national_id: string;
};

type Ctx = {
  student: ParentStudent | null;
  setStudent: (s: ParentStudent | null) => void;
};

const ParentSessionContext = createContext<Ctx>({ student: null, setStudent: () => {} });

/**
 * جلسة ولي الأمر تُحفظ في ذاكرة التطبيق فقط (بدون localStorage)،
 * وكل بيانات الطلاب تبقى في قاعدة البيانات.
 */
export function ParentSessionProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<ParentStudent | null>(null);
  const value = useMemo(() => ({ student, setStudent }), [student]);
  return <ParentSessionContext.Provider value={value}>{children}</ParentSessionContext.Provider>;
}

export function useParentSession() {
  return useContext(ParentSessionContext);
}
