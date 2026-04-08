import { ProfessorShell } from "@/components/professor-shell";

export default function ProfessorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProfessorShell>{children}</ProfessorShell>;
}

