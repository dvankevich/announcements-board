import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from 'cors'
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";

import authRouter from "./src/routes/auth.routes.ts";
import announcementsRouter from "./src/routes/announcements.routes.ts";

import { generateOpenApiDocument } from "./src/openapi.ts";

const app = express();

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

// console.log("ALLOWED_ORIGINS from env:", process.env.ALLOWED_ORIGINS);
// console.log("Parsed allowedOrigins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // ← ось так правильно
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400
  }),
);

app.use(express.json());
app.use(cookieParser());
const openApiDocument = generateOpenApiDocument();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/auth", authRouter);
app.use("/api/announcements", announcementsRouter);

// 404 Not Found handler - must be after all routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;

  // Логуємо тільки серверні помилки (5xx)
  if (status >= 500) {
    console.error(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Validation failed",
      details: {
        body: ["Invalid JSON format in request body"],
      },
    });
  }

  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: err.message });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Resource not found" });
  }

  if (err.code === "P2002") {
    return res.status(409).json({ error: "Unique constraint violation" });
  }

  if (err.code === "P2003") {
    return res.status(400).json({ error: "Foreign key constraint failed" });
  }

  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
