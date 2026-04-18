import { supabase } from "@/lib/supabase";
import type { Assignment, Student, StudentWork, TeacherProfile } from "@/lib/types";

// ─── Students ────────────────────────────────────────────────────────────────

export async function fetchStudents(teacherId: string): Promise<Student[]> {
  const { data, error } = await supabase.from("students").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false });
  if (error) { console.error("fetchStudents:", error); return []; }
  return (data ?? []).map(rowToStudent);
}

export async function upsertStudent(student: Student): Promise<void> {
  const { error } = await supabase.from("students").upsert(studentToRow(student));
  if (error) console.error("upsertStudent:", error);
}

export async function deleteStudentById(id: string): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) console.error("deleteStudentById:", error);
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export async function fetchAssignments(teacherId: string): Promise<Assignment[]> {
  const { data, error } = await supabase.from("assignments").select("*").eq("teacher_id", teacherId).order("assigned_at", { ascending: false });
  if (error) { console.error("fetchAssignments:", error); return []; }
  return (data ?? []).map(rowToAssignment);
}

export async function upsertAssignment(assignment: Assignment): Promise<void> {
  const { error } = await supabase.from("assignments").upsert(assignmentToRow(assignment));
  if (error) console.error("upsertAssignment:", error);
}

export async function deleteAssignmentById(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) console.error("deleteAssignmentById:", error);
}

// ─── Student Works ────────────────────────────────────────────────────────────

export async function fetchStudentWorks(teacherId: string): Promise<StudentWork[]> {
  const { data, error } = await supabase.from("student_works").select("*").eq("teacher_id", teacherId).order("updated_at", { ascending: false });
  if (error) { console.error("fetchStudentWorks:", error); return []; }
  return (data ?? []).map(rowToStudentWork);
}

export async function upsertStudentWork(work: StudentWork): Promise<void> {
  const { error } = await supabase.from("student_works").upsert(studentWorkToRow(work));
  if (error) console.error("upsertStudentWork:", error);
}

// ─── Teacher Profile ──────────────────────────────────────────────────────────

export async function fetchProfile(teacherId: string): Promise<TeacherProfile | null> {
  const { data, error } = await supabase.from("teacher_profiles").select("*").eq("teacher_id", teacherId).single();
  if (error) { return null; }
  return rowToProfile(data);
}

export async function upsertProfile(profile: TeacherProfile): Promise<void> {
  const { error } = await supabase.from("teacher_profiles").upsert(profileToRow(profile));
  if (error) console.error("upsertProfile:", error);
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function rowToStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    institutionId: row.institution_id as string,
    courseId: row.course_id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    password: row.password as string ?? "",
    progress: row.progress as Student["progress"],
    currentMissionId: row.current_mission_id as string | undefined,
    avatarUrl: row.avatar_url as string | undefined,
    createdAt: row.created_at as string,
  };
}

function studentToRow(s: Student) {
  return {
    id: s.id,
    teacher_id: s.teacherId,
    institution_id: s.institutionId,
    course_id: s.courseId,
    full_name: s.fullName,
    email: s.email,
    password: s.password,
    progress: s.progress,
    current_mission_id: s.currentMissionId ?? null,
    avatar_url: s.avatarUrl ?? null,
    created_at: s.createdAt,
  };
}

function rowToAssignment(row: Record<string, unknown>): Assignment {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    institutionId: row.institution_id as string,
    courseId: row.course_id as string,
    missionId: row.mission_id as string,
    missionCode: row.mission_code as string,
    instructions: row.instructions as string | undefined,
    status: row.status as Assignment["status"],
    assignedAt: row.assigned_at as string,
    assignedBy: row.assigned_by as string,
    completedCount: row.completed_count as number,
    reviewCount: row.review_count as number,
  };
}

function assignmentToRow(a: Assignment) {
  return {
    id: a.id,
    teacher_id: a.teacherId,
    institution_id: a.institutionId,
    course_id: a.courseId,
    mission_id: a.missionId,
    mission_code: a.missionCode,
    instructions: a.instructions ?? null,
    status: a.status,
    assigned_at: a.assignedAt,
    assigned_by: a.assignedBy,
    completed_count: a.completedCount,
    review_count: a.reviewCount,
  };
}

function rowToStudentWork(row: Record<string, unknown>): StudentWork {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    institutionId: row.institution_id as string,
    studentId: row.student_id as string,
    assignmentId: row.assignment_id as string,
    missionId: row.mission_id as string,
    workspaceState: row.workspace_state,
    stepIndex: row.step_index as number,
    status: row.status as StudentWork["status"],
    updatedAt: row.updated_at as string,
    submittedAt: row.submitted_at as string | undefined,
  };
}

function studentWorkToRow(w: StudentWork) {
  return {
    id: w.id,
    teacher_id: w.teacherId,
    institution_id: w.institutionId,
    student_id: w.studentId,
    assignment_id: w.assignmentId,
    mission_id: w.missionId,
    workspace_state: w.workspaceState ?? null,
    step_index: w.stepIndex,
    status: w.status,
    updated_at: w.updatedAt,
    submitted_at: w.submittedAt ?? null,
  };
}

function rowToProfile(row: Record<string, unknown>): TeacherProfile {
  return {
    id: row.id as string,
    teacherId: row.teacher_id as string,
    institutionId: row.institution_id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    biography: row.biography as string,
    avatarUrl: row.avatar_url as string | undefined,
  };
}

function profileToRow(p: TeacherProfile) {
  return {
    id: p.id,
    teacher_id: p.teacherId,
    institution_id: p.institutionId,
    full_name: p.fullName,
    email: p.email,
    biography: p.biography,
    avatar_url: p.avatarUrl ?? null,
  };
}
