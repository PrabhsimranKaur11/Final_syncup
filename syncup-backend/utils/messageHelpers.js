/** Normalize MIME or legacy type to UI category */
export const fileDisplayCategory = (fileType) => {
  if (!fileType) return 'file';
  if (fileType === 'image' || fileType.startsWith('image/')) return 'image';
  return 'file';
};

const isCallOrSystemText = (text) => (
  /📞|incoming\s+(voice|video)\s+call|missed call|no answer|call declined|work call scheduled|scheduled work call cancelled|(?:voice|video)\s+call\s*·/i.test(text || '')
);

/** Map DB message document to API shape expected by the frontend */
export const formatMessage = (msg) => {
  if (!msg) return msg;
  const doc = msg.toObject ? msg.toObject() : { ...msg };
  const rawSender = doc.senderId ?? doc.sender;
  const sender = (typeof rawSender === 'object' && rawSender !== null) ? rawSender : null;
  const channel = doc.channelId || doc.channel;
  const text = doc.content ?? doc.text ?? '';
  const isSystem = doc.type === 'system' || isCallOrSystemText(text);

  return {
    ...doc,
    _id: doc._id,
    type: isSystem ? 'system' : doc.type,
    channel: typeof channel === 'object' ? channel._id : channel,
    channelId: typeof channel === 'object' ? channel._id : channel,
    sender,
    senderId: sender,
    text,
    content: text,
    pinned: doc.isPinned ?? doc.pinned ?? false,
    isPinned: doc.isPinned ?? doc.pinned ?? false,
    pinnedBy: doc.pinnedBy,
    pinnedAt: doc.pinnedAt,
    fileUrl: doc.fileUrl,
    fileType: doc.fileType,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt,
    system: isSystem,
  };
};

export const messageChannelFilter = (channelId) => ({
  $or: [{ channelId }, { channel: channelId }],
});
