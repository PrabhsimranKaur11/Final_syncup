import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Hash, Video, Phone, Send, Smile, Paperclip,
  Image, FileText, Download, File, Film, Music, Trash2,
  Bookmark, UserMinus, Calendar, X
} from 'lucide-react';
import MessageReactions from './MessageReactions';
import TypingIndicator from './TypingIndicator';
import CallModal from './CallModal';
import ScheduleCallModal from './ScheduleCallModal';
import { socketService } from '../services/socket';
import {
  validateFileSize,
  MAX_FILE_SIZE_MB,
  MAX_NON_VIDEO_SIZE_MB,
} from '../utils/uploadLimits';
import { getChannelDisplayName } from '../utils/channelDisplay';
import { isChannelChat, isDmChat } from '../utils/chatKind';
import { downloadMediaFile } from '../services/api';

const availableEmojis = [
  '\u{1F600}', '\u{1F602}', '\u{1F60D}', '\u{1F914}', '\u{1F44D}',
  '\u2764\uFE0F', '\u{1F525}', '\u{1F389}', '\u{1F4AF}', '\u{1F62E}',
  '\u{1F622}', '\u{1F64F}', '\u2705', '\u{1F680}', '\u{1F4AA}',
  '\u{1F3A8}', '\u2615', '\u{1F31F}', '\u{1F440}', '\u{1F60E}',
];

// ─── AvatarImg ─────────────────────────────────────────────────────────────────
// FIX 2: Previously checked only startsWith('http') which could still show
// a raw URL as text if rendering fell to <span>. Now:
//  - Any http/https/relative URL → <img> with onError fallback to initials
//  - Short strings (emoji / 1-2 char initials) → render as text directly
//  - Long strings that look like URLs but failed the check → show initials
const AvatarImg = ({ src, alt }) => {
  const [imgError, setImgError] = useState(false);

  const isUrl = typeof src === 'string'
    && src.length > 4
    && (/(^(https?:)?\/\/|^\/|^[\w.-]+\.[\w.-]+)/i.test(src));

  if (isUrl && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setImgError(true)}
      />
    );
  }

  // If src is a short string (emoji or 1-2 char initial), show it directly.
  // If it's a long string (broken URL, etc.), derive initials from alt instead.
  const display = src && src.length <= 4
    ? src
    : (alt ? alt.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?');

  return <span className="select-none">{display}</span>;
};

const ChatView = ({
  chatDetails,
  messages,
  messagesLoading,
  conversationKey,
  sendingMessage = false,
  onSendMessage,
  onReaction,
  onDeleteMessage,
  onPinMessage,
  onRemoveMember,
  onScheduleCall,
  onCancelScheduledCall,
  upcomingCalls = [],
  currentUser,
  toastMessage = null,
  onShowToast,
  onDismissToast,
}) => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const [message, setMessage] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showMemberPanel, setShowMemberPanel] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [remoteUser, setRemoteUser] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [callLogId, setCallLogId] = useState(null);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [pendingCallType, setPendingCallType] = useState('audio');
  const [localToast, setLocalToast] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const messagesEndRef        = useRef(null);
  const messagesContainerRef  = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const prevChatIdRef         = useRef(chatDetails?._id || chatDetails?.id);
  const typingTimerRef        = useRef(null);
  const emojiPickerRef        = useRef(null);
  const filePickerRef         = useRef(null);
  const fileInputRef          = useRef(null);
  const seenIncomingCallLogsRef = useRef(new Set());
  const initiatingCallRef = useRef(false);

  const ownerRef = chatDetails?.owner || chatDetails?.createdBy;
  const ownerId = ownerRef?._id || ownerRef?.id || ownerRef;
  const isOwner = ownerId && (
    String(ownerId) === String(currentUser?._id) ||
    String(ownerId) === String(currentUser?.id)
  );
  const canManageMembers = isChannelChat(chatDetails) && chatDetails?.isPrivate && isOwner;
  const pinnedMessages = messages.filter((msg) => msg.pinned);
  const isOwnMessage = (m) => (
    m.userId === (currentUser?.id || currentUser?._id) ||
    m.userId === (currentUser?._id || currentUser?.id) ||
    (m.name && (m.name === (currentUser?.name || currentUser?.fullName)))
  );

  // ─── Socket connection + user registration ─────────────────────────────────
  useEffect(() => {
    socketService.connect();
    const unsub = socketService.onConnectionChange(setSocketConnected);
    return unsub;
  }, []);

  useEffect(() => {
    if (currentUser) {
      socketService.registerUser(currentUser._id || currentUser.id);
    }
  }, [currentUser, socketConnected]);

  // ─── Scroll to bottom (only on conversation change or new messages) ─────────
  useEffect(() => {
    const convKey = conversationKey || chatDetails?._id || chatDetails?.id;
    const isChatChange = convKey !== prevChatIdRef.current;
    const isNewMessage = !isChatChange && messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;
    prevChatIdRef.current = convKey;
    if (messagesEndRef.current && (isChatChange || isNewMessage)) {
      messagesEndRef.current.scrollIntoView({ behavior: isNewMessage ? 'smooth' : 'auto' });
    }
  }, [messages.length, conversationKey, chatDetails?._id, chatDetails?.id]);

  // ─── Close pickers on outside click ───────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false);
      if (filePickerRef.current  && !filePickerRef.current.contains(e.target))  setShowFilePicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Desktop Notifications ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const showCallNotification = useCallback((title, body, icon) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: icon || '/favicon.ico' });
    } catch (err) {
      console.error('Failed to show notification:', err);
    }
  }, []);

  const showToast = useCallback((message) => {
    if (onShowToast) {
      onShowToast(message);
    } else {
      setLocalToast(message);
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(() => setLocalToast(null), 6000);
    }
  }, [onShowToast]);

  const activeToast = toastMessage ?? localToast;
  const dismissToast = () => {
    onDismissToast?.();
    setLocalToast(null);
  };

  const handleCloseCall = useCallback(() => {
    setCallState('idle');
    setRemoteUser(null);
    setIncomingOffer(null);
    setCallLogId(null);
    setShowMemberPicker(false);
    seenIncomingCallLogsRef.current.clear();
    initiatingCallRef.current = false;
  }, []);

  const handleCloseCallRef = useRef(handleCloseCall);
  useEffect(() => { handleCloseCallRef.current = handleCloseCall; }, [handleCloseCall]);

  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    const handleCallStarted = ({ callLogId: id, channelId: dmChannelId }) => {
      initiatingCallRef.current = false;
      if (id) setCallLogId((prev) => prev || id);
      if (dmChannelId && currentUserRef.current) {
        socketService.joinChannel(dmChannelId, currentUserRef.current._id || currentUserRef.current.id);
      }
    };

    // Incoming calls are handled globally by GlobalIncomingCall on DashboardPage

    socketService.on('call:started', handleCallStarted);
    return () => {
      socketService.off('call:started', handleCallStarted);
    };
  }, []);

  // Incoming offers are handled by GlobalIncomingCall; only errors here for outgoing calls
  useEffect(() => {
    const handleUnavailable = () => {
      showToast('User is unavailable. Try again when they are online.');
      handleCloseCallRef.current();
    };
    const handleCallError = ({ message }) => {
      initiatingCallRef.current = false;
      showToast(message || 'Could not start the call.');
      handleCloseCallRef.current();
    };

    socketService.on('call:user-unavailable', handleUnavailable);
    socketService.on('call:error', handleCallError);
    return () => {
      socketService.off('call:user-unavailable', handleUnavailable);
      socketService.off('call:error', handleCallError);
    };
  }, [showToast]);

  const resolveMemberId = (member) => {
    if (!member) return null;
    if (typeof member === 'string') return member;
    return member._id || member.id || null;
  };

  const resolvePeerUserId = useCallback(() => {
    if (!chatDetails || !currentUser) return null;
    const selfId = String(currentUser._id || currentUser.id);

    if (isDmChat(chatDetails)) {
      const peer =
        chatDetails.peerUserId ||
        chatDetails.otherUserId ||
        chatDetails.userId ||
        chatDetails.participantId ||
        chatDetails.peerId ||
        chatDetails.id ||
        chatDetails._id;
      if (peer && String(peer) !== selfId) return String(peer);
    }

    const fromMembers = chatDetails.members?.find(
      (m) => String(resolveMemberId(m)) !== selfId
    );
    const memberId = resolveMemberId(fromMembers);
    return memberId ? String(memberId) : null;
  }, [chatDetails, currentUser]);

  const initiateCallToMember = useCallback((member, type) => {
    if (!member || callState !== 'idle' || !workspaceId || initiatingCallRef.current) return;
    initiatingCallRef.current = true;

    const selfId = currentUser?._id || currentUser?.id;
    if (!selfId) {
      showToast('You must be signed in to place a call.');
      return;
    }

    if (!socketConnected) {
      showToast('Not connected to the server. Refresh the page and try again.');
      return;
    }

    const targetUserId = resolveMemberId(member);
    if (!targetUserId || String(targetUserId) === String(selfId)) {
      showToast('Could not find a member to call.');
      return;
    }

    const contextChannelId = isChannelChat(chatDetails)
      ? (chatDetails._id || chatDetails.id)
      : undefined;

    setCallType(type);
    setRemoteUser({
      id: String(targetUserId),
      name: member.fullName || member.name || member.email || chatDetails?.name || 'User',
      avatar: member.avatar,
      color: member.color || 'from-blue-500 to-cyan-500',
    });
    setCallState('outgoing');
    setShowMemberPicker(false);

    socketService.emit('call:initiate', {
      to: String(targetUserId),
      from: String(selfId),
      callerName: currentUser.name || currentUser.fullName || 'Someone',
      callerAvatar: currentUser.avatar,
      callerColor: currentUser.color,
      callType: type,
      workspaceId: String(workspaceId),
      contextChannelId: contextChannelId ? String(contextChannelId) : undefined,
    });
  }, [callState, workspaceId, chatDetails, currentUser, showToast, socketConnected]);

  const handleStartCall = (type) => {
    if (!chatDetails || callState !== 'idle') return;

    if (!currentUser?._id && !currentUser?.id) {
      showToast('You must be signed in to place a call.');
      return;
    }

    if (!socketConnected) {
      showToast('Not connected to the server. Refresh the page and try again.');
      return;
    }

    if (isChannelChat(chatDetails)) {
      setPendingCallType(type);
      setShowMemberPicker(true);
      return;
    }

    const targetUserId = resolvePeerUserId();
    if (!targetUserId) {
      showToast('Could not find who to call in this conversation.');
      console.error('[SyncUp] handleStartCall: Could not resolve peer user ID.', chatDetails);
      return;
    }

    initiateCallToMember({
      _id: targetUserId,
      id: targetUserId,
      fullName: chatDetails.name,
      name: chatDetails.name,
      avatar: chatDetails.avatar,
      color: chatDetails.color,
    }, type);
  };

  const channelCallMembers = (chatDetails?.members || []).filter((m) => {
    const selfId = currentUser?._id || currentUser?.id;
    const memberId = resolveMemberId(m);
    return memberId && String(memberId) !== String(selfId);
  });

  const callsDisabled = callState !== 'idle' || !currentUser || !socketConnected;

  const handleCallAccepted = () => setCallState('active');

  // ─── Typing ────────────────────────────────────────────────────────────────
  const handleTyping = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setTypingUser(currentUser?.name || 'Someone');
      typingTimerRef.current = setTimeout(() => setTypingUser(null), 3000);
    } else {
      setTypingUser(null);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      setTypingUser(null);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessage((prev) => prev + emoji);
    setShowEmojiPicker(false);
  };

  /** Open native file picker; input stays mounted outside the popup so it is not unmounted on close. */
  const openFilePicker = (accept) => {
    setShowFilePicker(false);
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.value = '';
    requestAnimationFrame(() => input.click());
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = validateFileSize(file);
    if (!check.ok) {
      showToast(check.message);
      return;
    }
    onSendMessage('', file);
  };

  const handleDownloadAttachment = (e, file) => {
    e.preventDefault();
    if (!file?.url) return;
    if (file.pending) {
      showToast('Please wait until the upload finishes.');
      return;
    }
    downloadMediaFile(file.url, file.name || 'attachment');
  };

  if (!chatDetails) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#222831] h-full transition-colors duration-150">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-[#EEEEEE]">Welcome to SyncUp</h2>
          <p className="text-slate-500 dark:text-[#EEEEEE]/50 mt-2">
            Select a channel or direct message to start communicating.
          </p>
        </div>
      </div>
    );
  }

  const isChannel = isChannelChat(chatDetails);
  const channelTitle = isChannel
    ? getChannelDisplayName(chatDetails, currentUser?._id || currentUser?.id)
    : chatDetails?.name;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#222831] transition-colors duration-150">

      {activeToast && (
        <div
          role="alert"
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] flex items-start gap-3 px-4 py-3 rounded-xl bg-red-600 text-white shadow-lg border border-red-500/50"
        >
          <span className="text-sm leading-snug">{activeToast}</span>
          <button
            type="button"
            onClick={dismissToast}
            className="ml-auto shrink-0 p-0.5 rounded hover:bg-white/20"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <CallModal
        callState={callState}
        callType={callType}
        remoteUser={remoteUser}
        localUser={currentUser}
        socketService={socketService}
        onClose={handleCloseCall}
        incomingOffer={incomingOffer}
        onAcceptCall={handleCallAccepted}
        callLogId={callLogId}
      />

      {/* ── Chat Header ──────────────────────────────────────────────────── */}
      <div className="relative h-16 border-b border-slate-200 dark:border-[#76ABAE]/20 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          {isChannel ? (
            <Hash className="w-5 h-5 text-slate-600 dark:text-[#EEEEEE]/50" />
          ) : (
            <div className="relative">
              <div className={`w-8 h-8 bg-gradient-to-br ${chatDetails.color || 'from-blue-500 to-cyan-500'} rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden`}>
                <AvatarImg src={chatDetails.avatar} alt={chatDetails.name} />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${
                chatDetails.status === 'online' ? 'bg-green-500'
                  : chatDetails.status === 'away' ? 'bg-yellow-500'
                    : 'bg-slate-400'
              } border-2 border-white dark:border-[#222831] rounded-full`} />
            </div>
          )}
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE]">{channelTitle}</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-500 dark:text-[#EEEEEE]/50">
              {isChannel
                ? `${chatDetails.memberCount} members`
                : chatDetails.status === 'online' ? 'Online'
                  : chatDetails.status === 'away' ? 'Away'
                    : 'Offline'}
            </span>
            {isChannel && chatDetails.isPrivate && (
              <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] rounded-full bg-slate-100 text-slate-600 dark:bg-[#31363F] dark:text-[#EEEEEE]/70">
                Private
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onScheduleCall && (
            <button
              type="button"
              onClick={() => setShowScheduleModal(true)}
              title="Schedule work call"
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#31363F] transition-colors duration-150"
            >
              <Calendar className="w-4 h-4 text-slate-600 dark:text-[#EEEEEE]/50" />
            </button>
          )}
          {canManageMembers && (
            <button
              type="button"
              onClick={() => setShowMemberPanel(prev => !prev)}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#31363F] transition-colors"
              title="Manage channel members"
            >
              <UserMinus className="w-4 h-4 text-slate-600 dark:text-[#EEEEEE]/50" />
            </button>
          )}
          <button
            type="button"
            onClick={() => handleStartCall('audio')}
            disabled={callsDisabled}
            title={callsDisabled ? 'Call unavailable' : (isChannel ? 'Call a channel member' : 'Start audio call')}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#31363F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Phone className="w-4 h-4 text-slate-600 dark:text-[#EEEEEE]/50" />
          </button>
          <button
            type="button"
            onClick={() => handleStartCall('video')}
            disabled={callsDisabled}
            title={callsDisabled ? 'Call unavailable' : (isChannel ? 'Video call a channel member' : 'Start video call')}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#31363F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Video className="w-4 h-4 text-slate-600 dark:text-[#EEEEEE]/50" />
          </button>
        </div>
      </div>

      {showMemberPicker && isChannel && (
        <div className="absolute right-6 top-16 w-72 max-w-[calc(100%-3rem)] rounded-2xl bg-white dark:bg-[#222831] border border-slate-200 dark:border-[#76ABAE]/20 shadow-2xl z-40 overflow-hidden">
          <div className="p-3 border-b border-slate-200 dark:border-[#76ABAE]/20 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-[#EEEEEE]">
              Call a member ({pendingCallType === 'video' ? 'video' : 'voice'})
            </span>
            <button
              type="button"
              onClick={() => setShowMemberPicker(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#31363F]"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {channelCallMembers.length === 0 ? (
              <p className="p-3 text-sm text-slate-500 dark:text-[#EEEEEE]/50">No other members in this channel.</p>
            ) : (
              channelCallMembers.map((member) => (
                <button
                  key={resolveMemberId(member)}
                  type="button"
                  onClick={() => initiateCallToMember(member, pendingCallType)}
                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-[#31363F] transition-colors"
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE]">
                    {member.fullName || member.email}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">{member.email}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {showMemberPanel && canManageMembers && (
        <div className="absolute right-6 top-full mt-2 w-80 max-w-[calc(100%-3rem)] rounded-3xl bg-white dark:bg-[#222831] border border-slate-200 dark:border-[#76ABAE]/20 shadow-2xl z-40 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-[#76ABAE]/20">
            <div className="text-sm font-semibold text-slate-900 dark:text-[#EEEEEE]">Channel members</div>
            <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">Creator only can remove members</div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {chatDetails.members?.map(member => (
              <div key={member._id || member.id} className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50 dark:hover:bg-[#31363F] transition-colors">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE]">{member.fullName || member.email}</div>
                  <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">{member.email}</div>
                </div>
                {member._id !== ownerId && member.id !== ownerId && (
                  <button
                    type="button"
                    onClick={() => onRemoveMember?.(chatDetails._id || chatDetails.id, member._id || member.id)}
                    className="px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingCalls.length > 0 && (
        <div className="px-6 pt-4 pb-0">
          <div className="rounded-2xl border border-slate-200 dark:border-[#76ABAE]/20 bg-slate-50 dark:bg-[#1C2430] p-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#EEEEEE]/50 mb-2">Upcoming calls</div>
            <div className="space-y-2">
              {upcomingCalls.map((call) => (
                <div key={call._id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 dark:text-[#EEEEEE] truncate">{call.title}</div>
                    <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">
                      {new Date(call.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                  {onCancelScheduledCall && (
                    <button
                      type="button"
                      onClick={() => onCancelScheduledCall(call._id)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#31363F] text-slate-500 transition-colors duration-150"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        {messagesLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {messagesLoading && messages.length > 0 && (
          <div className="absolute inset-0 z-10 flex items-start justify-center pt-6 pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-slate-900/70 dark:bg-black/50 text-xs text-white/90 backdrop-blur-sm">
              Updating…
            </div>
          </div>
        )}
        {!messagesLoading && messages.length === 0 && (
          <p className="text-center text-sm text-slate-500 dark:text-[#EEEEEE]/40 py-8">
            No messages yet. Start the conversation!
          </p>
        )}
        <div className={messagesLoading && messages.length > 0 ? 'opacity-90' : ''}>
        {pinnedMessages.length > 0 && (
          <div className="space-y-3">
            <div className="rounded-3xl bg-slate-50 dark:bg-[#1C2430] border border-slate-200 dark:border-[#76ABAE]/20 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-[#EEEEEE]">Pinned messages</div>
                  <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">Keep important messages visible.</div>
                </div>
                <span className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">{pinnedMessages.length}</span>
              </div>
              <div className="space-y-2">
                {pinnedMessages.map(pm => (
                  <div key={pm.id} className="rounded-2xl border border-slate-200 dark:border-[#76ABAE]/20 bg-white dark:bg-[#151D2A] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-900 dark:text-[#EEEEEE]">{pm.text || pm.file?.name || 'Pinned message'}</div>
                      <button
                        type="button"
                        onClick={() => onPinMessage?.(pm.id)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#31363F] transition-colors"
                        title={pm.pinned ? 'Unpin message' : 'Pin message'}
                      >
                        <Bookmark className={`w-4 h-4 ${pm.pinned ? 'text-yellow-400' : 'text-slate-400 dark:text-[#EEEEEE]/50'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.system) {
            const isCallMsg = /call|📞/i.test(msg.text || '');
            return (
              <div key={msg._id || msg.id} className="flex flex-col items-center py-2 gap-1">
                <div
                  className={`inline-flex items-center gap-2 max-w-[90%] text-center text-xs px-4 py-2 rounded-full ${
                    isCallMsg
                      ? 'text-[#76ABAE] dark:text-[#76ABAE] bg-[#76ABAE]/10 dark:bg-[#76ABAE]/15 font-medium'
                      : 'text-slate-500 dark:text-[#EEEEEE]/45 bg-slate-100 dark:bg-[#31363F]/80'
                  }`}
                >
                  {isCallMsg && <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden />}
                  <span className="leading-snug">{msg.text}</span>
                </div>
                {msg.time && (
                  <span className="text-[10px] text-slate-400 dark:text-[#EEEEEE]/30">{msg.time}</span>
                )}
              </div>
            );
          }

          return (
          <div
            key={msg._id || msg.id}
            className={`flex gap-3 group ${isOwnMessage(msg) ? 'justify-end' : ''}`}
          >
              {!isOwnMessage(msg) && (
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 bg-gradient-to-br ${msg.color} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden`}>
                  <AvatarImg src={msg.avatar} alt={msg.name} />
                </div>
              </div>
            )}

              <div className={`flex-1 min-w-0 ${isOwnMessage(msg) ? 'text-right' : ''}`}>
                <div className={`flex items-baseline gap-2 mb-1 ${isOwnMessage(msg) ? 'justify-end' : ''}`}>
                {msg.name ? (
                  <span className="font-bold text-slate-900 dark:text-[#EEEEEE] text-sm">{msg.name}</span>
                ) : null}
                <span className="text-xs text-slate-500 dark:text-[#EEEEEE]/40">{msg.time}</span>
              </div>
                <div className={`flex items-start gap-2 ${isOwnMessage(msg) ? 'justify-end' : ''}`}>
                <MessageReactions
                  reactions={msg.reactions}
                  onReaction={(emoji) => onReaction(msg.id, emoji)}
                />
                <div className="flex items-start gap-2">
                  <div className={`relative inline-flex flex-col rounded-xl ${
                    isOwnMessage(msg)
                      ? 'bg-blue-500 dark:bg-[#76ABAE] text-white dark:text-[#222831]'
                      : 'bg-slate-100 dark:bg-[#31363F] text-slate-900 dark:text-[#EEEEEE]'
                  } ${msg.pending ? 'opacity-80' : ''}`}>
                    <div className="p-3">
                      {msg.pinned && (
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-yellow-100 dark:bg-yellow-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-yellow-700 dark:text-yellow-300">
                          <Bookmark className="w-3.5 h-3.5" />
                          Pinned
                        </div>
                      )}
                      {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                      {msg.file && (
                        <div className="mt-2 max-w-md">
                          {(msg.file.type === 'image' || msg.file.type?.startsWith?.('image/')) ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#76ABAE]/20">
                              <a href={msg.file.url} target="_blank" rel="noreferrer">
                                <img src={msg.file.url} alt={msg.file.name} className="max-w-xs max-h-64 object-cover rounded-t-xl" loading="lazy" />
                              </a>
                              {msg.file.pending && (
                                <div className="px-3 py-1 text-[10px] uppercase tracking-wider opacity-70">Uploading…</div>
                              )}
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#31363F]">
                                <span className="text-xs text-slate-600 dark:text-[#EEEEEE]/60 truncate flex-1">{msg.file.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadAttachment(e, msg.file)}
                                  title={`Download ${msg.file.name}`}
                                  className="w-8 h-8 bg-blue-600 dark:bg-[#76ABAE] rounded-lg flex items-center justify-center shrink-0"
                                >
                                  <Download className="w-4 h-4 text-white dark:text-[#222831]" />
                                </button>
                              </div>
                            </div>
                          ) : (msg.file.type === 'video' || msg.file.type?.startsWith?.('video/')) ? (
                            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#76ABAE]/20">
                              <video
                                src={msg.file.url}
                                controls
                                playsInline
                                preload="metadata"
                                className="max-w-sm w-full max-h-72 bg-black rounded-t-xl"
                              />
                              {msg.file.pending && (
                                <div className="px-3 py-1 text-[10px] uppercase tracking-wider opacity-70">Uploading…</div>
                              )}
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#31363F]">
                                <Film className="w-4 h-4 text-purple-500 shrink-0" />
                                <span className="text-xs text-slate-600 dark:text-[#EEEEEE]/60 truncate flex-1">{msg.file.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadAttachment(e, msg.file)}
                                  title={`Download ${msg.file.name}`}
                                  className="w-8 h-8 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                                >
                                  <Download className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-[#31363F] dark:to-[#222831] rounded-xl p-4 border border-slate-200 dark:border-[#76ABAE]/20 hover:shadow-lg transition-shadow">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                                  <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-slate-900 dark:text-[#EEEEEE] text-sm truncate">{msg.file.name}</div>
                                  <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/40">{msg.file.size}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadAttachment(e, msg.file)}
                                  title={`Download ${msg.file.name}`}
                                  className="w-9 h-9 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center justify-center transition-colors shadow-lg shrink-0"
                                >
                                  <Download className="w-4 h-4 text-white" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {onPinMessage && (
                    <button
                      type="button"
                      onClick={() => onPinMessage(msg.id)}
                      className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#31363F] flex items-center justify-center text-slate-600 dark:text-[#EEEEEE]/70 transition"
                      title={msg.pinned ? 'Unpin message' : 'Pin message'}
                    >
                      <Bookmark className={`w-4 h-4 ${msg.pinned ? 'text-yellow-500' : ''}`} />
                    </button>
                  )}
                  {onDeleteMessage && (msg.userId === currentUser.id || msg.userId === currentUser._id) && msg.createdAt && (Date.now() - new Date(msg.createdAt).getTime() <= 2 * 60 * 60 * 1000) && (
                    <button
                      type="button"
                      onClick={() => onDeleteMessage(msg.id)}
                      className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-[#31363F] flex items-center justify-center text-slate-600 dark:text-[#EEEEEE]/70 transition"
                      title="Delete message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isOwnMessage(msg) && (
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 bg-gradient-to-br ${currentUser.color} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden`}>
                  <AvatarImg src={currentUser.avatar} alt={currentUser.name} />
                </div>
              </div>
            )}
          </div>
        );
        })}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <TypingIndicator typingUser={typingUser} />

      {/* ── Message Input ─────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-slate-200 dark:border-[#76ABAE]/20">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          aria-hidden
          onChange={handleFileInputChange}
        />
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className="flex-1 bg-slate-100 dark:bg-[#31363F] rounded-2xl border border-slate-200 dark:border-[#76ABAE]/20 focus-within:border-blue-500 dark:focus-within:border-[#76ABAE] focus-within:ring-2 focus-within:ring-blue-500/20 dark:focus-within:ring-[#76ABAE]/20 transition-all">
            <div className="flex items-center gap-2 px-4 py-3">

              <div className="relative" ref={filePickerRef}>
                <button
                  type="button"
                  onClick={() => { setShowFilePicker(!showFilePicker); setShowEmojiPicker(false); }}
                  className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-[#222831] rounded-lg flex items-center justify-center transition-all hover:scale-110"
                >
                  <Paperclip className="w-5 h-5 text-slate-600 dark:text-[#EEEEEE]/50" />
                </button>
                {showFilePicker && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white/90 dark:bg-[#31363F]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-3 w-56 z-20">
                    <p className="text-xs font-bold text-slate-500 dark:text-[#EEEEEE]/50 uppercase tracking-wider mb-1 px-1">Attach a file</p>
                    <p className="text-[10px] text-slate-400 dark:text-[#EEEEEE]/40 mb-2 px-1 leading-snug">
                      Max {MAX_NON_VIDEO_SIZE_MB} MB · videos up to {MAX_FILE_SIZE_MB} MB
                    </p>
                    {[
                      { icon: Image,    label: 'Photos & Images', accept: 'image/*',       color: 'text-blue-500 dark:text-[#76ABAE]', hint: `${MAX_NON_VIDEO_SIZE_MB} MB` },
                      { icon: FileText, label: 'Documents',       accept: '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx', color: 'text-orange-500', hint: `${MAX_NON_VIDEO_SIZE_MB} MB` },
                      { icon: Film,     label: 'Videos',          accept: 'video/*',       color: 'text-purple-500', hint: `${MAX_FILE_SIZE_MB} MB` },
                      { icon: Music,    label: 'Audio Files',     accept: 'audio/*',       color: 'text-pink-500', hint: `${MAX_NON_VIDEO_SIZE_MB} MB` },
                      { icon: File,     label: 'Other Files',     accept: '*',             color: 'text-slate-500 dark:text-[#EEEEEE]/50', hint: `${MAX_NON_VIDEO_SIZE_MB} MB` },
                    ].map(({ icon: Icon, label, accept, color, hint }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => openFilePicker(accept)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#222831]/60 transition-colors group"
                      >
                        <Icon className={`w-4 h-4 ${color} group-hover:scale-110 transition-transform`} />
                        <span className="flex-1 text-left">
                          <span className="text-sm font-medium text-slate-700 dark:text-[#EEEEEE]/80 block">{label}</span>
                          <span className="text-[10px] text-slate-400 dark:text-[#EEEEEE]/35">up to {hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="text"
                value={message}
                onChange={handleTyping}
                placeholder={`Message ${isChannel ? '#' : ''}${channelTitle}`}
                className="flex-1 bg-transparent outline-none text-slate-900 dark:text-[#EEEEEE] placeholder-slate-500 dark:placeholder-[#EEEEEE]/40"
              />

              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowFilePicker(false); }}
                  className="w-8 h-8 hover:bg-slate-200 dark:hover:bg-[#222831] rounded-lg flex items-center justify-center transition-all hover:scale-110"
                >
                  <Smile className="w-5 h-5 text-slate-600 dark:text-[#EEEEEE]/50" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-3 right-0 z-50 bg-white dark:bg-[#31363F] backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/60 dark:border-[#76ABAE]/20 p-3" style={{ width: '224px' }}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-[#76ABAE] to-[#76ABAE]/50" />
                      <p className="text-xs font-bold text-slate-400 dark:text-[#EEEEEE]/40 uppercase tracking-widest">React</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {availableEmojis.map((emoji) => (
                        <button key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)}
                          className="p-2 text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-[#222831]/70 active:scale-90 transition-all duration-150 hover:scale-110">
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#76ABAE]/10 text-center">
                      <span className="text-[10px] text-slate-400 dark:text-[#EEEEEE]/30 tracking-wide">click to add</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button type="submit" disabled={!message.trim() || sendingMessage}
            className="w-12 h-12 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 hover:shadow-lg hover:shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-all duration-150">
            <Send className="w-5 h-5 text-white dark:text-[#222831]" />
          </button>
        </form>
      </div>

      <ScheduleCallModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={onScheduleCall}
        chatName={channelTitle}
      />
    </div>
  );
};

export default ChatView;