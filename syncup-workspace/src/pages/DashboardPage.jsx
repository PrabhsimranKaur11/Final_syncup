import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Hash, Lock, Settings, MoreVertical, Plus, ChevronDown, Moon, Sun, LogOut, X, UserPlus
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import DirectMessageList from '../components/DirectMessageList';
import ChatView from '../components/ChatView';
import GlobalIncomingCall from '../components/GlobalIncomingCall';
import { unlockCallAudio } from '../utils/callRingtone';
import CreateChannelModal from '../components/CreateChannelModal';
import CreateDirectMessageModal from '../components/CreateDirectMessageModal';
import AddMemberModal from '../components/AddMemberModal';
import { useTheme } from '../context/ThemeContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { messageAPI, channelAPI, scheduledCallAPI, resolveMediaUrl } from '../services/api';
import { socketService } from '../services/socket';
import { fileDisplayCategory, validateFileSize, formatFileSize, MAX_FILE_SIZE_MB } from '../utils/uploadLimits';
import {
  getChannelDisplayName,
  findDmChannel,
  getDmUnreadForPeer,
  dedupeChannels,
  channelVisibleToUser,
} from '../utils/channelDisplay';
import { getChatKind, isChannelChat, isDmChat } from '../utils/chatKind';

const visibleChannels = (list, userId) =>
  dedupeChannels(list).filter((ch) => channelVisibleToUser(ch, userId));

const isCallOrSystemText = (text) => (
  /📞|incoming\s+(voice|video)\s+call|missed call|no answer|call declined|work call scheduled|scheduled work call cancelled|(?:voice|video)\s+call\s*·/i.test(text || '')
);

const mapApiMessage = (msg) => {
  const text = msg.text || msg.content || '';
  const rawSender = msg.sender ?? msg.senderId;
  const sender = (typeof rawSender === 'object' && rawSender !== null) ? rawSender : {};
  const isSystem = Boolean(msg.system || msg.type === 'system' || isCallOrSystemText(text));
  return {
    id: msg._id,
    userId: isSystem ? null : (sender._id || sender.id || rawSender),
    text,
    system: isSystem,
    pinned: msg.pinned || msg.isPinned,
    createdAt: msg.createdAt,
    time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    reactions: {},
    name: isSystem ? '' : (sender.fullName || sender.email || 'Unknown'),
    avatar: isSystem ? null : (sender.avatar || null),
    color: 'from-blue-500 to-cyan-500',
    file: msg.fileUrl ? {
      url: resolveMediaUrl(msg.fileUrl),
      type: fileDisplayCategory(msg.fileType, msg.fileName),
      name: msg.fileName || 'Attachment',
      size: msg.fileSize ? formatFileSize(msg.fileSize) : '',
    } : null,
  };
};
const Avatar = ({ user, className = '', dimmed = false }) => {
  const [err, setErr] = useState(false);
  const isUrl = typeof user?.avatar === 'string' && (/^(https?:)?\/\//i.test(user.avatar) || user.avatar.startsWith('/'));
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  return (
    <div className={`bg-gradient-to-br ${user?.color || 'from-blue-500 to-cyan-500'} flex items-center justify-center text-white font-bold overflow-hidden ${dimmed ? 'opacity-60' : ''} ${className}`}>
      {isUrl && !err
        ? <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" onError={() => setErr(true)} />
        : <span>{initials}</span>}
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { workspaceId, channelId, userId } = useParams();
  const { darkMode, toggleDarkMode, currentUser, logout, settings } = useTheme();
  const { workspaces, fetchWorkspaces } = useWorkspace();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isCreateChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [isCreateDmModalOpen, setCreateDmModalOpen] = useState(false);
  const [isAddMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState(null);
  const [upcomingCalls, setUpcomingCalls] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatToast, setChatToast] = useState(null);
  const chatToastTimerRef = useRef(null);

  const showChatToast = useCallback((message) => {
    setChatToast(message);
    if (chatToastTimerRef.current) clearTimeout(chatToastTimerRef.current);
    chatToastTimerRef.current = setTimeout(() => setChatToast(null), 6000);
  }, []);

  const dismissChatToast = useCallback(() => {
    setChatToast(null);
    if (chatToastTimerRef.current) clearTimeout(chatToastTimerRef.current);
  }, []);

  useEffect(() => {
    if (workspaces.length === 0) fetchWorkspaces();
  }, [fetchWorkspaces, workspaces.length]);

  const mapWorkspaceMembers = (ws, user) => {
    const appUser = {
      id: user._id,
      name: user.displayName || user.firstName || user.fullName || 'You',
      avatar: user.avatar || (user.displayName || user.fullName || 'Y').substring(0, 2).toUpperCase(),
      color: user.color || 'from-pink-500 to-rose-500',
      status: 'online',
    };

    const mappedMembers = (ws.members || []).map(m => {
      if (m._id === user._id) return appUser;
      return {
        id: m._id,
        name: m.fullName || m.displayName || m.email,
        avatar: m.avatar || 'U',
        color: 'from-blue-500 to-cyan-500',
        status: m.status || 'offline',
      };
    });

    if (!mappedMembers.find(m => m.id === appUser.id)) {
      mappedMembers.push(appUser);
    }
    return mappedMembers;
  };

  useEffect(() => {
    if (workspaces.length > 0) {
      const ws = workspaces.find(w => w._id === workspaceId) || workspaces[0];
      if (ws) {
        setActiveWorkspace(ws);
        if (currentUser) {
          setAllUsers(mapWorkspaceMembers(ws, currentUser));
        }
      }
    }
  }, [workspaceId, workspaces, currentUser]);

  useEffect(() => {
    if (!activeWorkspace?._id || !currentUser) return;

    const loadChannels = async () => {
      try {
        const data = await channelAPI.getAll(activeWorkspace._id);
        setChannels((prev) => {
          const unreadById = {};
          prev.forEach((c) => { unreadById[String(c._id)] = c.unread || 0; });
          return visibleChannels(data, currentUser._id).map((c) => ({
            ...c,
            unread: unreadById[String(c._id)] ?? 0,
          }));
        });
      } catch (err) {
        console.error('Failed to load channels:', err);
        setChannels((prev) => {
          const unreadById = {};
          prev.forEach((c) => { unreadById[String(c._id)] = c.unread || 0; });
          return visibleChannels(activeWorkspace.channels || [], currentUser._id).map((c) => ({
            ...c,
            unread: unreadById[String(c._id)] ?? 0,
          }));
        });
      }
    };
    loadChannels();
  }, [activeWorkspace?._id, currentUser]);

  // If URL points at a channel the user cannot access, open their personal room
  useEffect(() => {
    if (!channelId || !activeWorkspace?._id || !currentUser?._id || channels.length === 0) return;
    const visible = channels.find(c => String(c._id) === String(channelId));
    if (visible) return;
    const personalSlug = `private-${currentUser._id}`;
    const fallback =
      channels.find(c => c.name === personalSlug) ||
      channels.find(c => c.name === 'general') ||
      channels[0];
    if (fallback) {
      navigate(`/dashboard/${activeWorkspace._id}/channel/${fallback._id}`, { replace: true });
    }
  }, [channelId, channels, activeWorkspace?._id, currentUser?._id, navigate]);

  useEffect(() => {
    if (!activeWorkspace || !currentUser) return;

    unlockCallAudio();
    socketService.connect();
    socketService.registerUser(currentUser._id || currentUser.id);
    socketService.joinWorkspace(activeWorkspace._id, currentUser._id);
    socketService.setupPresence(activeWorkspace._id, currentUser._id);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().catch(() => {});
    }

    const onPresenceChange = ({ userId, status }) => {
      setAllUsers(prev => prev.map(u =>
        String(u.id) === String(userId) ? { ...u, status } : u
      ));
    };

    const onPresenceSnapshot = (snapshot) => {
      if (!Array.isArray(snapshot)) return;
      setAllUsers(prev => prev.map(u => {
        const entry = snapshot.find(p => String(p.userId) === String(u.id));
        if (entry) return { ...u, status: entry.status };
        if (String(u.id) === String(currentUser._id)) return { ...u, status: 'online' };
        return u;
      }));
    };

    socketService.on('user-status-changed', onPresenceChange);
    socketService.on('workspace-presence-snapshot', onPresenceSnapshot);

    return () => {
      socketService.leaveWorkspace(activeWorkspace._id, currentUser._id);
      socketService.off('user-status-changed', onPresenceChange);
      socketService.off('workspace-presence-snapshot', onPresenceSnapshot);
    };
  }, [activeWorkspace, currentUser]);

  useEffect(() => {
    if (channelId) {
      const found = channels.length > 0
        ? channels.find(c => String(c._id) === String(channelId))
        : null;
      if (found) {
        const owner = found.createdBy || found.owner;
        const label = getChannelDisplayName(found, currentUser?._id);
        setActiveChat(prev => {
          if (isChannelChat(prev) && String(prev.id) === String(found._id)) {
            if (prev.name === label && prev.memberCount === (found.members?.length || 1)) return prev;
            return { ...prev, name: label, displayName: label, owner, memberCount: found.members?.length || 1 };
          }
          return {
            ...found,
            chatKind: 'channel',
            id: found._id,
            name: label,
            displayName: label,
            owner,
            memberCount: found.members?.length || 1,
          };
        });
        socketService.joinChannel(found._id, currentUser?._id);
        return;
      }
      setActiveChat(prev => {
        if (isChannelChat(prev) && String(prev?.id) === String(channelId)) return prev;
        return {
          chatKind: 'channel',
          id: channelId,
          _id: channelId,
          name: prev?.id === channelId && prev?.name ? prev.name : 'Loading…',
          members: prev?.members || [],
          isPrivate: prev?.isPrivate,
        };
      });
      return;
    }
    if (userId && allUsers.length > 0) {
      const chat = allUsers.find(u => String(u.id) === String(userId));
      if (chat) {
        const existingDm = findDmChannel(channels, chat.id, currentUser?._id);
        setActiveChat({
          ...chat,
          chatKind: 'dm',
          peerUserId: chat.id,
          channelId: existingDm?._id,
        });
      }
    } else if (channels.length > 0 && !channelId && !userId && activeWorkspace) {
      const personalSlug = currentUser?._id ? `private-${currentUser._id}` : null;
      const defaultChannel =
        (personalSlug && channels.find(c => c.name === personalSlug)) ||
        channels.find(c => c.name === 'general') ||
        channels[0];
      navigate(`/dashboard/${activeWorkspace._id}/channel/${defaultChannel._id}`, { replace: true });
    }
  }, [channelId, userId, channels, allUsers, activeWorkspace, navigate, currentUser]);

  // Keep DM header status in sync with presence sidebar (status only — avoids full chat remount)
  const dmPeerId = isDmChat(activeChat) ? activeChat?.id : null;
  useEffect(() => {
    if (!dmPeerId) return;
    const peer = allUsers.find(u => String(u.id) === String(dmPeerId));
    if (!peer) return;
    setActiveChat(prev => {
      if (!prev || !isDmChat(prev)) return prev;
      if (prev.status === peer.status) return prev;
      return { ...prev, status: peer.status };
    });
  }, [allUsers, dmPeerId]);

  const activeChatId = activeChat?.id;
  const activeChatKind = getChatKind(activeChat);
  const dmPeerUserId = isDmChat(activeChat) ? (activeChat?.peerUserId || activeChat?.id) : null;
  const dmChannelFromList = dmPeerUserId && currentUser?._id
    ? findDmChannel(channels, dmPeerUserId, currentUser._id)
    : null;
  const activeChatChannelId = activeChat?.channelId;
  const activeWorkspaceId = activeWorkspace?._id;
  const messageChannelId = activeChatKind === 'channel'
    ? (activeChatId || channelId)
    : (dmChannelFromList?._id || activeChatChannelId);

  const messagesFetchGen = useRef(0);
  const loadedChannelRef = useRef(null);
  const activeChannelIdRef = useRef(null);
  const messagesByChannelRef = useRef({});
  const channelIdsKey = channels.map((c) => String(c._id)).sort().join(',');

  // Keep in sync during render so socket handlers never use a stale channel id after switching chats
  activeChannelIdRef.current = messageChannelId ? String(messageChannelId) : null;

  const showDesktopMessageNotification = useCallback((msg, msgChannelId) => {
    if (!settings?.desktopNotifications) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const sender = msg.sender || msg.senderId || {};
    const senderName = sender.fullName || sender.displayName || sender.email || 'Someone';
    const channel = channels.find((c) => String(c._id) === String(msgChannelId));
    const isDm = channel?.name?.startsWith('DM-') || channel?.type === 'dm';
    if (isDm && settings?.directMessages === false) return;

    let title = channel ? `#${getChannelDisplayName(channel, currentUser?._id)}` : 'New message';
    if (isDm) {
      title = senderName;
    }
    const preview = (msg.text || msg.content || '').trim().slice(0, 120) || 'Sent a message';

    try {
      new Notification(title, {
        body: settings?.messagePreviews !== false ? `${senderName}: ${preview}` : 'New message',
        icon: sender.avatar || '/favicon.ico',
      });
    } catch (err) {
      console.error('Notification error:', err);
    }
  }, [settings, channels, currentUser?._id]);

  const showDesktopMessageNotificationRef = useRef(showDesktopMessageNotification);
  showDesktopMessageNotificationRef.current = showDesktopMessageNotification;

  useEffect(() => {
    const loaded = loadedChannelRef.current;
    const active = activeChannelIdRef.current;
    if (loaded && active && loaded === active && !messagesLoading) {
      messagesByChannelRef.current[loaded] = messages;
    }
  }, [messages, messagesLoading]);

  // Resolve DM channel once (stops double-fetch flicker when channelId appears)
  useEffect(() => {
    if (activeChatKind !== 'dm' || !activeChatId || !activeWorkspaceId || !currentUser) return;
    if (messageChannelId) {
      if (String(activeChatChannelId) !== String(messageChannelId)) {
        setActiveChat(prev => {
          if (!prev || !isDmChat(prev)) return prev;
          if (String(prev.channelId) === String(messageChannelId)) return prev;
          return { ...prev, channelId: messageChannelId };
        });
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const dmRes = await channelAPI.getOrCreateDm(activeWorkspaceId, activeChatId);
        if (cancelled) return;
        setActiveChat(prev => {
          if (!prev || !isDmChat(prev)) return prev;
          if (String(prev.channelId) === String(dmRes._id)) return prev;
          return {
            ...prev,
            chatKind: 'dm',
            channelId: dmRes._id,
            peerUserId: prev.peerUserId || prev.id,
          };
        });
        socketService.joinChannel(dmRes._id, currentUser._id);
        setChannels(prev => visibleChannels(
          prev.some(c => String(c._id) === String(dmRes._id))
            ? prev
            : [...prev, { ...dmRes, unread: 0 }],
          currentUser._id
        ));
      } catch (err) {
        console.error('Failed to resolve DM channel:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [activeChatKind, activeChatId, activeChatChannelId, messageChannelId, activeWorkspaceId, currentUser?._id]);

  useEffect(() => {
    if (!messageChannelId || !activeChatKind) {
      if (!messageChannelId && activeChatKind === 'dm' && dmPeerUserId) {
        setMessagesLoading(true);
        return;
      }
      if (!messageChannelId) {
        setMessages([]);
        setMessagesLoading(false);
        loadedChannelRef.current = null;
      }
      return;
    }

    const targetId = String(messageChannelId);
    const isSameChannel = loadedChannelRef.current === targetId;
    const gen = ++messagesFetchGen.current;
    const cached = messagesByChannelRef.current[targetId];

    if (!isSameChannel) {
      if (cached) {
        setMessages(cached);
        setMessagesLoading(false);
      } else {
        setMessages([]);
        setMessagesLoading(true);
      }
    }

    const fetchMsgs = async () => {
      try {
        const res = await messageAPI.getMessages(targetId);
        if (gen !== messagesFetchGen.current) return;
        const mapped = res.messages.reverse().map(mapApiMessage);
        messagesByChannelRef.current[targetId] = mapped;
        setMessages(mapped);
        loadedChannelRef.current = targetId;
        setChannels(prev => prev.map(c =>
          String(c._id) === targetId ? { ...c, unread: 0 } : c
        ));
      } catch (err) {
        console.error('Error fetching messages:', err);
        if (gen === messagesFetchGen.current && !isSameChannel && !cached) setMessages([]);
      } finally {
        if (gen === messagesFetchGen.current) setMessagesLoading(false);
      }
    };
    fetchMsgs();
  }, [messageChannelId, activeChatKind, activeWorkspaceId, dmPeerUserId]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    const loadCalls = async () => {
      try {
        const channelFilter = activeChatKind === 'channel'
          ? (activeChatId || channelId)
          : activeChatChannelId;
        const params = channelFilter ? { channelId: channelFilter } : {};
        const res = await scheduledCallAPI.list(activeWorkspaceId, params);
        setUpcomingCalls(res.calls || []);
      } catch (err) {
        console.error('Failed to load scheduled calls:', err);
        setUpcomingCalls([]);
      }
    };
    loadCalls();
  }, [activeWorkspaceId, activeChatId, activeChatKind, activeChatChannelId, channelId]);

  useEffect(() => {
    if (!currentUser || !channelIdsKey) return;
    socketService.connect();
    channels.forEach(ch => socketService.joinChannel(ch._id, currentUser._id));
    return () => {
      channels.forEach(ch => socketService.leaveChannel(ch._id));
    };
  }, [channelIdsKey, currentUser?._id]);

  useEffect(() => {
    if (!currentUser || !activeWorkspaceId) return;
    socketService.connect();

    const onNewMessage = (msg) => {
      const msgChannelId = msg.channelId || (typeof msg.channel === 'object' ? msg.channel._id : msg.channel);
      if (!msgChannelId) return;

      const activeChannelId = activeChannelIdRef.current;
      const sender = msg.sender || msg.senderId || {};
      const senderId = sender._id || sender.id || sender;
      const isOwnMessage = currentUser?._id && String(senderId) === String(currentUser._id);
      const isActiveChannel = activeChannelId && String(msgChannelId) === String(activeChannelId);

      if (isActiveChannel) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg._id)) return prev;
          const mapped = mapApiMessage(msg);
          if (mapped.system && mapped.text) {
            const isIncoming = /incoming\s+(voice|video)\s+call/i.test(mapped.text);
            const isDup = prev.some((m) => {
              if (!m.system || !m.text) return false;
              if (m.text === mapped.text) {
                return Math.abs(new Date(m.createdAt) - new Date(mapped.createdAt)) < 120000;
              }
              if (isIncoming && /incoming\s+(voice|video)\s+call/i.test(m.text)) {
                return Math.abs(new Date(m.createdAt) - new Date(mapped.createdAt)) < 120000;
              }
              return false;
            });
            if (isDup) return prev;
          }
          return [...prev, mapped];
        });
        setChannels(prev => prev.map(c =>
          String(c._id) === String(msgChannelId) ? { ...c, unread: 0 } : c
        ));
        return;
      }

      if (isOwnMessage) return;

      setChannels(prev => {
        const exists = prev.some(c => String(c._id) === String(msgChannelId));
        if (!exists) return prev;
        return prev.map(c =>
          String(c._id) === String(msgChannelId)
            ? { ...c, unread: (c.unread || 0) + 1 }
            : c
        );
      });
      showDesktopMessageNotificationRef.current?.(msg, msgChannelId);
    };

    const onDeleteMessage = ({ messageId, channelId: msgChId }) => {
      const activeChannelId = activeChannelIdRef.current;
      if (activeChannelId && String(msgChId) === String(activeChannelId)) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    };

    const onMessageUpdated = (msg) => {
      const msgChannelId = msg.channelId || (typeof msg.channel === 'object' ? msg.channel._id : msg.channel);
      const activeChannelId = activeChannelIdRef.current;
      if (activeChannelId && String(msgChannelId) === String(activeChannelId)) {
        setMessages(prev => prev.map(m =>
          m.id === msg._id ? mapApiMessage(msg) : m
        ));
      }
    };

    const onPinMessage = (msg) => {
      const msgChannelId = msg.channelId || (typeof msg.channel === 'object' ? msg.channel._id : msg.channel);
      const activeChannelId = activeChannelIdRef.current;
      if (activeChannelId && String(msgChannelId) === String(activeChannelId)) {
        setMessages(prev => prev.map(m => m.id === msg._id ? ({
          ...m,
          pinned: msg.pinned ?? msg.isPinned,
          pinnedBy: msg.pinnedBy ? (msg.pinnedBy.fullName || msg.pinnedBy.email) : undefined,
          pinnedAt: msg.pinnedAt,
        }) : m));
      }
    };

    const onScheduledCreated = ({ call, message }) => {
      if (call?.workspaceId && String(call.workspaceId) === String(activeWorkspaceId)) {
        setUpcomingCalls(prev => {
          if (prev.some(c => c._id === call._id)) return prev;
          return [...prev, call].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
        });
      }
      const msgChannelId = message?.channelId || message?.channel;
      const activeChannelId = activeChannelIdRef.current;
      if (message && activeChannelId && String(msgChannelId) === String(activeChannelId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message._id)) return prev;
          return [...prev, mapApiMessage(message)];
        });
      }
    };

    const onCallStarted = ({ channelId: callChannelId, message }) => {
      if (!callChannelId || !currentUser) return;
      socketService.joinChannel(callChannelId, currentUser._id);

      setActiveChat((prev) => {
        if (!prev || !isDmChat(prev)) return prev;
        if (prev.channelId && String(prev.channelId) === String(callChannelId)) return prev;
        return { ...prev, channelId: callChannelId };
      });

      if (message) {
        const mapped = mapApiMessage(message);
        const active = activeChannelIdRef.current;
        if (!active || String(callChannelId) === String(active)) {
          setMessages((prev) => (
            prev.some((m) => m.id === mapped.id) ? prev : [...prev, mapped]
          ));
          activeChannelIdRef.current = String(callChannelId);
          loadedChannelRef.current = String(callChannelId);
        }
      }
    };

    const onScheduledCancelled = ({ callId: cancelledId, call, message }) => {
      const id = cancelledId || call?._id;
      setUpcomingCalls(prev => prev.filter(c => c._id !== id));
      const msgChannelId = message?.channelId || message?.channel;
      const activeChannelId = activeChannelIdRef.current;
      if (message && activeChannelId && String(msgChannelId) === String(activeChannelId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message._id)) return prev;
          return [...prev, mapApiMessage(message)];
        });
      }
    };

    socketService.on('new-message', onNewMessage);
    socketService.on('message-updated', onMessageUpdated);
    socketService.on('delete-message', onDeleteMessage);
    socketService.on('pin-message', onPinMessage);
    socketService.on('call:started', onCallStarted);
    socketService.on('scheduled-call:created', onScheduledCreated);
    socketService.on('scheduled-call:cancelled', onScheduledCancelled);

    return () => {
      socketService.off('new-message', onNewMessage);
      socketService.off('message-updated', onMessageUpdated);
      socketService.off('delete-message', onDeleteMessage);
      socketService.off('pin-message', onPinMessage);
      socketService.off('call:started', onCallStarted);
      socketService.off('scheduled-call:created', onScheduledCreated);
      socketService.off('scheduled-call:cancelled', onScheduledCancelled);
    };
  }, [currentUser?._id, activeWorkspaceId]);

  const handlePinMessage = async (messageId) => {
    try {
      const res = await messageAPI.pinMessage(messageId);
      setMessages(prev => prev.map(m => m.id === res._id ? ({
        ...m,
        pinned: res.pinned ?? res.isPinned,
        pinnedBy: res.pinnedBy ? (res.pinnedBy.fullName || res.pinnedBy.email) : undefined,
        pinnedAt: res.pinnedAt,
      }) : m));
    } catch (err) {
      console.error('Failed to pin message:', err);
    }
  };

  const handleRemoveMember = async (channelIdParam, userIdParam) => {
    try {
      const res = await channelAPI.removeMember(channelIdParam, userIdParam);
      // Update active chat members if currently viewing the channel
      if (isChannelChat(activeChat) && String(activeChat.id) === String(channelIdParam)) {
        setActiveChat(prev => prev ? ({ ...prev, members: res.members }) : prev);
      }
      setChannels(prev => prev.map(c => String(c._id) === String(res._id) ? res : c));
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert(err.message || 'Failed to remove member.');
    }
  };

  const resolveChannelId = async () => {
    const kind = getChatKind(activeChat);
    if (kind === 'channel') {
      return activeChat?.id || activeChat?._id || channelId || null;
    }
    if (kind === 'dm') {
      let targetId = activeChat?.channelId;
      if (!targetId && activeWorkspaceId && activeChat?.id) {
        const dmChannel = await channelAPI.getOrCreateDm(activeWorkspaceId, activeChat.id);
        setActiveChat(prev => prev ? { ...prev, chatKind: 'dm', channelId: dmChannel._id } : null);
        setChannels(prev => visibleChannels(
          prev.find(c => String(c._id) === String(dmChannel._id))
            ? prev
            : [...prev, { ...dmChannel, unread: 0 }],
          currentUser._id
        ));
        socketService.joinChannel(dmChannel._id, currentUser._id);
        targetId = dmChannel._id;
      }
      return targetId || null;
    }
    if (channelId) return channelId;
    return null;
  };

  const handleSendMessage = async (text = '', file = null) => {
    const normalizedText = text ? text.trim() : '';
    const canSend = getChatKind(activeChat) || channelId || userId;
    if ((!normalizedText && !file) || !canSend || sendingMessage) return;

    if (file) {
      const check = validateFileSize(file);
      if (!check.ok) {
        showChatToast(check.message);
        return;
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      userId: currentUser._id,
      text: normalizedText,
      system: false,
      pinned: false,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {},
      name: currentUser.fullName || currentUser.displayName || 'You',
      avatar: currentUser.avatar || 'U',
      color: 'from-blue-500 to-cyan-500',
      pending: true,
      file: file ? {
        url: URL.createObjectURL(file),
        type: fileDisplayCategory(file.type, file.name),
        name: file.name,
        size: formatFileSize(file.size),
        pending: true,
      } : null,
    };

    setMessages(prev => [...prev, optimistic]);
    setSendingMessage(true);

    try {
      const targetId = await resolveChannelId();
      if (!targetId) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        console.error('Send message aborted: no channel id', { activeChat, channelId, activeWorkspaceId });
        const toastMsg = channelId
          ? 'This channel could not be loaded. Refresh the page and try again.'
          : userId
            ? 'Could not open this direct message. Try again in a moment.'
            : 'Select a channel or direct message to send messages and files.';
        showChatToast(toastMsg);
        return;
      }

      const sent = await messageAPI.sendMessage(targetId, normalizedText, file);
      if (sent) {
        setMessages(prev => {
          const withoutTemp = prev.filter(m => m.id !== tempId);
          if (withoutTemp.some(m => m.id === sent._id)) return withoutTemp;
          return [...withoutTemp, mapApiMessage(sent)];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      const msg = err.message || '';
      const sizeHint = /too large|limit/i.test(msg)
        ? msg
        : `Failed to send message. Check your connection or file size (max ${MAX_FILE_SIZE_MB} MB for videos).`;
      showChatToast(msg || sizeHint);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleScheduleCall = async ({ title, scheduledAt }) => {
    const targetId = await resolveChannelId();
    if (!targetId || !activeWorkspaceId) {
      throw new Error('Open a channel or DM before scheduling a call');
    }
    const participantIds = isDmChat(activeChat)
      ? [currentUser._id, activeChat.id]
      : (activeChat.members || []).map(m => m._id || m.id).filter(Boolean);

    const res = await scheduledCallAPI.create(activeWorkspaceId, {
      channelId: targetId,
      title,
      scheduledAt,
      participants: participantIds,
    });

    if (res.call) {
      setUpcomingCalls(prev => {
        if (prev.some(c => c._id === res.call._id)) return prev;
        return [...prev, res.call].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
      });
    }
    if (res.message) {
      setMessages(prev => {
        if (prev.some(m => m.id === res.message._id)) return prev;
        return [...prev, mapApiMessage(res.message)];
      });
    }
  };

  const handleCancelScheduledCall = async (callId) => {
    if (!activeWorkspaceId) return;
    try {
      await scheduledCallAPI.cancel(activeWorkspaceId, callId);
      setUpcomingCalls(prev => prev.filter(c => c._id !== callId));
    } catch (err) {
      console.error('Failed to cancel scheduled call:', err);
      alert(err.message || 'Could not cancel call');
    }
  };

  const handleReaction = (messageId, emoji) => {
    setMessages(prev => prev.map((msg) => {
      if (msg.id !== messageId) return msg;

      const currentReaction = msg.reactions
        ? Object.entries(msg.reactions).map(([key, val]) => ({
            emoji: key,
            count: typeof val === 'object' ? val.count : val,
            userReacted: typeof val === 'object' ? val.userReacted : false,
          })).find(r => r.count > 0)
        : null;

      if (currentReaction?.emoji === emoji) {
        return { ...msg, reactions: {} };
      }

      return {
        ...msg,
        reactions: {
          [emoji]: {
            count: 1,
            userReacted: true,
          },
        },
      };
    }));
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Failed to delete message:', err);
      alert(err.message || 'Unable to delete message.');
    }
  };

  const handleSelectChannel = (channel) => {
    navigate(`/dashboard/${activeWorkspace._id}/channel/${channel._id}`);
  };

  const handleSelectUser = (user) => {
    navigate(`/dashboard/${activeWorkspace._id}/dm/${user.id}`);
  };

  const handleCreateChannel = async (channelName, isPrivate, description) => {
    if (!activeWorkspace) throw new Error('No active workspace');
    const data = await channelAPI.create(activeWorkspace._id, { name: channelName, isPrivate, description });
    setChannels(prev => visibleChannels([...prev, data], currentUser._id));
    if (data.isPrivate && data.inviteCode) {
      setCreatedInviteCode(data.inviteCode);
    }
    navigate(`/dashboard/${activeWorkspace._id}/channel/${data._id}`);
    return data;
  };

  const handleJoinChannel = async (inviteCode) => {
    try {
      if (!activeWorkspace) return;
      const data = await channelAPI.joinByCode(inviteCode);
      setChannels(prev => visibleChannels([...prev, data], currentUser._id));
      setCreateChannelModalOpen(false);
      navigate(`/dashboard/${activeWorkspace._id}/channel/${data._id}`);
    } catch (err) {
      console.error('Failed to join channel:', err);
      alert('Failed to join channel. Make sure the code is correct.');
    }
  };

  const handleCreateDm = (user) => {
    setCreateDmModalOpen(false);
    navigate(`/dashboard/${activeWorkspace._id}/dm/${user.id}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSwitchWorkspace = (ws) => {
    setActiveWorkspace(ws);
    navigate(`/dashboard/${ws._id}`);
  };

  const dashboardWorkspaceId = activeWorkspace?._id || workspaceId;

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 dark:bg-[#222831]">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <>
        {dashboardWorkspaceId && (
          <GlobalIncomingCall currentUser={currentUser} workspaceId={dashboardWorkspaceId} />
        )}
        <div className="h-screen flex items-center justify-center bg-slate-100 dark:bg-[#222831]">
          <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </>
    );
  }

  const appUser = allUsers.find(u => String(u.id) === String(currentUser._id)) || {
    id: currentUser._id,
    _id: currentUser._id,
    name: currentUser.fullName || currentUser.displayName || 'You',
    fullName: currentUser.fullName || currentUser.displayName || 'You',
    avatar: currentUser.avatar || 'U',
    color: currentUser.color || 'from-blue-500 to-cyan-500',
    status: 'online',
  };
  const chatCurrentUser = {
    ...appUser,
    _id: appUser._id || appUser.id || currentUser._id,
    id: appUser.id || appUser._id || currentUser._id,
    fullName: appUser.fullName || appUser.name || currentUser.fullName,
    name: appUser.name || appUser.fullName || currentUser.fullName,
  };

  return (
    <div className="h-screen flex">
      <GlobalIncomingCall currentUser={currentUser} workspaceId={dashboardWorkspaceId} />
      {/* Workspace Switcher Bar */}
      <div className="w-[72px] bg-slate-900 dark:bg-[#1a1e25] flex flex-col items-center py-4 gap-3 border-r border-slate-800 dark:border-[#76ABAE]/10">
        <button
          onClick={() => navigate('/workspaces')}
          className="w-12 h-12 rounded-2xl bg-slate-800 dark:bg-[#31363F] hover:bg-slate-700 dark:hover:bg-[#76ABAE]/20 flex items-center justify-center transition-all hover:rounded-xl mb-1 group"
          title="Back to Workspaces"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 dark:text-[#76ABAE] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="w-8 border-t border-slate-600 dark:border-[#76ABAE]/20 my-1"></div>
        {workspaces.map((ws) => (
          <button
            key={ws._id}
            onClick={() => handleSwitchWorkspace(ws)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg transition-all hover:rounded-xl ${
              activeWorkspace._id === ws._id
                ? `bg-gradient-to-br from-blue-500 to-cyan-500 ring-2 ring-white/30`
                : 'bg-slate-700 dark:bg-[#31363F] hover:bg-gradient-to-br hover:from-blue-500 hover:to-cyan-500 opacity-60 hover:opacity-100'
            }`}
            title={ws.name}
          >
            {(ws.icon || ws.name.substring(0, 2)).toUpperCase()}
          </button>
        ))}
        <div className="w-8 border-t border-slate-600 dark:border-[#76ABAE]/20 my-1"></div>
        <button
          onClick={() => navigate('/workspaces')}
          className="w-12 h-12 rounded-2xl bg-slate-800 dark:bg-[#31363F] hover:bg-slate-700 dark:hover:bg-[#76ABAE]/20 flex items-center justify-center transition-all hover:rounded-xl"
        >
          <Plus className="w-5 h-5 text-slate-400 dark:text-[#76ABAE]" />
        </button>
      </div>

      {/* Left Sidebar */}
      <div className="w-64 bg-blue-600 dark:bg-[#222831] flex flex-col border-r border-blue-500/50 dark:border-[#76ABAE]/20 transition-colors duration-150">
        <div className="p-3 border-b border-blue-500/50 dark:border-[#76ABAE]/20">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeWorkspace.icon}</span>
              <div className="text-left">
                <div className="text-white font-bold text-sm truncate max-w-[140px]">{activeWorkspace.name}</div>
                <div className="text-blue-200 dark:text-[#EEEEEE]/50 text-xs">{allUsers.length} members</div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-blue-200 dark:text-[#EEEEEE]/50" />
          </div>
          <button
            onClick={() => setAddMemberModalOpen(true)}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/30 dark:bg-[#76ABAE]/20 hover:bg-blue-500/50 dark:hover:bg-[#76ABAE]/30 rounded-xl transition-colors text-white dark:text-[#76ABAE] text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
        </div>
        <div className="p-3">
          <SearchBar />
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          <div className="mb-4">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2 text-blue-200 dark:text-[#EEEEEE]/50 text-xs font-semibold">
                <ChevronDown className="w-3 h-3" />
                <span>CHANNELS</span>
              </div>
              <button onClick={() => setCreateChannelModalOpen(true)} className="w-5 h-5 hover:bg-blue-500 dark:hover:bg-[#31363F] rounded flex items-center justify-center transition-colors">
                <Plus className="w-3 h-3 text-blue-200 dark:text-[#EEEEEE]/50" />
              </button>
            </div>
            <div className="space-y-0.5">
              {channels.filter(c => !c.name.startsWith('DM-') && channelVisibleToUser(c, currentUser._id)).map((channel) => (
                <button
                  key={channel._id}
                  onClick={() => handleSelectChannel(channel)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all group ${
                    activeChat && isChannelChat(activeChat) && String(activeChat.id) === String(channel._id)
                      ? 'bg-blue-500 dark:bg-[#76ABAE]/30 text-white'
                      : 'text-blue-100 dark:text-[#EEEEEE]/70 hover:bg-blue-500/60 dark:hover:bg-[#31363F]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {channel.isPrivate ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                    <span className="text-sm font-medium">{getChannelDisplayName(channel, currentUser._id)}</span>
                  </div>
                  {channel.unread > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                      {channel.unread > 9 ? '9+' : channel.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <DirectMessageList
              users={allUsers.filter(u => u.id !== appUser.id)}
              channels={channels}
              currentUserId={currentUser?._id}
              onSelectUser={handleSelectUser}
              activeChat={activeChat}
              onOpenCreateDmModal={() => setCreateDmModalOpen(true)}
            />
          </div>
        </div>
        <div className="p-3 border-t border-blue-500/50 dark:border-[#76ABAE]/20">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-2 hover:bg-blue-500/60 dark:hover:bg-[#31363F] rounded-lg transition-colors group"
            >
              <div className="relative">
                <div className={`w-9 h-9 bg-gradient-to-br ${appUser.color} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                 <Avatar user={appUser} className="w-9 h-9 rounded-lg text-sm" />

                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-blue-600 dark:border-[#222831] rounded-full"></div>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-white text-sm font-semibold truncate">{appUser.name}</div>
                <div className="text-blue-200 dark:text-[#EEEEEE]/50 text-xs">online</div>
              </div>
              <MoreVertical className="w-4 h-4 text-blue-200 dark:text-[#EEEEEE]/50 group-hover:text-white transition-colors flex-shrink-0" />
            </button>
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white/90 dark:bg-[#31363F]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 overflow-hidden z-30">
                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-[#222831]/60 transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-600 dark:text-[#EEEEEE]/50" />
                  <span className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE]">Settings</span>
                </button>
                <button
                  onClick={() => { toggleDarkMode(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100 dark:hover:bg-[#222831]/60 transition-colors"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-[#EEEEEE]/50" />}
                  <span className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE]">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                <div className="border-t border-slate-200/50 dark:border-[#76ABAE]/20"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <ChatView
        key={activeChatKind === 'dm' ? `dm-${activeChatId}` : `ch-${activeChatId || channelId}`}
        chatDetails={activeChat}
        messages={messages}
        messagesLoading={messagesLoading}
        conversationKey={activeChatKind === 'dm' ? `dm-${dmPeerUserId || activeChatId}` : (messageChannelId || activeChatId)}
        sendingMessage={sendingMessage}
        onSendMessage={handleSendMessage}
        onReaction={handleReaction}
        onDeleteMessage={handleDeleteMessage}
        onPinMessage={handlePinMessage}
        onRemoveMember={handleRemoveMember}
        onScheduleCall={handleScheduleCall}
        onCancelScheduledCall={handleCancelScheduledCall}
        upcomingCalls={upcomingCalls}
        currentUser={chatCurrentUser}
        toastMessage={chatToast}
        onShowToast={showChatToast}
        onDismissToast={dismissChatToast}
      />

      {/* Modals */}
      <CreateChannelModal
        isOpen={isCreateChannelModalOpen}
        onClose={() => { setCreateChannelModalOpen(false); setCreatedInviteCode(null); }}
        onCreateChannel={handleCreateChannel}
        onJoinChannel={handleJoinChannel}
        createdInviteCode={createdInviteCode}
      />
      <CreateDirectMessageModal
        isOpen={isCreateDmModalOpen}
        onClose={() => setCreateDmModalOpen(false)}
        users={allUsers.filter(u => u.id !== appUser.id)}
        onSelectUser={handleCreateDm}
      />
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setAddMemberModalOpen(false)}
        workspaceId={activeWorkspace._id}
      />

      {/* Right Sidebar - Online Users */}
      <div className="w-64 bg-slate-50 dark:bg-[#222831] border-l border-slate-200 dark:border-[#76ABAE]/20 overflow-y-auto transition-colors duration-150">
        <div className="p-4">
          <h3 className="text-xs font-bold text-slate-500 dark:text-[#EEEEEE]/50 uppercase tracking-wider mb-4">
            Online — {allUsers.filter(u => u.status === 'online').length}
          </h3>
          <div className="space-y-2">
            {allUsers.filter(u => u.status === 'online').map((user) => (
              <button key={user.id} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-[#31363F] rounded-lg transition-colors group">
                <div className="relative">
                  <div className={`w-9 h-9 bg-gradient-to-br ${user.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                    <Avatar user={user} className="w-9 h-9 rounded-lg text-sm shadow-lg" />

                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-slate-50 dark:border-[#222831] rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE] truncate">{user.name}</span>
              </button>
            ))}
          </div>
          {allUsers.filter(u => u.status === 'away').length > 0 && (
            <>
              <h3 className="text-xs font-bold text-slate-500 dark:text-[#EEEEEE]/50 uppercase tracking-wider mb-4 mt-6">
                Away — {allUsers.filter(u => u.status === 'away').length}
              </h3>
              <div className="space-y-2 mb-4">
                {allUsers.filter(u => u.status === 'away').map((user) => (
                  <button key={user.id} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-[#31363F] rounded-lg transition-colors group">
                    <div className="relative">
                      <div className={`w-9 h-9 bg-gradient-to-br ${user.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg opacity-60`}>
                        <Avatar user={user} dimmed className="w-9 h-9 rounded-lg text-sm shadow-lg" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-yellow-500 border-2 border-slate-50 dark:border-[#222831] rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE] opacity-60 truncate">{user.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <h3 className="text-xs font-bold text-slate-500 dark:text-[#EEEEEE]/50 uppercase tracking-wider mb-4">
            Offline — {allUsers.filter(u => u.status === 'offline' || (!u.status && u.id !== currentUser._id)).length}
          </h3>
          <div className="space-y-2">
            {allUsers.filter(u => u.status === 'offline' || (!u.status && u.id !== currentUser._id)).map((user) => (
              <button key={user.id} className="w-full flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-[#31363F] rounded-lg transition-colors group">
                <div className="relative">
                  <div className={`w-9 h-9 bg-gradient-to-br ${user.color} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg opacity-40`}>
                    <Avatar user={user} dimmed className="w-9 h-9 rounded-lg text-sm shadow-lg" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-slate-400 border-2 border-slate-50 dark:border-[#222831] rounded-full"></div>
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-[#EEEEEE] opacity-50 truncate">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;