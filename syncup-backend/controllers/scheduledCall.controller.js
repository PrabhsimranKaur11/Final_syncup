import ScheduledCall from '../models/ScheduledCall.js';
import Channel from '../models/Channel.js';
import Workspace from '../models/Workspace.js';
import Message from '../models/Message.js';
import { getIO } from '../socket/socket.js';
import { getChannelCreatorId } from '../utils/channelHelpers.js';
import { formatMessage } from '../utils/messageHelpers.js';

const canAccessChannel = async (channel, userId) => {
  if (channel.isPrivate) {
    return channel.members?.some((m) => m.toString() === userId);
  }
  const wsId = channel.workspaceId || channel.workspace;
  const workspace = await Workspace.findById(wsId);
  return workspace?.members?.some((m) => m.toString() === userId);
};

const canScheduleCall = async (workspace, channel, userId) => {
  const uid = userId.toString();
  if (!workspace?.members?.some((m) => m.toString() === uid)) return false;
  if (workspace.owner?.toString() === uid) return true;
  if (getChannelCreatorId(channel) === uid) return true;
  if (channel.type === 'dm') {
    return channel.members?.some((m) => m.toString() === uid);
  }
  return await canAccessChannel(channel, uid);
};

const formatScheduledCall = (doc) => {
  const call = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...call,
    _id: call._id,
    scheduledBy: call.scheduledBy,
    participants: call.participants,
  };
};

// POST /api/workspaces/:workspaceId/scheduled-calls
export const createScheduledCall = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { channelId, scheduledAt, title, participants } = req.body;

    if (!channelId || !scheduledAt || !title?.trim()) {
      return res.status(400).json({ message: 'channelId, scheduledAt, and title are required' });
    }

    const at = new Date(scheduledAt);
    if (Number.isNaN(at.getTime()) || at <= new Date()) {
      return res.status(400).json({ message: 'scheduledAt must be a valid future date' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const allowed = await canScheduleCall(workspace, channel, req.user._id);
    if (!allowed) {
      return res.status(403).json({ message: 'You do not have permission to schedule calls here' });
    }

    const participantIds = Array.isArray(participants) && participants.length > 0
      ? participants
      : (channel.members?.length ? channel.members : [req.user._id]);

    const call = await ScheduledCall.create({
      workspaceId,
      channelId,
      scheduledBy: req.user._id,
      scheduledAt: at,
      title: title.trim(),
      participants: participantIds,
      status: 'scheduled',
    });

    const populated = await ScheduledCall.findById(call._id)
      .populate('scheduledBy', 'fullName email avatar')
      .populate('participants', 'fullName email avatar');

    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const when = formatter.format(at);
    const schedulerName = req.user.fullName || req.user.email || 'Someone';

    const systemText = `Work call scheduled: "${title.trim()}" — ${when} (by ${schedulerName})`;
    const wsId = channel.workspaceId || channel.workspace || workspaceId;
    const systemMessage = await Message.create({
      workspace: wsId,
      workspaceId: wsId,
      channel: channelId,
      channelId,
      sender: req.user._id,
      senderId: req.user._id,
      text: systemText,
      content: systemText,
      type: 'system',
    });

    const populatedMessage = await Message.findById(systemMessage._id).populate(
      'senderId',
      'fullName email avatar'
    );
    const formattedMessage = formatMessage(populatedMessage);

    const io = getIO();
    io.to(`channel:${channelId}`).emit('new-message', formattedMessage);
    io.to(`workspace:${workspaceId}`).emit('scheduled-call:created', {
      call: formatScheduledCall(populated),
      message: formattedMessage,
    });

    res.status(201).json({
      call: formatScheduledCall(populated),
      message: formattedMessage,
    });
  } catch (error) {
    console.error('CreateScheduledCall error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/workspaces/:workspaceId/scheduled-calls
export const listScheduledCalls = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { channelId, status = 'scheduled' } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.members?.some((m) => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ message: 'Not a workspace member' });
    }

    const filter = {
      workspaceId,
      status,
      scheduledAt: { $gte: new Date() },
    };
    if (channelId) filter.channelId = channelId;

    const calls = await ScheduledCall.find(filter)
      .populate('scheduledBy', 'fullName email avatar')
      .populate('participants', 'fullName email avatar')
      .sort({ scheduledAt: 1 })
      .limit(50);

    res.status(200).json({ calls: calls.map(formatScheduledCall) });
  } catch (error) {
    console.error('ListScheduledCalls error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// DELETE /api/workspaces/:workspaceId/scheduled-calls/:callId
export const cancelScheduledCall = async (req, res) => {
  try {
    const { workspaceId, callId } = req.params;

    const call = await ScheduledCall.findById(callId);
    if (!call || call.workspaceId.toString() !== workspaceId) {
      return res.status(404).json({ message: 'Scheduled call not found' });
    }

    if (call.status !== 'scheduled') {
      return res.status(400).json({ message: 'Call is already cancelled or completed' });
    }

    const workspace = await Workspace.findById(workspaceId);
    const channel = await Channel.findById(call.channelId);
    if (!workspace || !channel) {
      return res.status(404).json({ message: 'Workspace or channel not found' });
    }

    const uid = req.user._id.toString();
    const isScheduler = call.scheduledBy.toString() === uid;
    const isOwner = workspace.owner?.toString() === uid;
    const isCreator = getChannelCreatorId(channel) === uid;

    if (!isScheduler && !isOwner && !isCreator) {
      return res.status(403).json({ message: 'You cannot cancel this scheduled call' });
    }

    call.status = 'cancelled';
    await call.save();

    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const when = formatter.format(call.scheduledAt);
    const canceller = req.user.fullName || req.user.email || 'Someone';
    const systemText = `Scheduled work call cancelled: "${call.title}" — was ${when} (by ${canceller})`;

    const wsId = channel.workspaceId || channel.workspace || workspaceId;
    const systemMessage = await Message.create({
      workspace: wsId,
      workspaceId: wsId,
      channel: call.channelId,
      channelId: call.channelId,
      sender: req.user._id,
      senderId: req.user._id,
      text: systemText,
      content: systemText,
      type: 'system',
    });

    const populatedMessage = await Message.findById(systemMessage._id).populate(
      'senderId',
      'fullName email avatar'
    );
    const formattedMessage = formatMessage(populatedMessage);

    const io = getIO();
    io.to(`channel:${call.channelId}`).emit('new-message', formattedMessage);
    io.to(`workspace:${workspaceId}`).emit('scheduled-call:cancelled', {
      callId: call._id,
      call: formatScheduledCall(call),
      message: formattedMessage,
    });

    res.status(200).json({
      call: formatScheduledCall(call),
      message: formattedMessage,
    });
  } catch (error) {
    console.error('CancelScheduledCall error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
