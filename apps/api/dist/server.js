import { buildApp } from "./app.js";
import { config } from "./lib/config.js";
const app = await buildApp();
await app.listen({
    host: config.host,
    port: config.port
});
