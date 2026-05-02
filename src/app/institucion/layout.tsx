import { InstitutionShell } from "@/components/institution-shell";

export default function InstitutionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <InstitutionShell>{children}</InstitutionShell>;
}
