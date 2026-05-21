import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getMessages, sendMessage, deleteMessage, pinMessage } from "../controllers/message.controller.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import protectRoute from "../middleware/auth.middleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");

const router = express.Router();

const appendDebugLog = (entry) => {
  try {
    const logPath = path.join(__dirname, "..", "..", "debug-c75bf6.log");
    fs.appendFileSync(logPath, `${JSON.stringify({ ...entry, timestamp: Date.now() })}\n`);
  } catch { /* ignore */ }
};

const isAllowedDownloadUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== "string") return false;
  if (urlStr.startsWith("/api/uploads/")) return true;
  try {
    const host = new URL(urlStr).hostname;
    return host.includes("res.cloudinary.com");
  } catch {
    return false;
  }
};

// GET /api/files/download?url=...&name=...
router.get("/files/download", protectRoute, async (req, res) => {
  const { url, name } = req.query;
  if (!url || !isAllowedDownloadUrl(String(url))) {
    return res.status(400).json({ message: "Invalid download URL" });
  }

  let fetchUrl = String(url);
  if (fetchUrl.startsWith("/api/uploads/")) {
    fetchUrl = `${req.protocol}://${req.get("host")}${fetchUrl}`;
  }

  try {
    const upstream = await fetch(fetchUrl);
    appendDebugLog({
      sessionId: "c75bf6",
      hypothesisId: "C",
      location: "message.routes.js:files/download",
      message: "proxy download",
      data: { url: String(url), fetchUrl, ok: upstream.ok, status: upstream.status },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ message: "File not found upstream" });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const safeName = String(name || path.basename(fetchUrl) || "download").replace(/[^\w.\-() ]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    const ct = upstream.headers.get("content-type");
    if (ct) res.setHeader("Content-Type", ct);
    return res.send(buf);
  } catch (err) {
    console.error("Download proxy error:", err.message);
    return res.status(500).json({ message: "Download failed" });
  }
});

// 100MB max (videos); non-video uploads validated client-side at 50MB
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

// Message routes scoped under /api/channels/:channelId/messages
router.get("/channels/:channelId/messages", protectRoute, getMessages);
router.post("/channels/:channelId/messages", protectRoute, sendMessage);

// Message route scoped under /api/messages/:id
router.delete("/messages/:id", protectRoute, deleteMessage);
router.patch("/messages/:id/pin", protectRoute, pinMessage);

// File upload route — POST /api/upload
router.post("/upload", protectRoute, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File too large (max 100MB)" });
      }
      console.error("Multer upload error:", err.message);
      return res.status(400).json({ message: err.message || "Invalid file upload" });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file provided" });
    }

    const preferLocal = process.env.USE_LOCAL_UPLOADS === 'true';
    const hasCloudinary = !preferLocal && Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (hasCloudinary) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, "syncup/files");
        const mime = req.file.mimetype || '';
        const fileType = mime.startsWith('image/')
          ? 'image'
          : mime.startsWith('video/')
            ? 'video'
            : mime;
        const cloudPayload = {
          fileUrl: result.secure_url,
          fileType,
          fileName: req.file.originalname,
          fileSize: req.file.size,
        };
        appendDebugLog({
          sessionId: "c75bf6",
          hypothesisId: "A",
          location: "message.routes.js:upload:cloudinary",
          message: "cloudinary upload ok",
          data: { fileUrl: cloudPayload.fileUrl, fileName: cloudPayload.fileName },
        });
        return res.status(200).json(cloudPayload);
      } catch (cloudErr) {
        console.error("Cloudinary upload failed, using local storage:", cloudErr.message);
      }
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const safeName = req.file.originalname.replace(/[^\w.\-() ]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);

    const mime = req.file.mimetype || '';
    const fileType = mime.startsWith('image/')
      ? 'image'
      : mime.startsWith('video/')
        ? 'video'
        : mime;
    const payload = {
      fileUrl: `/api/uploads/${filename}`,
      fileType,
      fileName: req.file.originalname,
      fileSize: req.file.size,
    };
    appendDebugLog({
      sessionId: "c75bf6",
      hypothesisId: "E",
      location: "message.routes.js:upload:local",
      message: "local upload ok",
      data: { fileUrl: payload.fileUrl, filename },
    });
    res.status(200).json(payload);
  } catch (error) {
    console.error("File upload error:", error.message);
    res.status(500).json({ message: "File upload failed" });
  }
});

export default router;
