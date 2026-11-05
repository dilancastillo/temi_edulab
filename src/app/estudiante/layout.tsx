import { Nunito } from "next/font/google";
import { StudentShell } from "@/components/student-shell";

// Tipografía del área del estudiante (se descarga en el build y se sirve desde el propio servidor).
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
  variable: "--font-student",
  display: "swap"
});

export default function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${nunito.variable} student-typography`}>
      <StudentShell>{children}</StudentShell>
    </div>
  );
}
