import "dotenv/config";
function readNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export const config = {
    port: readNumber(process.env.PORT, 4000),
    host: process.env.HOST ?? "0.0.0.0",
    webOrigins: (process.env.WEB_ORIGIN ?? "http://127.0.0.1:3000,http://localhost:3000")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    sessionTtlHours: readNumber(process.env.SESSION_TTL_HOURS, 8),
    robotTokenTtlDays: readNumber(process.env.ROBOT_TOKEN_TTL_DAYS, 30)
};
