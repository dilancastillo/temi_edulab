import { cookies } from "next/headers";

const sessionCookieName = "esbot_web_token";

const baseCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 8
};

export async function getSessionToken() {
  const store = await cookies();
  return store.get(sessionCookieName)?.value ?? null;
}

export async function setSessionToken(token: string) {
  const store = await cookies();
  store.set(sessionCookieName, token, baseCookieOptions);
}

export async function clearSessionToken() {
  const store = await cookies();
  store.delete(sessionCookieName);
}
