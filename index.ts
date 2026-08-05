import "dotenv/config";
import app from "./app.ts";
import logger from "./src/logger.ts";
import prisma from "./prisma/client.ts";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// ---------- Graceful Shutdown ----------

const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Перестаємо приймати нові з’єднання
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error while closing HTTP server");
      process.exit(1);
    }

    try {
      // Закриваємо з’єднання з БД
      await prisma.$disconnect();
      logger.info("Database connection closed");
    } catch (dbErr) {
      logger.error({ err: dbErr }, "Error while disconnecting from database");
    }

    logger.info("Graceful shutdown completed");
    process.exit(0);
  });

  // Захист від зависання (якщо з’єднання не закриваються)
  setTimeout(() => {
    logger.error("Could not close connections in time, forcing shutdown");
    process.exit(1);
  }, 10_000).unref(); // unref — щоб таймер не тримав процес
};

process.on("SIGTERM", () => shutdown("SIGTERM")); // Docker / Kubernetes / PM2
process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C

// ---------- Critical process errors ----------

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  process.exit(1);
});
