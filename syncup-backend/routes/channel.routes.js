import express from "express";
import {
  getChannels,
  createChannel,
  getChannelById,
  updateChannel,
  deleteChannel,
  addChannelMember,
  removeChannelMember,
  joinChannelByCode,
  getOrCreateDmChannel,
} from "../controllers/channel.controller.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Routes scoped under /api/workspaces/:workspaceId/channels
router.get("/workspaces/:workspaceId/channels", protectRoute, getChannels);
router.post("/workspaces/:workspaceId/channels", protectRoute, createChannel);
router.post("/workspaces/:workspaceId/channels/dm/:userId", protectRoute, getOrCreateDmChannel);

// Join private channel by invite code
router.post("/channels/join/:code", protectRoute, joinChannelByCode);

// Routes scoped under /api/channels/:id
router.get("/channels/:id", protectRoute, getChannelById);
router.patch("/channels/:id", protectRoute, updateChannel);
router.delete("/channels/:id", protectRoute, deleteChannel);
router.post("/channels/:id/members", protectRoute, addChannelMember);
router.delete("/channels/:id/members/:userId", protectRoute, removeChannelMember);

export default router;
