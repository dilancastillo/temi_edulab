import "server-only";
import pool from "@/lib/db";
import type { Assignment, Student, StudentWork, TeacherProfile } from "@/lib/types";

// ─── Students ────────────────────────────────────────────────────────────────

export async function fetchStudents(teacherId: string): Promise<Student[]> {
  const { rows } = await pool.query(
    "SELECT * FROM students WHERE teacher_id = $1 ORDER BY created_at DESC",
    [teacherId]
  );
  return rows.map(rowToStudent);
}

export async function upsertStudent(student: Student): Promise<void> {
  await pool.query(
    `INSERT INTO students (id, teacher_id, institution_id, course_id, full_name, email, password, progress, current_mission_id, avatar_url, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (id) DO UPDATE SET
       teacher_id = EXCLUDED.teacher_id,
       institution_id = EXCLUDED.institution_id,
       course_id = EXCLUDED.course_id,
       full_name = EXCLUDED.full_name,
       email = EXCLUDED.email,
       password = EXCLUDED.password,
       progress = EXCLUDED.progress,
       current_mission_id = EXCLUDED.current_mission_id,
       avatar_url = EXCLUDED.avatar_url`,
    [
      student.id, student.teacherId, student.institutionId, student.courseId,
      student.fullName, student.email, student.password, student.progress,
      student.currentMissionId ?? null, student.avatarUrl ?? null, student.createdAt
    ]
  );
}

export async function updateStudentProgress(id: string, progress: string, currentMissionId?: string): Promise<void> {
  await pool.query(
    "UPDATE students SET progress = $1, current_mission_id = $2 WHERE id = $3",
    [progress, currentMissionId ?? null, id]
  );
}

export async function deleteStudentById(id: string): Promise<void> {
  await pool.query("DELETE FROM students WHERE id = $1", [id]);
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export async function fetchAssignments(teacherId: string): Promise<Assignment[]> {
  const { rows } = await pool.query(
    "SELECT * FROM assignments WHERE teacher_id = $1 ORDER BY assigned_at DESC",
    [teacherId]
  );
  return rows.map(rowToAssignment);
}

export async function upsertAssignment(assignment: Assignment): Promise<void> {
  await pool.query(
    `INSERT INTO assignments (id, teacher_id, institution_id, course_id, mission_id, mission_code, instructions, status, assigned_at, assigned_by, completed_count, review_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       instructions = EXCLUDED.instructions,
       completed_count = EXCLUDED.completed_count,
       review_count = EXCLUDED.review_count`,
    [
      assignment.id, assignment.teacherId, assignment.institutionId, assignment.courseId,
      assignment.missionId, assignment.missionCode, assignment.instructions ?? null,
      assignment.status, assignment.assignedAt, assignment.assignedBy,
      assignment.completedCount, assignment.reviewCount
    ]
  );
}

export async function deleteAssignmentById(id: string): Promise<void> {
  await pool.query("DELETE FROM assignments WHERE id = $1", [id]);
}

// ─── Student Works ────────────────────────────────────────────────────────────

export async function fetchStudentWorks(teacherId: string): Promise<StudentWork[]> {
  const { rows } = await pool.query(
    "SELECT * FROM student_works WHERE teacher_id = $1 ORDER BY updated_at DESC",
    [teacherId]
  );
  return rows.map(rowToStudentWork);
}

export async function upsertStudentWork(work: StudentWork): Promise<void> {
  await pool.query(
    `INSERT INTO student_works (id, teacher_id, institution_id, student_id, assignment_id, mission_id, workspace_state, step_index, status, updated_at, submitted_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (student_id, assignment_id) DO UPDATE SET
       workspace_state = EXCLUDED.workspace_state,
       step_index = EXCLUDED.step_index,
       status = EXCLUDED.status,
       updated_at = EXCLUDED.updated_at,
       submitted_at = EXCLUDED.submitted_at`,
    [
      work.id, work.teacherId, work.institutionId, work.studentId,
      work.assignmentId, work.missionId,
      work.workspaceState ? JSON.stringify(work.workspaceState) : null,
      work.stepIndex, work.status, work.updatedAt, work.submittedAt ?? null
    ]
  );
}

// ─── Teacher Profile ──────────────────────────────────────────────────────────

export async function fetchProfile(teacherId: string): Promise<TeacherProfile | null> {
  const { rows } = await pool.query(
    "SELECT * FROM teachers WHERE id = $1",
    [teacherId]
  );
  if (rows.length === 0) return null;
  return rowToProfile(rows[0]);
}

export async function upsertProfile(profile: TeacherProfile): Promise<void> {
  await pool.query(
    `UPDATE teachers SET full_name = $1, biography = $2, avatar_url = $3 WHERE id = $4`,
    [profile.fullName, profile.biography, profile.avatarUrl ?? null, profile.teacherId]
  );
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
    password: (row.password as string) ?? "",
    progress: row.progress as Student["progress"],
    currentMissionId: row.current_mission_id as string | undefined,
    avatarUrl: row.avatar_url as string | undefined,
    createdAt: (row.created_at as Date).toISOString(),
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
    assignedAt: (row.assigned_at as Date).toISOString(),
    assignedBy: row.assigned_by as string,
    completedCount: row.completed_count as number,
    reviewCount: row.review_count as number,
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
    updatedAt: (row.updated_at as Date).toISOString(),
    submittedAt: row.submitted_at ? (row.submitted_at as Date).toISOString() : undefined,
  };
}

function rowToProfile(row: Record<string, unknown>): TeacherProfile {
  return {
    id: row.id as string,
    teacherId: row.id as string,
    institutionId: row.institution_id as string,
    fullName: row.full_name as string,
    email: row.email as string,
    biography: (row.biography as string) ?? "",
    avatarUrl: row.avatar_url as string | undefined,
  };
}
