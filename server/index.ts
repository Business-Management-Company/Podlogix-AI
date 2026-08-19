import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startAutoSyncScheduler } from "./services/schedulerService";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

export const ready = (async () => {
  try {
    // Test database connection on startup
    const { testDatabaseConnection } = await import("./db");
    const dbConnected = await testDatabaseConnection();
    if (dbConnected) {
      log("Database connection successful");
    } else {
      log("Database connection failed or not configured - some features may be unavailable");
    }

    await registerRoutes(httpServer, app);

    // Registered after registerRoutes so the session middleware it installs
    // covers this route too.
    const { registerRefinerTranscribe } = await import("./refinerTranscribe");
    registerRefinerTranscribe(app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    // On Vercel, static files are served by the CDN and the function only
    // handles API/feed routes — skip static serving, listening, and the scheduler.
    if (process.env.VERCEL) {
      return;
    }

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // Serve the app on the port specified in the environment variable PORT.
    // Default to 5000 if not specified. This serves both the API and the client.
    // Note: SO_REUSEPORT is Linux-only; enabling it on macOS throws ENOTSUP.
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        ...(process.platform === "linux" ? { reusePort: true } : {}),
      },
      () => {
        log(`serving on port ${port}`);

        // Start auto-sync scheduler for podcast episodes
        startAutoSyncScheduler();
      },
    );
  } catch (error) {
    console.error("Failed to start server:", error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
})();

// Exported for the Vercel serverless entry (api/index.js)
export { app };
