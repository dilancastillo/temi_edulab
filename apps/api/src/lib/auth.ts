import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export function createOpaqueToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function createShortCode(prefix = "EDU") {
  const body = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${body}`;
}

export function createMissionCode() {
  return crypto.randomBytes(4).toString("base64url").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6).padEnd(6, "7");
}

export function normalizeLocation(name: string) {
  return name.trim().toLowerCase();
}
