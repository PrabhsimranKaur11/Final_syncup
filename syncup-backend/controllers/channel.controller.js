import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";
import {
  workspaceChannelFilter,
  getChannelCreatorId,
  formatChannel,
  dedupeChannels,
  ensurePersonalPrivateChannel,
  channelVisibleToUser,
  personalPrivateChannelSlug,
} from "../utils/channelHelpers.js";

const populateChannel = (query) =>
  query
    .populate("members", "fullName email avatar status")
    .populate("createdBy", "fullName email avatar status");

// GET /api/workspaces/:workspaceId/channels
export const getChannels = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isMember = workspace.members.some(
      (member) => member.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "You are not a member of this workspace" });
    }

    await ensurePersonalPrivateChannel(workspaceId, req.user);

    const channels = await populateChannel(
      Channel.find({
        ...workspaceChannelFilter(workspaceId),
        $or: [{ isPrivate: false }, { members: req.user._id }],
      })
    );

    const userId = req.user._id.toString();
    const visible = dedupeChannels(channels).filter((ch) =>
      channelVisibleToUser(ch, userId)
    );

    res.status(200).json(visible.map((ch) => formatChannel(ch, userId)));
  } catch (error) {
    console.error("GetChannels error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/workspaces/:workspaceId/channels
export const createChannel = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    let { name, isPrivate, description } = req.body;

    if (isPrivate && (!name || !String(name).trim())) {
      name = personalPrivateChannelSlug(req.user._id);
    }

    if (!name) {
      return res.status(400).json({ message: "Channel name is required" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isWsMember = workspace.members.some(
      (m) => m.toString() === req.user._id.toString()
    );
    if (!isWsMember) {
      return res.status(403).json({ message: "You are not a member of this workspace" });
    }

    const inviteCode = isPrivate
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : undefined;

    const isPersonalSlug =
      Boolean(isPrivate) && name === personalPrivateChannelSlug(req.user._id);

    if (isPersonalSlug) {
      const existing = await Channel.findOne({
        ...workspaceChannelFilter(workspaceId),
        name,
        isPrivate: true,
      });
      if (existing) {
        const populated = await populateChannel(Channel.findById(existing._id));
        return res
          .status(200)
          .json(formatChannel(populated, req.user._id.toString()));
      }
    }

    const channel = new Channel({
      name,
      description: description || "",
      workspace: workspaceId,
      workspaceId,
      isPrivate: Boolean(isPrivate),
      inviteCode,
      createdBy: req.user._id,
      owner: req.user._id,
      members: isPrivate ? [req.user._id] : workspace.members,
    });

    await channel.save();

    await Workspace.findByIdAndUpdate(workspaceId, {
      $addToSet: { channels: channel._id },
    });

    const populatedChannel = await populateChannel(Channel.findById(channel._id));
    console.log(`Channel created: #${name} in ${workspace.name}`);

    res.status(201).json(formatChannel(populatedChannel, req.user._id.toString()));
  } catch (error) {
    console.error("CreateChannel error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/channels/:id
export const getChannelById = async (req, res) => {
  try {
    const channel = await populateChannel(Channel.findById(req.params.id));

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.isPrivate) {
      const isMember = channel.members.some(
        (member) => member._id.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this private channel" });
      }
    } else {
      const wsId = channel.workspaceId || channel.workspace;
      const workspace = await Workspace.findById(wsId);
      const isWsMember = workspace?.members.some(
        (m) => m.toString() === req.user._id.toString()
      );
      if (!isWsMember) {
        return res.status(403).json({ message: "You are not a member of this workspace" });
      }
    }

    res.status(200).json(formatChannel(channel, req.user._id.toString()));
  } catch (error) {
    console.error("GetChannelById error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/channels/:id
export const updateChannel = async (req, res) => {
  try {
    const { name, isPrivate, description } = req.body;
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (getChannelCreatorId(channel) !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the channel creator can update it" });
    }

    if (name) channel.name = name;
    if (typeof description === "string") channel.description = description;
    if (typeof isPrivate === "boolean") channel.isPrivate = isPrivate;

    await channel.save();

    const updatedChannel = await populateChannel(Channel.findById(channel._id));
    res.status(200).json(formatChannel(updatedChannel, req.user._id.toString()));
  } catch (error) {
    console.error("UpdateChannel error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/channels/:id
export const deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (getChannelCreatorId(channel) !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the channel creator can delete it" });
    }

    const wsId = channel.workspaceId || channel.workspace;
    await Workspace.findByIdAndUpdate(wsId, {
      $pull: { channels: channel._id },
    });

    await Channel.findByIdAndDelete(channel._id);
    res.status(200).json({ message: "Channel deleted successfully" });
  } catch (error) {
    console.error("DeleteChannel error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/channels/:id/members — creator only for private channels
export const addChannelMember = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const channel = await Channel.findById(req.params.id);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.isPrivate && getChannelCreatorId(channel) !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the channel creator can add members" });
    }

    if (channel.members.some((m) => m.toString() === userId)) {
      return res.status(400).json({ message: "User is already a member of this channel" });
    }

    channel.members.push(userId);
    await channel.save();

    const updatedChannel = await populateChannel(Channel.findById(channel._id));
    res.status(200).json(formatChannel(updatedChannel, req.user._id.toString()));
  } catch (error) {
    console.error("AddChannelMember error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/channels/join/:code
export const joinChannelByCode = async (req, res) => {
  try {
    let { code } = req.params;
    code = code.toUpperCase();

    const channel = await Channel.findOne({ inviteCode: code });
    if (!channel) {
      return res.status(404).json({ message: "Invalid channel invite code" });
    }

    if (channel.members.some((m) => m.toString() === req.user._id.toString())) {
      const populated = await populateChannel(Channel.findById(channel._id));
      return res.status(200).json(formatChannel(populated, req.user._id.toString()));
    }

    channel.members.push(req.user._id);
    await channel.save();

    const populated = await populateChannel(Channel.findById(channel._id));
    console.log(`User ${req.user.email} joined private channel #${channel.name} via invite code`);

    res.status(200).json(formatChannel(populated, req.user._id.toString()));
  } catch (error) {
    console.error("JoinChannelByCode error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/workspaces/:workspaceId/channels/dm/:userId
export const getOrCreateDmChannel = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const currentUserId = req.user._id.toString();
    const targetUserId = userId.toString();

    const sortedIds = [currentUserId, targetUserId].sort();
    const dmName = `DM-${sortedIds[0]}-${sortedIds[1]}`;

    let channel = await Channel.findOne({
      name: dmName,
      ...workspaceChannelFilter(workspaceId),
    });

    if (!channel) {
      channel = new Channel({
        name: dmName,
        workspace: workspaceId,
        workspaceId,
        isPrivate: true,
        createdBy: req.user._id,
        owner: req.user._id,
        members: [req.user._id, targetUserId],
        type: "dm",
      });
      await channel.save();

      await Workspace.findByIdAndUpdate(workspaceId, {
        $addToSet: { channels: channel._id },
      });
    }

    const populated = await populateChannel(Channel.findById(channel._id));
    res.status(200).json(formatChannel(populated, req.user._id.toString()));
  } catch (error) {
    console.error("DM error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/channels/:id/members/:userId
export const removeChannelMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const creatorId = getChannelCreatorId(channel);
    if (userId === creatorId) {
      return res.status(400).json({ message: "The channel creator cannot be removed" });
    }

    const isSelfRemoval = userId === req.user._id.toString();
    const isCreator = req.user._id.toString() === creatorId;

    if (!isCreator && !isSelfRemoval) {
      return res.status(403).json({ message: "Only the channel creator can remove members" });
    }

    channel.members = channel.members.filter(
      (member) => member.toString() !== userId
    );
    await channel.save();

    const updatedChannel = await populateChannel(Channel.findById(channel._id));
    res.status(200).json(formatChannel(updatedChannel, req.user._id.toString()));
  } catch (error) {
    console.error("RemoveChannelMember error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addMemberToChannel = addChannelMember;

import { deleteMessage as _deleteMessage } from "./message.controller.js";
export const deleteMessage = _deleteMessage;
