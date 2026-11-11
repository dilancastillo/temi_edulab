"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StudentReport } from "@/components/student-report";

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportFromQuery />
    </Suspense>
  );
}

function ReportFromQuery() {
  const params = useSearchParams();
  const assignmentId = params.get("assignment") ?? "";
  const studentId = params.get("student") ?? "";
  return <StudentReport assignmentId={assignmentId} studentId={studentId} />;
}
