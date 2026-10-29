# JWT Session Auth — Implementation Tasks

## Tasks

- [-] 1. Add JWT_SECRET environment variable
  - [x] 1.1 Add `JWT_SECRET=<placeholder>` to `.env.local` (generate a random 256-bit hex value)
  - [x] 1.2 Document `JWT_SECRET` in `.env.local.example` (or equivalent env reference file) with a note that it is required
  - [x] 1.3 Add startup validation in `src/lib/session.ts`: throw a clear error at module load time if `JWT_SECRET` is undefined or empty, so misconfiguration fails loudly instead of silently breaking all logins

- [x] 2. Create `src/lib/session.ts` — shared session helper
  - [x] 2.1 Import `jwtVerify` and `SignJWT` from `jose`
  - [x] 2.2 Implement `getSession(req: NextRequest): Promise<{ teacherId: string; email: string; institutionId: string } | null>` — reads the `session` cookie, verifies the JWT with `JWT_SECRET`, returns the payload or `null` on any failure
  - [x] 2.3 Export `getSession` as the sole named export; keep the file side-effect-free (except the startup JWT_SECRET validation from task 1.3)

- [x] 3. Update `POST /api/auth/login` to issue a JWT cookie
  - [x] 3.1 Import `SignJWT` from `jose`
  - [x] 3.2 After successful bcrypt verification, sign a JWT with `{ teacherId, email, institutionId }`, `alg: HS256`, and `expirationTime: "24h"`
  - [x] 3.3 Set the `session` cookie on the response with `httpOnly: true`, `sameSite: "lax"`, `secure: true`, `path: "/"`, `maxAge: 86400`
  - [x] 3.4 Change the JSON response body to `{ ok: true, fullName }` — remove `teacherId`, `email`, and `institutionId` from the response body (they now live in the cookie only)
  - [x] 3.5 Add in-memory rate limiting: track failed login attempts per IP; after 5 failed attempts within 15 minutes return HTTP 429 with a `Retry-After` header before executing any DB query

- [x] 4. Create `POST /api/auth/logout` endpoint
  - [x] 4.1 Create `src/app/api/auth/logout/route.ts`
  - [x] 4.2 Implement the `POST` handler: return `{ ok: true }` and clear the `session` cookie by setting `maxAge: 0`

- [x] 5. Secure `GET /api/teacher/data`
  - [x] 5.1 Call `getSession(req)` at the top of the handler; return 401 if `null`
  - [x] 5.2 Replace `searchParams.get("teacherId")` with `session.teacherId` in all `db-store` calls

- [x] 6. Secure `GET /api/student/data`
  - [x] 6.1 Call `getSession(req)` at the top of the handler; return 401 if `null`
  - [x] 6.2 Replace `searchParams.get("teacherId")` with `session.teacherId` in all queries
  - [x] 6.3 Keep `studentId` from `searchParams` (unchanged)

- [x] 7. Secure `POST /api/teacher/delete-student`
  - [x] 7.1 Call `getSession(req)` at the top of the handler; return 401 if `null`
  - [x] 7.2 Before calling `deleteStudentById`, query the DB to verify `students.teacher_id = session.teacherId`; return 403 if it does not match

- [x] 8. Secure `POST /api/teacher/delete-mission`
  - [x] 8.1 Call `getSession(req)` at the top of the handler; return 401 if `null`
  - [x] 8.2 Before `DELETE`, query the DB to verify `missions.teacher_id = session.teacherId`; return 403 if it does not match

- [x] 9. Secure `POST /api/teacher/delete-assignment`
  - [x] 9.1 Call `getSession(req)` at the top of the handler; return 401 if `null`
  - [x] 9.2 Before `DELETE`, query the DB to verify `assignments.teacher_id = session.teacherId`; return 403 if it does not match

- [x] 10. Update `src/components/auth-store-provider.tsx` — teacher session client changes
  - [x] 10.1 In `loginWithPassword`: remove the `window.localStorage.setItem("esbot.teacherSession.v1", ...)` call; read `fullName` from the login response to seed the profile
  - [x] 10.2 In the mount `useEffect`: remove the block that reads `esbot.teacherSession.v1` from `localStorage`; instead call `GET /api/teacher/data` directly on mount and treat a 401 response as "not logged in"
  - [x] 10.3 In `logout`: call `POST /api/auth/logout` before clearing local state; remove `window.localStorage.removeItem("esbot.teacherSession.v1")`
  - [x] 10.4 In `loadStudentData`: remove `teacherId` from the `/api/student/data` query string (the cookie carries it); keep `studentId`
