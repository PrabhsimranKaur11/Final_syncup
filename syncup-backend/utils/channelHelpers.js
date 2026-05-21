import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";

/** Query filter that matches channels stored with workspaceId or legacy workspace field */
export const workspaceChannelFilter = (workspaceId) => ({
  $or: [{ workspaceId }, { workspace: workspaceId }],
});

export const getChannelCreatorId = (channel) =>
  (channel?.createdBy?._id || channel?.createdBy || channel?.owner)?.toString();

/** Stable slug for a user's personal private room in a workspace */
export const personalPrivateChannelSlug = (userId) =>
  `private-${userId.toString()}`;

/** Human label e.g. "prabh's" from fullName or email */
export const possessiveDisplayName = (user) => {
  const raw = user?.fullName || user?.email?.split("@")[0] || "user";
  const first = raw.trim().split(/\s+/)[0];
  if (!first) return "My room";
  const lower = first.toLowerCase();
  return `${lower}'s`;
};

/** Personal room = private, single member, that member is the creator */
export const isPersonalPrivateChannel = (channel) => {
  if (!channel?.isPrivate) return false;
  const members = channel.members || [];
  if (members.length !== 1) return false;
  const creatorId = getChannelCreatorId(channel);
  const memberId = (members[0]?._id || members[0])?.toString?.();
  return Boolean(creatorId && memberId && creatorId === memberId);
};

/** Sidebar/header label */
export const getChannelDisplayName = (channel, currentUserId) => {
  if (!channel) return "";
  const slug = channel.name || "";
  if (slug.startsWith("private-") && channel.isPrivate) {
    const ownerId = slug.slice("private-".length);
    if (currentUserId && ownerId === currentUserId.toString()) {
      const creator = channel.createdBy;
      if (creator && typeof creator === "object" && creator.fullName) {
        return possessiveDisplayName(creator);
      }
    }
    const creator = channel.createdBy;
    if (creator && typeof creator === "object") {
      return possessiveDisplayName(creator);
    }
  }
  if (channel.displayName) return channel.displayName;
  return channel.name || "";
};

export const formatChannel = (channel, currentUserId) => {
  if (!channel) return channel;
  const doc = channel.toObject ? channel.toObject() : { ...channel };
  const formatted = {
    ...doc,
    workspaceId: doc.workspaceId || doc.workspace,
    createdBy: doc.createdBy || doc.owner,
    owner: doc.createdBy || doc.owner,
  };
  formatted.displayName = getChannelDisplayName(formatted, currentUserId);
  return formatted;
};

/** Legacy possessive solo room name (e.g. "prachi's") */
export const isLegacyPossessiveRoomName = (name) =>
  Boolean(name) && /'s$/i.test(name) && !name.startsWith("DM-");

/** Owner id for a personal private channel (slug, solo, or legacy possessive name) */
export const getPersonalPrivateOwnerId = (channel) => {
  const slug = channel?.name || "";
  if (slug.startsWith("private-")) return slug.slice("private-".length);
  const creatorId = getChannelCreatorId(channel);
  if (isPersonalPrivateChannel(channel)) return creatorId;
  if (channel?.isPrivate && creatorId && isLegacyPossessiveRoomName(slug)) {
    return creatorId;
  }
  return null;
};

/** Hide another member's personal room; keep shared private channels user belongs to */
export const channelVisibleToUser = (channel, userId) => {
  if (!channel?.isPrivate) return true;
  const uid = userId.toString();
  const members = (channel.members || []).map((m) => (m._id || m).toString());
  if (!members.includes(uid)) return false;

  const slug = channel.name || "";
  const creatorId = getChannelCreatorId(channel);

  if (slug.startsWith("private-")) {
    const ownerId = slug.slice("private-".length);
    return ownerId === uid;
  }

  // Another user's personal room (solo, legacy name, or mis-added workspace members)
  if (creatorId && creatorId !== uid) {
    if (isPersonalPrivateChannel(channel)) return false;
    if (members.length === 1) return false;
    if (isLegacyPossessiveRoomName(slug)) return false;
  }

  if (isPersonalPrivateChannel(channel)) {
    return creatorId === uid;
  }

  if (members.length === 1) {
    return creatorId === uid;
  }

  return true;
};

const preferPersonalChannel = (a, b, ownerId) => {
  const canonical = personalPrivateChannelSlug(ownerId);
  if (a?.name === canonical) return a;
  if (b?.name === canonical) return b;
  return a;
};

/** Remove duplicate channel docs (by _id; collapse personal private per owner) */
export const dedupeChannels = (channels) => {
  if (!Array.isArray(channels)) return [];
  const byId = new Set();
  const publicNames = new Set();
  const personalByOwner = new Map();
  const result = [];

  for (const ch of channels) {
    const id = ch?._id?.toString?.() || String(ch?._id || "");
    if (!id || byId.has(id)) continue;
    byId.add(id);

    const name = ch?.name || "";
    if (!name.startsWith("DM-") && !ch?.isPrivate) {
      const key = name.toLowerCase();
      if (publicNames.has(key)) continue;
      publicNames.add(key);
    }

    const ownerId = getPersonalPrivateOwnerId(ch);
    if (ownerId) {
      const prev = personalByOwner.get(ownerId);
      personalByOwner.set(
        ownerId,
        prev ? preferPersonalChannel(prev, ch, ownerId) : ch
      );
      continue;
    }

    result.push(ch);
  }

  for (const ch of personalByOwner.values()) result.push(ch);
  return result;
};

const generateInviteCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/** Create or return the current user's personal private channel in a workspace */
export const ensurePersonalPrivateChannel = async (workspaceId, user) => {
  const userId = user._id.toString();
  const slug = personalPrivateChannelSlug(userId);

  let channel = await Channel.findOne({
    ...workspaceChannelFilter(workspaceId),
    name: slug,
    isPrivate: true,
  });

  if (!channel) {
    const legacyPersonal = await Channel.findOne({
      ...workspaceChannelFilter(workspaceId),
      isPrivate: true,
      createdBy: user._id,
      $and: [
        { name: { $regex: /'s$/i } },
        { name: { $not: { $regex: /^private-/ } } },
      ],
    });
    if (legacyPersonal) {
      legacyPersonal.name = slug;
      legacyPersonal.members = [user._id];
      legacyPersonal.createdBy = user._id;
      legacyPersonal.owner = user._id;
      await legacyPersonal.save();
      channel = legacyPersonal;
    } else {
      channel = new Channel({
        name: slug,
        description: "Personal private room",
        workspace: workspaceId,
        workspaceId,
        isPrivate: true,
        inviteCode: generateInviteCode(),
        createdBy: user._id,
        owner: user._id,
        members: [user._id],
      });
      await channel.save();
      await Workspace.findByIdAndUpdate(workspaceId, {
        $addToSet: { channels: channel._id },
      });
    }
  }

  if (channel) {
    const creatorId = getChannelCreatorId(channel);
    if (creatorId !== userId) {
      channel.createdBy = user._id;
      await channel.save();
    }
    if (!channel.members.some((m) => m.toString() === userId)) {
      channel.members = [user._id];
      await channel.save();
    }

    await Channel.deleteMany({
      ...workspaceChannelFilter(workspaceId),
      isPrivate: true,
      createdBy: user._id,
      _id: { $ne: channel._id },
      $and: [
        { name: { $regex: /'s$/i } },
        { name: { $not: { $regex: /^private-/ } } },
      ],
    });
  }

  return channel;
};
