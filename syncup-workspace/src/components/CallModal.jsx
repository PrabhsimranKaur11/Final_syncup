import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  PhoneIncoming, PhoneMissed, Volume2, AlertCircle
} from 'lucide-react';
import { startCallRingtone, stopCallRingtone } from '../utils/callRingtone';

const CallModal = ({
  callState, callType, remoteUser, localUser, socketService,
  onClose, incomingOffer, onAcceptCall, callLogId,
}) => {
  const localVideoRef     = useRef(null);
  const remoteVideoRef    = useRef(null);
  const peerRef           = useRef(null);
  const localStreamRef    = useRef(null);
  const iceCandidateQueue = useRef([]);
  const callTimeoutRef    = useRef(null);

  const [isMuted, setIsMuted]           = useState(false);
  const [isCamOff, setIsCamOff]         = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteStream, setRemoteStream] = useState(false);
  const [isPending, setIsPending]       = useState(false);
  const [isAccepting, setIsAccepting]   = useState(false);
  const [isMissed, setIsMissed]         = useState(false);
  const [callError, setCallError]       = useState(null);
  const durationRef = useRef(null);

  const missedTriggeredRef = useRef(false);
  const outgoingOfferSentRef = useRef(false);
  const callStateRef = useRef(callState);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  const peerId = remoteUser?.id ? String(remoteUser.id) : null;
  const localId = localUser?._id || localUser?.id;
  const localIdStr = localId ? String(localId) : null;

  const emitCallEnd = useCallback((extra = {}) => {
    if (!peerId) return;
    socketService.emit('call:end', {
      to: peerId,
      callLogId,
      duration: extra.duration ?? 0,
      callType,
      reason: extra.reason,
    });
  }, [peerId, socketService, callLogId, callType]);

  const iceConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const getLocalMedia = useCallback(async () => {
    const constraints = {
      audio: true,
      video: callType === 'video'
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }, [callType]);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  const createPeer = useCallback((stream) => {
    const pc = new RTCPeerConnection(iceConfig);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setRemoteStream(true);
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && peerId) {
        socketService.emit('call:ice-candidate', {
          to: peerId,
          candidate: e.candidate,
        });
      }
    };

    peerRef.current = pc;
    return pc;
  }, [peerId, socketService]);

  const startDurationTimer = useCallback(() => {
    clearInterval(durationRef.current);
    durationRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, []);

  const cleanup = useCallback(() => {
    stopCallRingtone();
    clearInterval(durationRef.current);
    clearTimeout(callTimeoutRef.current);
    peerRef.current?.close();
    peerRef.current = null;
    stopLocalStream();
    setCallDuration(0);
    setRemoteStream(false);
    setIsPending(false);
    setIsMuted(false);
    setIsCamOff(false);
    setCallError(null);
    iceCandidateQueue.current = [];
    missedTriggeredRef.current = false;
    outgoingOfferSentRef.current = false;
  }, [stopLocalStream]);

  const drainIceCandidates = useCallback(async () => {
    if (!peerRef.current) return;
    for (const candidate of iceCandidateQueue.current) {
      try { await peerRef.current.addIceCandidate(candidate); } catch {}
    }
    iceCandidateQueue.current = [];
  }, []);

  // ─── OUTGOING: acquire media, create peer, send offer immediately ───────
  // The caller drives negotiation. The callee receives `call:offer` via the
  // parent (which stores it as `incomingOffer`) and then presses Accept.
  useEffect(() => {
    if (callState !== 'outgoing') {
      outgoingOfferSentRef.current = false;
      return;
    }
    if (!peerId || !localIdStr) {
      setCallError('Call could not start — missing participant info.');
      return;
    }
    if (outgoingOfferSentRef.current) return;
    outgoingOfferSentRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const stream = await getLocalMedia();
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        const pc = createPeer(stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketService.emit('call:offer', {
          to: peerId,
          from: localIdStr,
          offer: pc.localDescription,
          callType,
        });
      } catch (err) {
        console.error('Outgoing call error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCallError('Microphone/camera permission denied. Please allow access and try again.');
        } else if (err.name === 'NotFoundError') {
          setCallError('No microphone or camera found.');
        } else {
          setCallError('Could not start the call. Please try again.');
        }
        setTimeout(() => { if (!cancelled) { cleanup(); onClose(); } }, 3000);
      }
    })();

    return () => { cancelled = true; };
  }, [callState, peerId, localIdStr, callType, getLocalMedia, createPeer, socketService, cleanup, onClose]);

  // ─── Socket listeners ────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'idle') return;

    const handleAnswer = async ({ answer }) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        await drainIceCandidates();
        clearTimeout(callTimeoutRef.current);
        startDurationTimer();
        onAcceptCall();
      } catch (err) {
        console.error('Answer error:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!peerRef.current || !peerRef.current.remoteDescription) {
        iceCandidateQueue.current.push(candidate);
        return;
      }
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    };

    const handleRemoteCallEnded = () => {
      missedTriggeredRef.current = true;
      clearTimeout(callTimeoutRef.current);
      cleanup();
      onClose();
    };
    const handleRemoteCallRejected = () => {
      cleanup();
      onClose();
    };
    const handleCallPending = () => {
      setIsPending(true);
      setCallError('User is offline. Call queued and waiting for them to come online.');
    };

    socketService.on('call:answer',        handleAnswer);
    socketService.on('call:ice-candidate', handleIceCandidate);
    socketService.on('call:ended',         handleRemoteCallEnded);
    socketService.on('call:rejected',      handleRemoteCallRejected);
    socketService.on('call:pending',       handleCallPending);

    return () => {
      socketService.off('call:answer',        handleAnswer);
      socketService.off('call:ice-candidate', handleIceCandidate);
      socketService.off('call:ended',         handleRemoteCallEnded);
      socketService.off('call:rejected',      handleRemoteCallRejected);
      socketService.off('call:pending',       handleCallPending);
    };
  }, [callState, cleanup, drainIceCandidates, onClose, socketService, startDurationTimer, onAcceptCall]);

  // ─── Accept incoming call ────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!incomingOffer) {
      setCallError('Waiting for the caller to connect. Please try again in a moment.');
      setIsAccepting(true);
      return;
    }
    try {
      setIsAccepting(false);
      const stream = await getLocalMedia();
      const pc = createPeer(stream);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      await drainIceCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socketService.emit('call:answer', {
        to: peerId,
        answer: pc.localDescription,
        callLogId,
      });

      clearTimeout(callTimeoutRef.current);
      startDurationTimer();
      onAcceptCall();
    } catch (err) {
      console.error('Accept call error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCallError('Microphone/camera permission denied.');
      } else {
        setCallError('Could not connect call. Please try again.');
      }
      setTimeout(() => { cleanup(); onClose(); }, 3000);
    }
  }, [incomingOffer, peerId, socketService, getLocalMedia, createPeer,
      drainIceCandidates, startDurationTimer, onAcceptCall, cleanup, onClose]);

  useEffect(() => {
    if (isAccepting && incomingOffer) {
      handleAccept();
    }
  }, [isAccepting, incomingOffer, handleAccept]);

  const handleEndCall = useCallback(() => {
    if (missedTriggeredRef.current) {
      cleanup();
      onClose();
      return;
    }
    missedTriggeredRef.current = true;
    clearTimeout(callTimeoutRef.current);

    const state = callStateRef.current;
    if (state === 'active') {
      emitCallEnd({ duration: callDuration, reason: 'ended' });
    } else if (state === 'outgoing') {
      emitCallEnd({ reason: 'canceled' });
    } else if (state === 'incoming') {
      socketService.emit('call:reject', { to: peerId, callLogId });
    } else {
      emitCallEnd({ reason: 'canceled' });
    }
    stopCallRingtone();
    cleanup();
    onClose();
  }, [callDuration, cleanup, emitCallEnd, onClose, peerId, socketService, callLogId]);

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(m => !m);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isCamOff; });
    setIsCamOff(c => !c);
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  useEffect(() => {
    if (callState === 'active') {
      clearTimeout(callTimeoutRef.current);
      return undefined;
    }
    if (callState !== 'outgoing' && callState !== 'incoming') {
      return undefined;
    }

    clearTimeout(callTimeoutRef.current);
    callTimeoutRef.current = setTimeout(() => {
      if (missedTriggeredRef.current) return;
      missedTriggeredRef.current = true;

      const state = callStateRef.current;
      if (state === 'outgoing') {
        setIsMissed(true);
        setCallError('No answer — the call timed out.');
        emitCallEnd({ reason: 'no-answer' });
      } else if (state === 'incoming') {
        setCallError('Call was not answered within 30 seconds.');
        emitCallEnd({ reason: 'missed' });
      }
      cleanup();
      onClose();
    }, 30000);

    return () => clearTimeout(callTimeoutRef.current);
  }, [callState, cleanup, emitCallEnd, onClose]);

  useEffect(() => {
    if (callState === 'active') {
      clearTimeout(callTimeoutRef.current);
    }
  }, [callState]);

  useEffect(() => {
    if (callState === 'incoming' || callState === 'outgoing') {
      startCallRingtone().catch(() => {});
      return () => stopCallRingtone();
    }
    stopCallRingtone();
    return undefined;
  }, [callState]);

  if (callState === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`relative flex flex-col overflow-hidden rounded-3xl shadow-2xl bg-gradient-to-b from-[#1a1f2e] to-[#0d1117] border border-white/10 ${callType === 'video' && callState === 'active' ? 'w-[860px] h-[560px]' : 'w-80'}`}>

        {callError && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-start gap-3 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm leading-snug">{callError}</p>
          </div>
        )}

        {callType === 'video' && callState === 'active' && (
          <>
            <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            {!remoteStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]">
                <CallAvatar user={remoteUser} size="lg" />
                <p className="text-white/60 text-sm animate-pulse mt-4">Connecting…</p>
              </div>
            )}
            <div className="absolute top-4 right-4 w-36 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              {isCamOff && <div className="absolute inset-0 bg-[#1a1f2e] flex items-center justify-center"><VideoOff className="w-6 h-6 text-white/40" /></div>}
            </div>
            <div className="absolute top-4 left-4 flex items-center gap-3">
              <div className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-2 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-white text-sm font-medium">{formatDuration(callDuration)}</span>
              </div>
              <div className="bg-black/40 backdrop-blur-md rounded-xl px-3 py-1.5 border border-white/10">
                <span className="text-white/70 text-sm">{remoteUser?.name}</span>
              </div>
            </div>
            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4">
              <ControlBtn onClick={toggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />} />
              <ControlBtn onClick={toggleCamera} active={isCamOff} label={isCamOff ? 'Show cam' : 'Hide cam'} icon={isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />} />
              <button onClick={handleEndCall} className="w-14 h-14 bg-red-500 hover:bg-red-600 active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 transition-all">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
            </div>
          </>
        )}

        {callType === 'audio' && callState === 'active' && (
          <div className="flex flex-col items-center px-8 py-10 gap-6">
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
            <video ref={localVideoRef}  autoPlay playsInline muted className="hidden" />
            <CallAvatar user={remoteUser} size="lg" />
            <div className="text-center">
              <p className="text-white font-bold text-xl">{remoteUser?.name}</p>
              <p className="text-green-400 text-sm mt-1 font-mono">{formatDuration(callDuration)}</p>
            </div>
            <div className="flex items-center gap-1 h-8">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="w-1 bg-[#76ABAE]/60 rounded-full animate-bounce" style={{ height: `${12 + (i % 3) * 8}px`, animationDelay: `${i * 0.1}s`, animationDuration: '0.8s' }} />
              ))}
            </div>
            <div className="flex items-center gap-4">
              <ControlBtn onClick={toggleMute} active={isMuted} label={isMuted ? 'Unmute' : 'Mute'} icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />} />
              <button onClick={handleEndCall} className="w-14 h-14 bg-red-500 hover:bg-red-600 active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 transition-all">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <ControlBtn onClick={() => {}} active={false} label="Speaker" icon={<Volume2 className="w-5 h-5" />} />
            </div>
          </div>
        )}

        {callState === 'outgoing' && (
          <div className="flex flex-col items-center px-8 py-10 gap-6">
            <div className="relative">
              <CallAvatar user={remoteUser} size="lg" />
              <div className="absolute inset-0 rounded-full border-2 border-[#76ABAE]/30 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white/50 text-sm uppercase tracking-widest font-medium mb-1">{callType === 'video' ? 'Video calling' : 'Calling'}</p>
              <p className="text-white font-bold text-2xl">{remoteUser?.name}</p>
              {isMissed ? (
                <p className="text-red-300 text-sm mt-1">Missed call</p>
              ) : callError ? (
                <p className="text-red-300 text-sm mt-1">{callError}</p>
              ) : (
                <p className="text-white/40 text-sm mt-1 animate-pulse">Ringing…</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-3 mt-2">
              <button onClick={handleEndCall} className="w-14 h-14 bg-red-500 hover:bg-red-600 active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 transition-all">
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={handleEndCall}
                className="text-sm font-semibold text-white/80 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {callState === 'incoming' && (
          <div className="flex flex-col items-center px-8 py-10 gap-6">
            <div className="relative">
              <CallAvatar user={remoteUser} size="lg" />
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-[#1a1f2e] animate-bounce">
                {callType === 'video' ? <Video className="w-4 h-4 text-white" /> : <PhoneIncoming className="w-4 h-4 text-white" />}
              </div>
            </div>
            <div className="text-center">
              <p className="text-white/50 text-sm uppercase tracking-widest font-medium mb-1">Incoming {callType === 'video' ? 'video' : 'audio'} call</p>
              <p className="text-white font-bold text-2xl">{remoteUser?.name}</p>
            </div>
            <div className="flex items-center gap-6">
              <button onClick={handleEndCall} className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-red-500 hover:bg-red-600 active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-red-500/30 transition-all">
                  <PhoneMissed className="w-6 h-6 text-white" />
                </div>
                <span className="text-white/40 text-xs">Decline</span>
              </button>
              <button
                onClick={handleAccept}
                disabled={!incomingOffer}
                className={`flex flex-col items-center gap-2 ${!incomingOffer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="w-14 h-14 bg-green-500 hover:bg-green-600 active:scale-95 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 transition-all animate-pulse">
                  {callType === 'video' ? <Video className="w-6 h-6 text-white" /> : <Phone className="w-6 h-6 text-white" />}
                </div>
                <span className="text-white/40 text-xs">{incomingOffer ? 'Accept' : 'Waiting…'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CallAvatar = ({ user, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const dim = size === 'lg' ? 'w-24 h-24 text-4xl' : 'w-10 h-10 text-base';
  const isUrl = typeof user?.avatar === 'string'
    && user.avatar.length > 4
    && (/(^(https?:)?\/\/|^\/|^[\w.-]+\.[\w.-]+)/i.test(user.avatar));
  const showImg = isUrl && !imgError;
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${user?.color || 'from-blue-500 to-cyan-500'} flex items-center justify-center font-bold text-white shadow-2xl overflow-hidden flex-shrink-0`}>
      {showImg
        ? <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        : <span>{initials}</span>}
    </div>
  );
};

const ControlBtn = ({ onClick, active, icon, label }) => (
  <button onClick={onClick} title={label} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${active ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-white/10 text-white/70 border border-white/10 hover:bg-white/20'}`}>
    {icon}
  </button>
);

export default CallModal;
