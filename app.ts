import express from "express";
import type { NextFunction, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import cookieParser from "cookie-parser";

import authRouter from "./src/routes/auth.routes.ts";
import { generateOpenApiDocument } from "./src/openapi.ts";

const app = express();

app.use(express.json());
app.use(cookieParser());
const openApiDocument = generateOpenApiDocument();
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/auth", authRouter);

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
