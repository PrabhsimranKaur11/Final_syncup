import "./config/loadEnv.js";
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { initializeSocket } from "./socket/socket.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import channelRoutes from "./routes/channel.routes.js";
import messageRoutes from "./routes/message.routes.js";
import scheduledCallRoutes from "./routes/scheduledCall.routes.js";
import callLogRoutes from "./routes/callLog.routes.js";
import passwordResetRoutes from "./routes/passwordReset.js"; // ← ADD THIS

const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEBUG_LOG = path.join(__dirname, "..", "debug-c75bf6.log");

// ─── Middleware ───

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// ─── Debug session log (NDJSON) ───
app.post("/api/_debug/log", express.json({ limit: "64kb" }), (req, res) => {
  try {
    fs.appendFileSync(DEBUG_LOG, `${JSON.stringify(req.body)}\n`);
  } catch (err) {
    console.error("debug log write failed:", err.message);
  }
  res.sendStatus(204);
});

// ─── API Routes ───

app.get("/", (req, res) => {
  res.json({ message: "SyncUp Workspace API is running 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/auth", passwordResetRoutes);  // ← ADD THIS
app.use("/api/users", userRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", scheduledCallRoutes);

// Channel routes use a dual-prefix pattern, so mount at /api
app.use("/api", channelRoutes);

// Message & upload routes also use dual prefixes, so mount at /api
app.use("/api", messageRoutes);
app.use("/api", callLogRoutes);

app.use("/api/uploads", (req, res, next) => {
  if (req.query.download === "1") {
    const base = path.basename(req.path);
    res.setHeader("Content-Disposition", `attachment; filename="${base}"`);
  }
  next();
}, express.static(path.join(__dirname, "uploads")));

// ─── Initialize Socket.io ───

initializeSocket(server);

// ─── Start server ───

const PORT = Number(process.env.PORT) || 5000;

const shutdown = (signal) => {
  console.log(`${signal} received — closing server…`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

connectDB().then(() => {
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use.`,
        "Stop the other process (Windows):",
        `netstat -ano | findstr :${PORT}`,
        "then: taskkill /PID <pid> /F",
        "Or set PORT in .env to a different port."
      );
      process.exit(1);
    }
    throw err;
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
});
