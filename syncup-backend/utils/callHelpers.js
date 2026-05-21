import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import CallLog from '../models/CallLog.js';
import { workspaceChannelFilter } from './channelHelpers.js';
import { formatMessage } from './messageHelpers.js';
import { getIO } from '../socket/socket.js';

export const formatCallDuration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  if (s < 1) return '0 sec';
  if (s < 60) return `${s} sec`;
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
};

export const callTypeLabel = (callType) => (callType === 'video' ? 'Video' : 'Voice');

export const findOrCreateDmChannel = async (workspaceId, userIdA, userIdB) => {
  const a = String(userIdA);
  const b = String(userIdB);
  const sortedIds = [a, b].sort();
  const dmName = `DM-${sortedIds[0]}-${sortedIds[1]}`;

  let channel = await Channel.findOne({
    name: dmName,
    ...workspaceChannelFilter(workspaceId),
  });

  if (!channel) {
    channel = await Channel.create({
      name: dmName,
      workspace: workspaceId,
      workspaceId,
      isPrivate: true,
      createdBy: userIdA,
      owner: userIdA,
      members: [userIdA, userIdB],
      type: 'dm',
    });
  }

  return channel;
};

export const emitCallSystemMessage = async (channelId, text, senderId) => {
  const channel = await Channel.findById(channelId);
  if (!channel) throw new Error(`Channel not found: ${channelId}`);
  const wsId = channel.workspaceId || channel.workspace;

  const message = await Message.create({
    workspace: wsId,
    workspaceId: wsId,
    channel: channelId,
    channelId,
    sender: senderId,
    senderId,
    text,
    content: text,
    type: 'system',
  });

  const populated = await Message.findById(message._id).populate(
    'senderId',
    'fullName email avatar'
  );
  const formatted = formatMessage(populated);
  const io = getIO();
  io.to(`channel:${channelId}`).emit('new-message', formatted);
  return formatted;
};

export const updateCallSystemMessage = async (messageId, channelId, text) => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    { content: text },
    { new: true }
  ).populate('senderId', 'fullName email avatar');

  if (!message) return null;

  const formatted = formatMessage(message);
  const io = getIO();
  io.to(`channel:${channelId}`).emit('message-updated', formatted);
  return formatted;
};

const terminalStatuses = new Set(['missed', 'declined', 'canceled', 'ended']);

export const finalizeCallLog = async (callLogId, {
  status,
  durationSeconds = 0,
  endedBy,
  callerName,
  skipSystemMessage = false,
}) => {
  const log = await CallLog.findById(callLogId);
  if (!log) return { log: null, message: null, skipped: true };

  const typeLabel = callTypeLabel(log.callType);
  const name = callerName || 'Someone';

  if (status === 'ringing') {
    if (log.incomingMessagePosted && log.incomingMessageId) {
      return { log, message: null, skipped: true };
    }
    const text = `📞 Incoming ${typeLabel.toLowerCase()} call from ${name}`;
    const message = await emitCallSystemMessage(log.channelId, text, log.callerId);
    log.incomingMessagePosted = true;
    log.incomingMessageId = message._id;
    await log.save();
    return { log, message, skipped: false };
  }

  if (terminalStatuses.has(log.status) && status !== 'accepted') {
    return { log, message: null, skipped: true };
  }

  const updates = { status };
  if (durationSeconds > 0) updates.durationSeconds = durationSeconds;
  if (status === 'accepted') {
    updates.startedAt = log.startedAt || new Date();
  }
  if (terminalStatuses.has(status)) {
    updates.endedAt = new Date();
  }

  Object.assign(log, updates);
  await log.save();

  if (skipSystemMessage || status === 'accepted' || status === 'canceled') {
    return { log, message: null, skipped: false };
  }

  const callerId = String(log.callerId);
  const endedById = endedBy ? String(endedBy) : null;

  let effectiveDuration = durationSeconds;
  if (status === 'ended' && effectiveDuration < 1 && log.startedAt && log.endedAt) {
    effectiveDuration = Math.max(
      0,
      Math.floor((log.endedAt.getTime() - log.startedAt.getTime()) / 1000)
    );
  }

  let text = '';
  if (status === 'ended' && effectiveDuration > 0 && log.startedAt) {
    text = `${typeLabel} call · ${formatCallDuration(effectiveDuration)}`;
  } else if (status === 'declined') {
    text = `📞 ${typeLabel} call declined`;
  } else if (status === 'missed') {
    if (endedById === callerId) {
      text = '📞 No answer';
    } else {
      text = `📞 Missed call from ${name}`;
    }
  }

  if (!text) return { log, message: null, skipped: false };

  // Replace the ringing line with missed/declined (WhatsApp-style)
  if (
    log.incomingMessageId &&
    (status === 'missed' || status === 'declined')
  ) {
    const message = await updateCallSystemMessage(
      log.incomingMessageId,
      log.channelId,
      text
    );
    return { log, message, skipped: false };
  }

  const message = await emitCallSystemMessage(log.channelId, text, log.callerId);
  return { log, message, skipped: false };
};

export const createRingingCall = async ({
  callerId,
  calleeId,
  workspaceId,
  callType,
  callerName,
  contextChannelId,
  dmChannel: existingDmChannel,
}) => {
  const existing = await CallLog.findOne({
    callerId,
    calleeId,
    status: 'ringing',
    createdAt: { $gte: new Date(Date.now() - 30_000) },
  });

  if (existing) {
    const dmChannel = await Channel.findById(existing.channelId);
    return { log: existing, dmChannel, message: null, reused: true };
  }

  const dmChannel = existingDmChannel
    || await findOrCreateDmChannel(workspaceId, callerId, calleeId);

  const log = await CallLog.create({
    callerId,
    calleeId,
    channelId: dmChannel._id,
    contextChannelId: contextChannelId || undefined,
    workspaceId,
    callType: callType || 'audio',
    status: 'ringing',
  });

  const { message } = await finalizeCallLog(log._id, {
    status: 'ringing',
    callerName,
  });

  return { log, dmChannel, message, reused: false };
};
