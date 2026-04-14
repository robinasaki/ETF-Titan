import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { APP_NAME } from "@etf-titan/shared";

const port = Number(process.env.PORT ?? 3001);

const app = new Elysia()
  .use(
    cors({
      origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    }),
  )
  .get("/health", () => ({
    name: APP_NAME,
    status: "ok",
  }))
  .listen(port);

console.log(`${APP_NAME} server is running at ${app.server?.url.href ?? `http://localhost:${port}`}`);
