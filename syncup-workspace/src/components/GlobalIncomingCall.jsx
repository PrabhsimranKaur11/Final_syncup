import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video } from 'lucide-react';
import CallModal from './CallModal';
import { socketService } from '../services/socket';
import { unlockCallAudio, startCallRingtone, stopCallRingtone } from '../utils/callRingtone';

/**
 * Workspace-level incoming call UI (WhatsApp-style).
 * Works as soon as the user lands on the dashboard after login.
 */
export default function GlobalIncomingCall({ currentUser, workspaceId }) {
  const navigate = useNavigate();
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('audio');
  const [remoteUser, setRemoteUser] = useState(null);
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [callLogId, setCallLogId] = useState(null);
  const seenLogsRef = useRef(new Set());
  const callStateRef = useRef('idle');

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // After incoming UI mounts, tell caller it is safe to send the WebRTC offer
  useEffect(() => {
    if (callState !== 'incoming' || !remoteUser?.id) return;
    socketService.emit('call:ready', { to: String(remoteUser.id) });
  }, [callState, remoteUser?.id]);

  const localUser = currentUser ? {
    _id: currentUser._id,
    id: currentUser._id,
    name: currentUser.fullName || currentUser.displayName || 'You',
    fullName: currentUser.fullName || currentUser.displayName,
    avatar: currentUser.avatar,
    color: currentUser.color || 'from-blue-500 to-cyan-500',
  } : null;

  const showIncomingNotification = useCallback((callerName, callerAvatar, type) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const label = type === 'video' ? 'Video call' : 'Voice call';
    const body = `${callerName} is calling you`;
    const show = () => {
      try {
        const n = new Notification(label, {
          body,
          icon: callerAvatar || '/favicon.ico',
          tag: 'syncup-incoming-call',
          requireInteraction: true,
          silent: false,
        });
        n.onclick = () => window.focus();
      } catch (err) {
        console.error('Notification error:', err);
      }
    };
    if (Notification.permission === 'granted') {
      show();
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') show();
      });
    }
  }, []);

  const handleIncoming = useCallback(({
    from,
    callerName,
    callerAvatar,
    callerColor,
    callType: type,
    channelId: incomingChannelId,
    callLogId: incomingCallLogId,
  }) => {
    if (callStateRef.current !== 'idle') return;

    if (incomingCallLogId) {
      const key = String(incomingCallLogId);
      if (seenLogsRef.current.has(key)) return;
      seenLogsRef.current.add(key);
    }

    unlockCallAudio();
    startCallRingtone().catch(() => {});

    setCallType(type || 'audio');
    setRemoteUser({
      id: String(from),
      name: callerName || 'Someone',
      avatar: callerAvatar,
      color: callerColor,
    });
    setCallState('incoming');
    if (incomingCallLogId) setCallLogId(incomingCallLogId);

    showIncomingNotification(callerName || 'Someone', callerAvatar, type);

    if (incomingChannelId && currentUser) {
      socketService.joinChannel(
        incomingChannelId,
        currentUser._id || currentUser.id
      );
    }

    if (workspaceId && from) {
      navigate(`/dashboard/${workspaceId}/dm/${from}`);
    }
  }, [currentUser, workspaceId, navigate, showIncomingNotification]);

  useEffect(() => {
    if (!currentUser?._id || !workspaceId) return;

    unlockCallAudio();
    socketService.connect();
    socketService.registerUser(currentUser._id || currentUser.id);
    socketService.joinWorkspace(workspaceId, currentUser._id);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().catch(() => {});
    }

    const onOffer = ({ offer }) => setIncomingOffer(offer);
    const onStarted = ({ callLogId: id }) => {
      if (id) setCallLogId((prev) => prev || id);
    };

    socketService.on('call:incoming', handleIncoming);
    socketService.on('call:offer', onOffer);
    socketService.on('call:started', onStarted);

    return () => {
      socketService.off('call:incoming', handleIncoming);
      socketService.off('call:offer', onOffer);
      socketService.off('call:started', onStarted);
    };
  }, [currentUser?._id, workspaceId, handleIncoming]);

  const handleClose = () => {
    stopCallRingtone();
    setCallState('idle');
    setRemoteUser(null);
    setIncomingOffer(null);
    setCallLogId(null);
  };

  if (!localUser || callState === 'idle') return null;

  return (
    <>
      <CallModal
        callState={callState}
        callType={callType}
        remoteUser={remoteUser}
        localUser={localUser}
        socketService={socketService}
        onClose={handleClose}
        incomingOffer={incomingOffer}
        onAcceptCall={() => {
          stopCallRingtone();
          setCallState('active');
        }}
        callLogId={callLogId}
      />
      {callState === 'incoming' && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-md px-4 pointer-events-none">
          <div className="flex items-center gap-4 bg-[#1a2332] border border-[#76ABAE]/40 rounded-2xl shadow-2xl px-5 py-4 pointer-events-auto animate-pulse">
            <div className="w-12 h-12 rounded-full bg-[#76ABAE]/20 flex items-center justify-center shrink-0">
              {callType === 'video' ? (
                <Video className="w-6 h-6 text-[#76ABAE]" />
              ) : (
                <Phone className="w-6 h-6 text-[#76ABAE]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">
                {remoteUser?.name || 'Someone'}
              </p>
              <p className="text-[#76ABAE] text-sm">
                {remoteUser?.name || 'Someone'} is calling you…
              </p>
            </div>
            <Phone className="w-5 h-5 text-green-400 animate-bounce shrink-0" />
          </div>
        </div>
      )}
    </>
  );
}
