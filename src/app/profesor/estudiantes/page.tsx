import { Suspense } from "react";
import { StudentsScreen } from "@/components/students-screen";

export default function StudentsPage() {
  return (
    <Suspense>
      <StudentsScreen />
    </Suspense>
  );
}

