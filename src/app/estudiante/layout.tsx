import { StudentShell } from "@/components/student-shell";

// La tipografía (Nunito Sans) se define para toda la plataforma en el layout raíz.
export default function StudentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="student-typography">
      <StudentShell>{children}</StudentShell>
    </div>
  );
}
