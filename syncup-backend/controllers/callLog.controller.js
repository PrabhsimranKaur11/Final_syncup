import CallLog from '../models/CallLog.js';
import Channel from '../models/Channel.js';
import Workspace from '../models/Workspace.js';
import { finalizeCallLog } from '../utils/callHelpers.js';

const canAccessChannel = async (channel, userId) => {
  if (channel.isPrivate) {
    return channel.members?.some((m) => m.toString() === userId);
  }
  const wsId = channel.workspaceId || channel.workspace;
  const workspace = await Workspace.findById(wsId);
  return workspace?.members?.some((m) => m.toString() === userId);
};

// POST /api/calls/log
export const logCallEvent = async (req, res) => {
  try {
    const {
      callLogId,
      status,
      durationSeconds,
      callerId,
      calleeId,
      channelId,
      workspaceId,
      callType,
      contextChannelId,
    } = req.body;

    const userId = req.user._id.toString();

    if (callLogId) {
      const log = await CallLog.findById(callLogId);
      if (!log) {
        return res.status(404).json({ message: 'Call log not found' });
      }
      if (![log.callerId.toString(), log.calleeId.toString()].includes(userId)) {
        return res.status(403).json({ message: 'Not a participant in this call' });
      }

      const { log: updated, message, skipped } = await finalizeCallLog(callLogId, {
        status,
        durationSeconds,
        endedBy: userId,
      });

      return res.status(200).json({ callLog: updated, message, skipped });
    }

    if (!callerId || !calleeId || !channelId || !status) {
      return res.status(400).json({ message: 'Missing required call log fields' });
    }

    if (![callerId, calleeId].includes(userId)) {
      return res.status(403).json({ message: 'Not a participant in this call' });
    }

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const allowed = await canAccessChannel(channel, userId);
    if (!allowed) {
      return res.status(403).json({ message: 'You are not a member of this channel' });
    }

    const log = await CallLog.create({
      callerId,
      calleeId,
      channelId,
      workspaceId,
      contextChannelId,
      callType: callType || 'audio',
      status,
      durationSeconds: durationSeconds || 0,
      startedAt: new Date(),
      endedAt: ['ended', 'missed', 'declined', 'canceled'].includes(status) ? new Date() : undefined,
    });

    const { message } = await finalizeCallLog(log._id, {
      status,
      durationSeconds,
      endedBy: userId,
    });

    res.status(201).json({ callLog: log, message });
  } catch (error) {
    console.error('logCallEvent error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// GET /api/channels/:channelId/calls
export const getChannelCallHistory = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const allowed = await canAccessChannel(channel, req.user._id.toString());
    if (!allowed) {
      return res.status(403).json({ message: 'You are not a member of this channel' });
    }

    const calls = await CallLog.find({ channelId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('callerId', 'fullName email avatar')
      .populate('calleeId', 'fullName email avatar');

    res.status(200).json({ calls });
  } catch (error) {
    console.error('getChannelCallHistory error:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
