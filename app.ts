import express from "express";
import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./src/middleware/errorHandler.ts";
import logger from "./src/logger.ts";
import authRouter from "./src/routes/auth.routes.ts";
import announcementsRouter from "./src/routes/announcements.routes.ts";
import { generateOpenApiDocument } from "./src/openapi.ts";

const app = express();

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) || [];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many requests, please try again later",
  },
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.debug({ origin }, "CORS blocked origin");
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-Total-Count"],
    maxAge: 86400,
  }),
);

app.use(
  helmet({
    contentSecurityPolicy:
      process.env.NODE_ENV === "production" ? undefined : false,
  }),
);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/health",
    },
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['set-cookie']",
        'res.headers["set-cookie"]',
      ],
      remove: true,
    },
  }),
);

app.use(express.json());
app.use(cookieParser());

const openApiDocument = generateOpenApiDocument();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/announcements", announcementsRouter);

// 404 Not Found handler
app.use((req: Request, res: Response) => {
  logger.debug({ method: req.method, url: req.url }, "Route not found");
  res.status(404).json({ error: "Not found" });
});

// Error handling middleware
app.use(errorHandler);

export default app;