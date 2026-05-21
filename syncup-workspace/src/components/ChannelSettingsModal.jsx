// syncup-workspace/src/components/ChannelSettingsModal.jsx
// NEW FILE — Drop into src/components/

import { useState, useEffect, useRef } from 'react';
import {
  X, Settings, Users, Shield, Crown, UserMinus,
  UserPlus, Lock, Hash, Search, Loader2, Check,
} from 'lucide-react';
import channelAPI from '../services/api'; // adjust import path as needed

// ─── Utility: generate avatar initials background ────────────────────────────
const avatarBg = (color) =>
  color || 'bg-gradient-to-br from-blue-500 to-purple-600';

export default function ChannelSettingsModal({
  channel,           // { _id, name, isPrivate, createdBy, members: [...] }
  currentUser,       // { _id, name, ... }
  workspaceMembers,  // all users in the workspace
  onClose,
  onChannelUpdated,  // (updatedChannel) => void
  onKicked,          // (userId) => void  — called on self-kick for redirect
}) {
  const [tab, setTab] = useState('members'); // 'members' | 'invite'
  const [members, setMembers] = useState(channel.members || []);
  const [search, setSearch] = useState('');
  const [inviteSearch, setInviteSearch] = useState('');
  const [kicking, setKicking] = useState(null);   // userId being kicked
  const [inviting, setInviting] = useState(null); // userId being invited
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isCreator =
    channel.createdBy?._id?.toString() === currentUser._id?.toString() ||
    channel.createdBy?.toString() === currentUser._id?.toString();

  // ── Derived ────────────────────────────────────────────────────────────────
  const memberIds = new Set(members.map((m) => m._id?.toString() || m.toString()));

  const filteredMembers = members.filter((m) => {
    const name = m.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const invitablemembers = (workspaceMembers || []).filter((m) => {
    const id = m._id?.toString();
    return (
      !memberIds.has(id) &&
      m.name?.toLowerCase().includes(inviteSearch.toLowerCase())
    );
  });

  // ── Kick handler ───────────────────────────────────────────────────────────
  const handleKick = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from #${channel.name}?`)) return;
    setError('');
    setKicking(userId);
    try {
      await channelAPI.kickMember(channel._id, userId);
      setMembers((prev) =>
        prev.filter((m) => (m._id || m).toString() !== userId)
      );
      setSuccess(`${userName} was removed.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setKicking(null);
    }
  };

  // ── Invite handler ─────────────────────────────────────────────────────────
  const handleInvite = async (userId) => {
    setError('');
    setInviting(userId);
    try {
      const { data } = await channelAPI.addMember(channel._id, userId);
      setMembers(data.members);
      setSuccess('Member added!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#1e2228] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh] overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            {channel.isPrivate ? (
              <Lock size={16} className="text-yellow-400" />
            ) : (
              <Hash size={16} className="text-gray-400" />
            )}
            <div>
              <h2 className="text-white font-semibold text-base leading-tight">
                {channel.name}
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {channel.isPrivate ? 'Private channel' : 'Public channel'} ·{' '}
                {members.length} member{members.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-6 pt-3 pb-2 border-b border-white/10 shrink-0">
          {[
            { id: 'members', label: 'Members', icon: Users },
            ...(isCreator ? [{ id: 'invite', label: 'Add Members', icon: UserPlus }] : []),
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Feedback strip ── */}
        {(error || success) && (
          <div
            className={`mx-6 mt-3 text-sm px-3 py-2 rounded-lg shrink-0 ${
              error
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 border border-green-500/20'
            }`}
          >
            {error || success}
          </div>
        )}

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {/* MEMBERS TAB */}
          {tab === 'members' && (
            <>
              {/* Search */}
              <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2 mb-3 focus-within:border-blue-500/50 transition-colors">
                <Search size={14} className="text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search members…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
                />
              </div>

              {filteredMembers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No members found
                </p>
              )}

              {filteredMembers.map((member) => {
                const id = member._id?.toString() || member.toString();
                const isOwner =
                  channel.createdBy?._id?.toString() === id ||
                  channel.createdBy?.toString() === id;
                const isSelf = id === currentUser._id?.toString();

                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group transition-colors"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 ${
                        member.avatar ? '' : avatarBg(member.color)
                      }`}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        (member.name || '?')[0].toUpperCase()
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium truncate">
                          {member.name || 'Unknown'}
                          {isSelf && (
                            <span className="text-gray-500 font-normal ml-1">
                              (you)
                            </span>
                          )}
                        </span>
                        {isOwner && (
                          <Crown
                            size={12}
                            className="text-yellow-400 shrink-0"
                            title="Channel Creator"
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email || member.status || ''}
                      </p>
                    </div>

                    {/* Kick button — only creator sees it, not on themselves or owner */}
                    {isCreator && !isSelf && !isOwner && (
                      <button
                        onClick={() => handleKick(id, member.name)}
                        disabled={kicking === id}
                        title={`Remove ${member.name}`}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                      >
                        {kicking === id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <UserMinus size={12} />
                        )}
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* INVITE TAB */}
          {tab === 'invite' && isCreator && (
            <>
              <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2 mb-3 focus-within:border-blue-500/50 transition-colors">
                <Search size={14} className="text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search workspace members…"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
                />
              </div>

              {invitablemembers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  {workspaceMembers?.length === members.length
                    ? 'All workspace members are already in this channel'
                    : 'No members found'}
                </p>
              )}

              {invitablemembers.map((member) => {
                const id = member._id?.toString();
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 group transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 ${avatarBg(
                        member.color
                      )}`}
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          className="w-full h-full rounded-full object-cover"
                          alt={member.name}
                        />
                      ) : (
                        (member.name || '?')[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email || ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleInvite(id)}
                      disabled={inviting === id}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 px-2 py-1 rounded-lg hover:bg-blue-500/10 transition-all"
                    >
                      {inviting === id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <UserPlus size={12} />
                      )}
                      Add
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}