import Workspace from "../models/Workspace.js";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import {
  workspaceChannelFilter,
  ensurePersonalPrivateChannel,
} from "../utils/channelHelpers.js";

// GET /api/workspaces
export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ members: req.user._id })
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    res.status(200).json(workspaces);
  } catch (error) {
    console.error("GetWorkspaces error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/workspaces
export const createWorkspace = async (req, res) => {
  try {
    const { name, icon } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const workspace = new Workspace({
      name,
      icon: icon || "💼",
      owner: req.user._id,
      members: [req.user._id],
    });

    await workspace.save();

    const generalChannel = new Channel({
      name: "general",
      workspace: workspace._id,
      workspaceId: workspace._id,
      isPrivate: false,
      createdBy: req.user._id,
      owner: req.user._id,
      members: workspace.members,
    });

    const randomChannel = new Channel({
      name: "random",
      workspace: workspace._id,
      workspaceId: workspace._id,
      isPrivate: false,
      createdBy: req.user._id,
      owner: req.user._id,
      members: workspace.members,
    });

    await generalChannel.save();
    await randomChannel.save();

    workspace.channels.push(generalChannel._id, randomChannel._id);
    await workspace.save();

    await ensurePersonalPrivateChannel(workspace._id, req.user);

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    console.log(`Workspace created: ${name} by ${req.user.email}`);
    res.status(201).json(populatedWorkspace);
  } catch (error) {
    console.error("CreateWorkspace error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/workspaces/:id
export const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isMember = workspace.members.some(
      (member) => member._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this workspace" });
    }

    res.status(200).json(workspace);
  } catch (error) {
    console.error("GetWorkspaceById error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/workspaces/:id
export const updateWorkspace = async (req, res) => {
  try {
    const { name, icon } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the workspace owner can update it" });
    }

    if (name) workspace.name = name;
    if (icon) workspace.icon = icon;

    await workspace.save();

    const updatedWorkspace = await Workspace.findById(workspace._id)
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    res.status(200).json(updatedWorkspace);
  } catch (error) {
    console.error("UpdateWorkspace error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/workspaces/:id
export const deleteWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the workspace owner can delete it" });
    }

    const channels = await Channel.find(workspaceChannelFilter(workspace._id));
    const channelIds = channels.map((c) => c._id);

    if (channelIds.length > 0) {
      await Message.deleteMany({
        $or: [
          { channelId: { $in: channelIds } },
          { channel: { $in: channelIds } },
        ],
      });
    }

    await Channel.deleteMany(workspaceChannelFilter(workspace._id));
    await Workspace.findByIdAndDelete(workspace._id);

    console.log(`Workspace deleted: ${workspace.name} by ${req.user.email}`);
    res.status(200).json({ message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("DeleteWorkspace error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/workspaces/:id/members
export const addMember = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const workspace = await Workspace.findById(req.params.id);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (workspace.members.includes(userId)) {
      return res.status(400).json({ message: "User is already a member" });
    }

    workspace.members.push(userId);
    await workspace.save();

    await Channel.updateMany(
      { ...workspaceChannelFilter(workspace._id), isPrivate: false },
      { $addToSet: { members: userId } }
    );

    const addedUser = await User.findById(userId);
    if (addedUser) {
      await ensurePersonalPrivateChannel(workspace._id, addedUser);
    }

    const updatedWorkspace = await Workspace.findById(workspace._id)
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    res.status(200).json(updatedWorkspace);
  } catch (error) {
    console.error("AddMember error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/workspaces/join/:code
export const joinByCode = async (req, res) => {
  try {
    let { code } = req.params;

    if (code.startsWith("http")) {
      const parts = code.split("/");
      code = parts[parts.length - 1];
    }

    code = code.toUpperCase();

    const workspace = await Workspace.findOne({ inviteCode: code });
    if (!workspace) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    if (workspace.members.some((m) => m.toString() === req.user._id.toString())) {
      const populated = await Workspace.findById(workspace._id)
        .populate("owner", "fullName email avatar")
        .populate("members", "fullName email avatar status")
        .populate("channels");
      return res.status(200).json(populated);
    }

    workspace.members.push(req.user._id);
    await workspace.save();

    await Channel.updateMany(
      { ...workspaceChannelFilter(workspace._id), isPrivate: false },
      { $addToSet: { members: req.user._id } }
    );

    await ensurePersonalPrivateChannel(workspace._id, req.user);

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    console.log(`User ${req.user.email} joined workspace ${workspace.name} via invite code`);
    res.status(200).json(populatedWorkspace);
  } catch (error) {
    console.error("JoinByCode error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/workspaces/:id/members/:userId
export const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (workspace.owner.toString() === userId) {
      return res.status(400).json({ message: "Cannot remove the workspace owner" });
    }

    workspace.members = workspace.members.filter(
      (member) => member.toString() !== userId
    );
    await workspace.save();

    await Channel.updateMany(
      workspaceChannelFilter(workspace._id),
      { $pull: { members: userId } }
    );

    const updatedWorkspace = await Workspace.findById(workspace._id)
      .populate("owner", "fullName email avatar")
      .populate("members", "fullName email avatar status")
      .populate("channels");

    res.status(200).json(updatedWorkspace);
  } catch (error) {
    console.error("RemoveMember error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
