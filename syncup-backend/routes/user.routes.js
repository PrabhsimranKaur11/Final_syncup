import express from "express";
import multer from "multer";
import { getAllUsers, getUserById, updateUser, updateUserStatus } from "../controllers/user.controller.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Multer memory storage for avatar uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", protectRoute, getAllUsers);
router.get("/:id", protectRoute, getUserById);
router.patch("/:id", protectRoute, upload.single("avatar"), updateUser);
router.patch("/:id/status", protectRoute, updateUserStatus);

export default router;
