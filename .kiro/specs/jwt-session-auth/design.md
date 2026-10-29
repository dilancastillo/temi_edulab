# JWT Session Auth Bugfix Design

## Overview

The EduLab API has a critical authentication gap: every protected endpoint accepts
`teacherId` as a client-supplied query parameter or request body field and uses it
directly in database queries without verifying the caller's identity. Any HTTP client
that supplies an arbitrary `teacherId` can read or delete another teacher's data.

The fix replaces the unauthenticated `teacherId` flow with a signed JWT stored in an
`httpOnly` cookie. On login, the server signs `{ teacherId, email }` with a 24-hour
expiration using the `jose` library (already bundled with Next.js) and sets the
`session` cookie. Every protected endpoint calls a shared `getSession(req)` helper
that verifies the JWT and extracts `teacherId` from the verified payload. The client
stops writing to `localStorage` for teacher sessions and stops sending `teacherId` in
requests; it relies entirely on the browser's cookie jar.

Student sessions are out of scope and remain in `localStorage`.

---

## Glossary

- **Bug_Condition (C)**: A request arrives at a protected endpoint without a verified
  JWT session cookie, yet the endpoint reads `teacherId` from client-supplied input and
  executes database operations under that identity.
- **Property (P)**: For any request carrying a valid `session` cookie, the endpoint
  extracts `teacherId` from the verified JWT payload and uses only that value; for any
  request without a valid cookie, the endpoint returns HTTP 401 and performs no database
  access.
- **Preservation**: All behaviours that must remain identical after the fix — bcrypt
  password verification, data returned to authenticated teachers, student `localStorage`
  sessions, write operations (create/update/archive), and registration.
- **`getSession(req)`**: New helper in `src/lib/session.ts` that reads the `session`
  cookie from a `NextRequest`, verifies the JWT with `jose`, and returns
  `{ teacherId, email }` or `null`.
- **`session` cookie**: `httpOnly`, `SameSite=Lax`, `Secure=true`, `Path=/`,
  `Max-Age=86400` (24 h). Name: `session`.
- **`JWT_SECRET`**: Environment variable holding the HMAC-SHA256 signing secret. Must
  be set in `.env.local` for local development and in the production environment.
- **Protected endpoints**: The five endpoints that currently read `teacherId` from the
  request without verification: `GET /api/teacher/data`, `GET /api/student/data`,
  `POST /api/teacher/delete-student`, `POST /api/teacher/delete-mission`,
  `POST /api/teacher/delete-assignment`.
- **`esbot.teacherSession.v1`**: The `localStorage` key that currently stores the
  teacher session. After the fix it is no longer written and is removed on logout.

---

## Bug Details

### Bug Condition

The bug manifests whenever a request reaches a protected API endpoint and the endpoint
derives the acting teacher's identity from a value the client placed in the URL or
request body, rather than from a server-verified token. There is no middleware or
guard that checks authenticity before the database call executes.

**Formal Specification:**

```
FUNCTION isBugCondition(request)
  INPUT: request — an HTTP request to a protected API endpoint
  OUTPUT: boolean

  has_no_verified_session ← (request.cookies["session"] is absent
                              OR JWT verification of that cookie FAILS)
  reads_identity_from_client ← (request.queryParams contains "teacherId"
                                 OR request.body contains "teacherId" or "id"
                                 that maps to a teacher-owned resource)

  RETURN has_no_verified_session AND reads_identity_from_client
END FUNCTION
```

### Examples

| Request | Current (buggy) behaviour | Expected behaviour after fix |
|---|---|---|
| `GET /api/teacher/data?teacherId=<any-uuid>` with no cookie | Returns full teacher dataset for that UUID | 401 Unauthorized |
| `POST /api/teacher/delete-student` `{ "id": "<student-id>" }` with no cookie | Deletes the student unconditionally | 401 Unauthorized |
| `GET /api/student/data?teacherId=<victim-uuid>&studentId=<uuid>` with no cookie | Returns victim teacher's student data | 401 Unauthorized |
| `GET /api/teacher/data` with valid `session` cookie for teacher A | — (currently broken for cookie path) | Returns teacher A's data only |
| `POST /api/teacher/delete-assignment` `{ "id": "<id>" }` where assignment belongs to teacher B, but caller is authenticated as teacher A | Would succeed (no ownership check) | 401 / 403 after ownership verification |

---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviours:**

- `POST /api/auth/login` MUST continue to verify the submitted password against the
  bcrypt hash stored in the `teachers` table before issuing any session token.
- `POST /api/auth/login` MUST continue to return HTTP 401 with a human-readable
  message when credentials are incorrect.
- An authenticated teacher's dashboard data (students, assignments, missions, student
  works, profile) MUST continue to be returned intact by `GET /api/teacher/data`.
- `POST /api/auth/register` MUST remain unchanged.
- Student sessions stored in `localStorage` as `esbot.studentSession.v1` MUST continue
  to be restored on page load without modification.
- Write endpoints (`/api/student/create`, `/api/teacher/upsert-assignment`,
  `/api/teacher/update-mission`, etc.) that are not in the protected-endpoint list
  MUST continue to function without being altered by this fix.
- `GET /api/student/data` MUST continue to return the correct dataset when called with
  a valid session cookie (the `studentId` query param is still supplied by the client;
  only `teacherId` moves to the cookie).

**Scope:**

All code paths that do NOT involve teacher identity derivation are completely unaffected.
This includes: student login flow, student work save/submit, robot IP storage, Supabase
Google auth path, and any read/write endpoints not listed as protected above.

---

## Hypothesized Root Cause

1. **No server-side session mechanism was ever implemented.** The login endpoint was
   built to return `teacherId` in the JSON body as a convenience for the client, without
   any consideration of server-side verification. There is no JWT signing, no cookie, and
   no session store.

2. **Endpoints were written as thin DB wrappers.** Each protected route accepts a plain
   string from the request and passes it directly to `pool.query` or a `db-store`
   helper. There is no shared authentication layer (no middleware, no guard function).

3. **Client stores identity in `localStorage` without integrity protection.**
   `localStorage` is writable by any JavaScript on the page and readable by the user in
   DevTools, making it trivially spoofable as an identity store.

4. **Delete endpoints perform no ownership verification.** `delete-student`,
   `delete-mission`, and `delete-assignment` accept a resource `id` and delete it
   without checking that the resource belongs to the caller.

---

## Correctness Properties

Property 1: Bug Condition — Unauthenticated requests are rejected

_For any_ HTTP request to a protected endpoint where `isBugCondition(request)` is true
(no valid `session` cookie is present), the fixed endpoint SHALL return HTTP 401 and
SHALL NOT execute any database read or mutation.

**Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation — Authenticated requests continue to work correctly

_For any_ HTTP request to a protected endpoint where `isBugCondition(request)` is false
(a valid `session` cookie is present and the JWT signature verifies), the fixed endpoint
SHALL return the same data and perform the same mutations as the original endpoint would
have when called with the matching `teacherId` query parameter, preserving all existing
teacher-data access semantics.

**Validates: Requirements 3.1, 3.2, 3.3, 3.5, 3.7**

---

## Fix Implementation

### New File: `src/lib/session.ts`

Exports a single `getSession(req: NextRequest)` function:

```
FUNCTION getSession(req)
  INPUT:  NextRequest
  OUTPUT: { teacherId: string; email: string } | null

  secret ← TextEncoder(process.env.JWT_SECRET)
  token  ← req.cookies.get("session")?.value
  IF token is absent THEN RETURN null

  TRY
    { payload } ← jose.jwtVerify(token, secret)
    RETURN { teacherId: payload.teacherId, email: payload.email }
  CATCH
    RETURN null
  END TRY
END FUNCTION
```

### Changes Required

**File: `src/app/api/auth/login/route.ts`**

1. Import `SignJWT` from `jose` and the new `getSession` helper path.
2. After bcrypt verification succeeds, sign a JWT:
   ```
   token ← new SignJWT({ teacherId, email })
              .setProtectedHeader({ alg: "HS256" })
              .setExpirationTime("24h")
              .sign(secret)
   ```
3. Set the cookie on the response:
   ```
   response.cookies.set("session", token, {
     httpOnly: true,
     sameSite: "lax",
     secure: true,
     path: "/",
     maxAge: 86400,
   })
   ```
4. Remove `teacherId`, `email`, `fullName`, `institutionId` from the JSON response
   body; return only `{ ok: true, fullName }` (fullName is still needed so the
   client can display the teacher's name in the UI without a separate fetch).

**File: `src/app/api/auth/logout/route.ts`** _(new file)_

```
POST handler:
  response ← NextResponse.json({ ok: true })
  response.cookies.set("session", "", { maxAge: 0, path: "/" })
  RETURN response
```

**File: `src/app/api/teacher/data/route.ts`**

1. Call `getSession(req)`. If `null`, return `NextResponse.json({ ok: false }, { status: 401 })`.
2. Use `session.teacherId` in all `db-store` calls; remove the `searchParams.get("teacherId")` read.

**File: `src/app/api/student/data/route.ts`**

1. Call `getSession(req)`. If `null`, return 401.
2. Use `session.teacherId` instead of `searchParams.get("teacherId")`.
3. Keep `studentId` from `searchParams` (this is not a secret — it identifies which
   student's work to load, not who the teacher is).

**File: `src/app/api/teacher/delete-student/route.ts`**

1. Call `getSession(req)`. If `null`, return 401.
2. Before deletion, verify the student's `teacher_id` matches `session.teacherId`;
   return 403 if not.

**File: `src/app/api/teacher/delete-mission/route.ts`**

1. Call `getSession(req)`. If `null`, return 401.
2. Before deletion, verify the mission's `teacher_id` matches `session.teacherId`;
   return 403 if not.

**File: `src/app/api/teacher/delete-assignment/route.ts`**

1. Call `getSession(req)`. If `null`, return 401.
2. Before deletion, verify the assignment's `teacher_id` matches `session.teacherId`;
   return 403 if not.

**File: `src/components/auth-store-provider.tsx`**

1. `loginWithPassword`: remove the `window.localStorage.setItem("esbot.teacherSession.v1", ...)` call.
   The login response now returns only `{ ok: true, fullName }`; use `fullName` to
   seed the profile display name. Call `loadTeacherData` with no arguments (or with
   the email only, fetching the rest from the cookie-protected `/api/teacher/data`).
2. Session restore on mount: remove the block that reads `esbot.teacherSession.v1`
   from `localStorage` and calls `loadTeacherData` with stored credentials. Instead,
   call `GET /api/teacher/data` directly on mount (the browser will send the cookie
   automatically); if it returns 401 the teacher is not logged in.
3. `logout`: call `POST /api/auth/logout` to clear the server cookie, then remove
   `esbot.teacherSession.v1` from `localStorage` (for a clean transition from old
   sessions) and call `clearTeacherData()`.
4. `loadStudentData`: the call to `/api/student/data` no longer needs to include
   `teacherId` as a query param; remove it from the URL. The `studentId` param
   remains.

### Environment Variable

Add to `.env.local`:
```
JWT_SECRET=<random-256-bit-hex-string>
```

Document in `.env.local.example` (or the README) that this variable is required.

---

## Testing Strategy

### Validation Approach

Testing follows two phases:

1. **Exploratory / bug-condition checking** — run tests against the *unfixed* code to
   surface concrete counterexamples that confirm the root cause.
2. **Fix + preservation checking** — after the fix is applied, verify that every
   protected endpoint enforces the session gate AND that all previously working
   authenticated flows still return correct data.

### Exploratory Bug Condition Checking

**Goal**: Confirm that the five protected endpoints accept requests with a fabricated
`teacherId` and return real data (or perform real mutations) with zero authentication.

**Test Plan**: Send HTTP requests with no cookie and an arbitrary `teacherId` UUID to
each endpoint. Assert that the response contains teacher data or returns 200/succeeds.
These tests are expected to PASS on the unfixed code, confirming the vulnerability.

**Test Cases**:

1. `GET /api/teacher/data?teacherId=<random-uuid>` — expect 200 with data (unfixed)
2. `GET /api/student/data?teacherId=<random-uuid>&studentId=<any>` — expect 200 (unfixed)
3. `POST /api/teacher/delete-student` `{ "id": "<existing-student-id>" }` with no
   cookie — expect 200 `{ ok: true }` (unfixed)
4. `POST /api/teacher/delete-mission` `{ "id": "<existing-mission-id>" }` with no
   cookie — expect 200 `{ ok: true }` (unfixed)
5. `POST /api/teacher/delete-assignment` `{ "id": "<existing-assignment-id>" }` with
   no cookie — expect 200 `{ ok: true }` (unfixed)

**Expected Counterexamples**:

- Endpoints return data or mutate records for unauthenticated callers.
- No `WWW-Authenticate` or 401 response is ever produced.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed endpoints
return 401 and perform no database access.

**Pseudocode:**

```
FOR ALL request WHERE isBugCondition(request) DO
  response ← fixedEndpoint(request)
  ASSERT response.status = 401
  ASSERT response body does NOT contain teacher data
  ASSERT no database row was modified
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (valid
`session` cookie present), fixed endpoints behave identically to the original endpoints
when called with the matching `teacherId`.

**Pseudocode:**

```
FOR ALL request WHERE NOT isBugCondition(request) DO
  // Valid JWT session cookie for teacher T
  ASSERT fixedEndpoint(request) = originalEndpoint(request with teacherId=T.teacherId)
END FOR
```

**Test Plan**: For each protected endpoint, send a request with a valid JWT cookie and
verify the response payload matches what the original endpoint returned for the same
`teacherId`.

**Test Cases**:

1. **Teacher data load**: Login → confirm `session` cookie set → `GET /api/teacher/data`
   (no query param) → response matches previous format.
2. **Student data load**: Valid cookie → `GET /api/student/data?studentId=<id>` →
   response matches previous format.
3. **Delete student (authenticated owner)**: Valid cookie → delete own student → 200.
4. **Delete student (wrong teacher)**: Valid cookie for teacher A, student belongs to
   teacher B → 403.
5. **Login bcrypt check**: Bad password → 401 (unchanged).
6. **Logout**: Valid cookie → `POST /api/auth/logout` → `session` cookie cleared →
   subsequent `GET /api/teacher/data` returns 401.
7. **Session restore on refresh**: Valid cookie + page reload → teacher data loads
   without re-login.
8. **Student localStorage session unaffected**: `esbot.studentSession.v1` still
   restored correctly on mount.

### Unit Tests

- `getSession(req)` returns `null` when the cookie is absent.
- `getSession(req)` returns `null` when the JWT signature is invalid.
- `getSession(req)` returns `null` when the JWT is expired.
- `getSession(req)` returns `{ teacherId, email }` for a freshly signed valid token.
- Login handler sets the `session` cookie with correct attributes (`httpOnly`,
  `sameSite`, `maxAge`).
- Logout handler clears the `session` cookie (`maxAge=0`).

### Property-Based Tests

- For any `teacherId` / `email` string pair, `getSession` round-trips through sign →
  verify and returns the original values unchanged.
- For any tampered token (one byte flipped in the signature), `getSession` returns
  `null`.
- For any request to a protected endpoint without a cookie, the response status is
  always 401, regardless of query params or body contents.

### Integration Tests

- Full login → dashboard load → logout flow returns the teacher's data correctly and
  clears the session.
- A student session in `localStorage` survives a teacher login + logout cycle without
  being cleared.
- Concurrent requests with different valid cookies for different teachers each see
  only their own data.
