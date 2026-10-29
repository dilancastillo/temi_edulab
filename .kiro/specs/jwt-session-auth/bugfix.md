# Bugfix Requirements Document

## Introduction

The EduLab authentication system has a critical security vulnerability: after a teacher logs in, the server returns a plain `teacherId` in the JSON response body, which the client stores in `localStorage`. Every protected API endpoint then reads `teacherId` directly from query parameters or request bodies supplied by the client — there is no server-side session verification at any point.

This means any user who knows (or guesses) another teacher's `teacherId` can read that teacher's students, missions, and assignments, and can delete any student, mission, or assignment without being authenticated as that teacher. The fix replaces the localStorage-based identity with a signed JWT stored in an `httpOnly` cookie, and updates all protected endpoints to derive `teacherId` from the verified server-side session rather than from client-supplied input.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a teacher submits valid credentials to `POST /api/auth/login` THEN the system returns `{ teacherId, email, fullName }` in the JSON response body with no token and no cookie

1.2 WHEN the login response is received by the client THEN the system stores `teacherId` in `localStorage` under the key `esbot.teacherSession.v1` with no expiration or integrity protection

1.3 WHEN the client calls `GET /api/teacher/data` THEN the system reads `teacherId` from the `?teacherId=` query parameter supplied by the client and returns that teacher's full dataset without verifying the caller is that teacher

1.4 WHEN the client calls `GET /api/student/data` THEN the system reads `teacherId` from the `?teacherId=` query parameter supplied by the client and queries the database using the unverified value

1.5 WHEN the client calls `POST /api/teacher/delete-student` THEN the system accepts `{ id }` in the request body and deletes the student record with no authentication check whatsoever

1.6 WHEN the client calls `POST /api/teacher/delete-mission` THEN the system accepts `{ id }` in the request body and deletes the mission record with no authentication check whatsoever

1.7 WHEN the client calls `POST /api/teacher/delete-assignment` THEN the system accepts `{ id }` in the request body and deletes the assignment record (and cascades to student works) with no authentication check whatsoever

1.8 WHEN an attacker sets an arbitrary `teacherId` value in `localStorage` or in a request parameter THEN the system grants full read and write access to that teacher's data

### Expected Behavior (Correct)

2.1 WHEN a teacher submits valid credentials to `POST /api/auth/login` THEN the system SHALL sign a JWT containing `{ teacherId, email }` with a 24-hour expiration and set it as an `httpOnly`, `SameSite=Lax` cookie named `session`, returning only `{ ok: true }` in the response body

2.2 WHEN the client receives the login response THEN the system SHALL NOT store `teacherId` in `localStorage`; the browser cookie jar SHALL be the sole identity store

2.3 WHEN the client calls `GET /api/teacher/data` THEN the system SHALL read the `session` cookie, verify the JWT signature, extract `teacherId` from the verified payload, and return only that teacher's data

2.4 WHEN the client calls `GET /api/student/data` THEN the system SHALL read the `session` cookie, verify the JWT, and use the verified `teacherId` from the token as the authoritative teacher identity for the query

2.5 WHEN the client calls `POST /api/teacher/delete-student` THEN the system SHALL verify the session cookie, confirm the target student belongs to the authenticated teacher, and only then perform the deletion

2.6 WHEN the client calls `POST /api/teacher/delete-mission` THEN the system SHALL verify the session cookie, confirm the target mission belongs to the authenticated teacher, and only then perform the deletion

2.7 WHEN the client calls `POST /api/teacher/delete-assignment` THEN the system SHALL verify the session cookie, confirm the target assignment belongs to the authenticated teacher, and only then perform the deletion

2.8 WHEN a request arrives at any protected endpoint without a valid session cookie THEN the system SHALL return HTTP 401 and SHALL NOT return or modify any data

2.9 WHEN a teacher calls `POST /api/auth/logout` THEN the system SHALL clear the `session` cookie and return `{ ok: true }`

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a teacher submits correct credentials to `POST /api/auth/login` THEN the system SHALL CONTINUE TO verify the password against the bcrypt hash stored in the database before issuing any session

3.2 WHEN a teacher submits incorrect credentials to `POST /api/auth/login` THEN the system SHALL CONTINUE TO return HTTP 401 with an error message

3.3 WHEN an authenticated teacher loads the dashboard THEN the system SHALL CONTINUE TO return that teacher's students, assignments, missions, and student works

3.4 WHEN an authenticated student session exists (stored in `localStorage` as `esbot.studentSession.v1`) THEN the system SHALL CONTINUE TO restore the student session on page load; student sessions are unaffected by this change

3.5 WHEN an authenticated teacher creates, updates, or archives a student, mission, or assignment THEN the system SHALL CONTINUE TO persist those changes to the database

3.6 WHEN a teacher registers via `POST /api/auth/register` THEN the system SHALL CONTINUE TO create the account without requiring changes to the registration flow

3.7 WHEN the page is refreshed while a valid session cookie exists THEN the system SHALL CONTINUE TO restore the teacher session automatically without requiring re-login

---

## Bug Condition Pseudocode

### Bug Condition Function

```pascal
FUNCTION isBugCondition(request)
  INPUT: request — an HTTP request to a protected API endpoint
  OUTPUT: boolean

  // The bug is triggered when the endpoint trusts client-supplied identity
  // rather than reading it from a verified server-side session
  RETURN request has no verified session token
    AND endpoint reads teacherId from query params OR request body
END FUNCTION
```

### Property: Fix Checking

```pascal
// For all requests that previously bypassed authentication:
FOR ALL request WHERE isBugCondition(request) DO
  response ← protectedEndpoint'(request)  // fixed endpoint
  ASSERT response.status = 401
    AND response does NOT contain teacher data
    AND no database mutation occurred
END FOR
```

### Property: Preservation Checking

```pascal
// For all requests with a valid authenticated session:
FOR ALL request WHERE NOT isBugCondition(request) DO
  // Valid session cookie present and JWT signature verifies
  ASSERT protectedEndpoint(request) = protectedEndpoint'(request)
  // Same data returned, same mutations performed as before the fix
END FOR
```
