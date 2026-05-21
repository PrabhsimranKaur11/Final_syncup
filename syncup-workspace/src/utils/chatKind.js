/** UI chat mode — distinct from Channel.type (text | voice | dm). */
export const getChatKind = (chat) => {
  if (!chat) return null;
  if (chat.chatKind === 'channel' || chat.chatKind === 'dm') return chat.chatKind;
  if (chat.peerUserId || chat.type === 'dm') return 'dm';
  if (chat.type === 'channel') return 'channel';
  if ((chat._id || chat.id) && chat.name != null && chat.type !== 'dm') return 'channel';
  return null;
};

export const isChannelChat = (chat) => getChatKind(chat) === 'channel';
export const isDmChat = (chat) => getChatKind(chat) === 'dm';
