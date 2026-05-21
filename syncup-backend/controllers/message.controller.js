import Message from "../models/Message.js";
import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";
import { getIO } from "../socket/socket.js";
import { formatMessage, messageChannelFilter } from "../utils/messageHelpers.js";

const canAccessChannel = async (channel, userId) => {
  if (channel.isPrivate) {
    return channel.members.some((m) => m.toString() === userId);
  }
  const wsId = channel.workspaceId || channel.workspace;
  const workspace = await Workspace.findById(wsId);
  return workspace?.members.some((m) => m.toString() === userId);
};

// GET /api/channels/:channelId/messages
export const getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const allowed = await canAccessChannel(channel, req.user._id.toString());
    if (!allowed) {
      return res.status(403).json({ message: "You are not a member of this channel" });
    }

    const messages = await Message.find(messageChannelFilter(channelId))
      .populate("senderId", "fullName email avatar")
      .populate("pinnedBy", "fullName email avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments(messageChannelFilter(channelId));

    res.status(200).json({
      messages: messages.map(formatMessage),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GetMessages error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/channels/:channelId/messages
export const sendMessage = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { text, fileUrl, fileType, fileName, fileSize, system } = req.body;

    if (!text && !fileUrl) {
      return res.status(400).json({ message: "Message must have text or a file" });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const allowed = await canAccessChannel(channel, req.user._id.toString());
    if (!allowed) {
      return res.status(403).json({ message: "You are not a member of this channel" });
    }

    const wsId = channel.workspaceId || channel.workspace;
    const message = new Message({
      workspace: wsId,
      workspaceId: wsId,
      channel: channelId,
      channelId,
      sender: req.user._id,
      senderId: req.user._id,
      text: text || "",
      content: text || "",
      fileUrl,
      fileType,
      fileName,
      fileSize,
      type: system
        ? "system"
        : fileUrl
          ? (fileType === "image" || fileType?.startsWith?.("image/") ? "image" : "file")
          : "text",
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "senderId",
      "fullName email avatar"
    );

    const formatted = formatMessage(populatedMessage);
    const io = getIO();
    io.to(`channel:${channelId}`).emit("new-message", formatted);

    console.log(`Message sent in channel ${channelId} by ${req.user.email}`);
    res.status(201).json(formatted);
  } catch (error) {
    console.error("SendMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/messages/:id
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const senderId = (message.senderId || message.sender)?.toString();
    if (senderId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }

    const deleteWindowMs = 2 * 60 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > deleteWindowMs) {
      return res.status(403).json({ message: "Delete window expired" });
    }

    const channelId = message.channelId || message.channel;
    await Message.findByIdAndDelete(message._id);

    const io = getIO();
    io.to(`channel:${channelId}`).emit("delete-message", {
      messageId: message._id,
      channelId,
    });

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("DeleteMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /api/messages/:id/pin
export const pinMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id).populate(
      "senderId",
      "fullName email avatar"
    );

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const channelId = message.channelId || message.channel;
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    const allowed = await canAccessChannel(channel, req.user._id.toString());
    if (!allowed) {
      return res.status(403).json({ message: "You are not a member of this channel" });
    }

    message.isPinned = !message.isPinned;
    message.pinned = message.isPinned;
    message.pinnedBy = message.isPinned ? req.user._id : undefined;
    message.pinnedAt = message.isPinned ? new Date() : undefined;
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate("senderId", "fullName email avatar")
      .populate("pinnedBy", "fullName email avatar");

    const formatted = formatMessage(populatedMessage);
    const io = getIO();
    io.to(`channel:${channelId}`).emit("pin-message", formatted);

    res.status(200).json(formatted);
  } catch (error) {
    console.error("PinMessage error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
