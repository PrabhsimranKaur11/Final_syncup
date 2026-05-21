const getCreatorId = (channel) =>
  (channel?.createdBy?._id || channel?.createdBy || channel?.owner)?.toString?.();

export const isPersonalPrivateChannel = (channel) => {
  if (!channel?.isPrivate) return false;
  const members = channel.members || [];
  if (members.length !== 1) return false;
  const creatorId = getCreatorId(channel);
  const memberId = (members[0]?._id || members[0])?.toString?.();
  return Boolean(creatorId && memberId && creatorId === memberId);
};

const isLegacyPossessiveRoomName = (name) =>
  Boolean(name) && /'s$/i.test(name) && !name.startsWith('DM-');

export const getPersonalPrivateOwnerId = (channel) => {
  const slug = channel?.name || '';
  if (slug.startsWith('private-')) return slug.slice('private-'.length);
  const creatorId = getCreatorId(channel);
  if (isPersonalPrivateChannel(channel)) return creatorId;
  if (channel?.isPrivate && creatorId && isLegacyPossessiveRoomName(slug)) {
    return creatorId;
  }
  return null;
};

/** Matches backend channelVisibleToUser */
export const channelVisibleToUser = (channel, userId) => {
  if (!channel?.isPrivate) return true;
  const uid = userId?.toString?.() || String(userId || '');
  const members = (channel.members || []).map((m) => (m._id || m).toString());
  if (!members.includes(uid)) return false;

  const slug = channel.name || '';
  const creatorId = getCreatorId(channel);

  if (slug.startsWith('private-')) {
    return slug.slice('private-'.length) === uid;
  }

  if (creatorId && creatorId !== uid) {
    if (isPersonalPrivateChannel(channel)) return false;
    if (members.length === 1) return false;
    if (isLegacyPossessiveRoomName(slug)) return false;
  }

  if (isPersonalPrivateChannel(channel)) return creatorId === uid;
  if (members.length === 1) return creatorId === uid;
  return true;
};

const preferPersonalChannel = (a, b, ownerId) => {
  const canonical = `private-${ownerId}`;
  if (a?.name === canonical) return a;
  if (b?.name === canonical) return b;
  return a;
};

/** Matches backend dedupeChannels */
export const dedupeChannels = (list) => {
  if (!Array.isArray(list)) return [];
  const byId = new Set();
  const publicNames = new Set();
  const personalByOwner = new Map();
  const result = [];

  for (const ch of list) {
    const id = ch?._id?.toString?.() || String(ch?._id || '');
    if (!id || byId.has(id)) continue;
    byId.add(id);

    const name = ch?.name || '';
    if (!name.startsWith('DM-') && !ch?.isPrivate) {
      const key = name.toLowerCase();
      if (publicNames.has(key)) continue;
      publicNames.add(key);
    }

    const ownerId = getPersonalPrivateOwnerId(ch);
    if (ownerId) {
      const prev = personalByOwner.get(ownerId);
      personalByOwner.set(ownerId, prev ? preferPersonalChannel(prev, ch, ownerId) : ch);
      continue;
    }

    result.push(ch);
  }

  for (const ch of personalByOwner.values()) result.push(ch);
  return result;
};

/** Label for sidebar/header (matches backend channelHelpers logic) */
export const getChannelDisplayName = (channel, currentUserId) => {
  if (!channel) return '';
  if (channel.displayName) return channel.displayName;

  const slug = channel.name || '';
  const uid = currentUserId?.toString?.() || String(currentUserId || '');

  if (slug.startsWith('private-') && channel.isPrivate) {
    const ownerId = slug.slice('private-'.length);
    if (uid && ownerId === uid) {
      const creator = channel.createdBy;
      if (creator && typeof creator === 'object') {
        const raw = creator.fullName || creator.email?.split('@')[0] || 'you';
        const first = raw.trim().split(/\s+/)[0];
        return first ? `${first.toLowerCase()}'s` : 'My room';
      }
      return 'My room';
    }
    const creator = channel.createdBy;
    if (creator && typeof creator === 'object') {
      const raw = creator.fullName || creator.email?.split('@')[0] || 'user';
      const first = raw.trim().split(/\s+/)[0];
      return first ? `${first.toLowerCase()}'s` : slug;
    }
  }

  return channel.name || '';
};

export const getDmChannelSlug = (userIdA, userIdB) => {
  const sorted = [String(userIdA), String(userIdB)].sort();
  return `DM-${sorted[0]}-${sorted[1]}`;
};

/** Find existing DM channel document for a peer (avoids stale channelId flicker). */
export const findDmChannel = (channels, peerUserId, currentUserId) => {
  if (!Array.isArray(channels) || !peerUserId || !currentUserId) return null;
  const slug = getDmChannelSlug(peerUserId, currentUserId);
  return channels.find((c) => c.name === slug)
    || channels.find((c) => c.type === 'dm' && c.name === slug)
    || null;
};

export const getDmUnreadForPeer = (channels, peerUserId, currentUserId) => {
  const ch = findDmChannel(channels, peerUserId, currentUserId);
  return ch?.unread > 0 ? ch.unread : 0;
};
