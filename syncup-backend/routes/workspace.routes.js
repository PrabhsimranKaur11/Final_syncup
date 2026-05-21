import express from "express";
import {
  getWorkspaces,
  createWorkspace,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
  joinByCode,
} from "../controllers/workspace.controller.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getWorkspaces);
router.post("/", protectRoute, createWorkspace);
router.post("/join/:code", protectRoute, joinByCode);
router.get("/:id", protectRoute, getWorkspaceById);
router.patch("/:id", protectRoute, updateWorkspace);
router.delete("/:id", protectRoute, deleteWorkspace);
router.post("/:id/members", protectRoute, addMember);
router.delete("/:id/members/:userId", protectRoute, removeMember);

export default router;
