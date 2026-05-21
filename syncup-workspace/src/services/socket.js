import { io } from 'socket.io-client';

const IDLE_MS = 5 * 60 * 1000; // 5 minutes — WhatsApp-style idle → away

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionListeners = new Set();
    this.connected = false;
    this.pendingRegisterUserId = null;
    this.pendingEmitQueue = [];
    this.presenceWorkspaceId = null;
    this.presenceUserId = null;
    this.presenceIsAway = false;
    this.idleTimer = null;
    this.presenceHandlersAttached = false;
  }

  /** Subscribe to connect/disconnect so UI can enable call buttons. */
  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
    callback(this.connected);
    return () => this.connectionListeners.delete(callback);
  }

  _setConnected(value) {
    if (this.connected === value) return;
    this.connected = value;
    this.connectionListeners.forEach((cb) => {
      try { cb(value); } catch (e) { console.error(e); }
    });
  }

  connect() {
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.connect();
      return;
    }

    this.socket = io('/', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this._setConnected(true);
      if (this.pendingRegisterUserId) {
        this.socket.emit('user:register', { userId: this.pendingRegisterUserId });
      }
      if (this.pendingEmitQueue.length > 0) {
        this.pendingEmitQueue.forEach(({ event, data }) => {
          this.socket.emit(event, data);
        });
        this.pendingEmitQueue = [];
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this._setConnected(false);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err?.message || err);
      this._setConnected(false);
    });

    // Reattach app listeners after reconnect
    for (const [event, callbacks] of this.listeners.entries()) {
      callbacks.forEach((callback) => {
        this.socket.on(event, callback);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this._setConnected(false);
  }

  isConnected() {
    return Boolean(this.socket?.connected);
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    if (this.socket) this.socket.on(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback);
        if (this.socket) this.socket.off(event, callback);
      } else {
        this.listeners.delete(event);
        if (this.socket) this.socket.off(event);
      }
    }
  }

  emit(event, data) {
    if (!this.socket) {
      this.connect();
    }

    if (this.socket?.connected) {
      this.socket.emit(event, data);
      return;
    }

    this.pendingEmitQueue.push({ event, data });
  }

  // ─── Workspace / Channel ───────────────────────────────────────────────────

  joinWorkspace(workspaceId, userId) {
    this.emit('join-workspace', {
      workspaceId,
      userId: userId || this.pendingRegisterUserId || '',
    });
  }

  leaveWorkspace(workspaceId, userId) {
    this.teardownPresence();
    this.emit('leave-workspace', { workspaceId, userId });
  }

  /**
   * WhatsApp-style presence: online when active, away when tab hidden or idle.
   */
  setupPresence(workspaceId, userId) {
    if (!workspaceId || !userId) return;

    this.presenceWorkspaceId = workspaceId;
    this.presenceUserId = userId;

    if (this.presenceHandlersAttached) return;
    this.presenceHandlersAttached = true;

    const markOnline = () => {
      if (!this.presenceWorkspaceId || !this.presenceUserId) return;
      if (this.presenceIsAway || document.hidden) return;
      this.presenceIsAway = false;
      this.emit('user-online', {
        userId: this.presenceUserId,
        workspaceId: this.presenceWorkspaceId,
      });
    };

    const markAway = () => {
      if (!this.presenceWorkspaceId || !this.presenceUserId || this.presenceIsAway) return;
      this.presenceIsAway = true;
      this.emit('user-away', {
        userId: this.presenceUserId,
        workspaceId: this.presenceWorkspaceId,
      });
    };

    const resetIdleTimer = () => {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (document.hidden) return;
      markOnline();
      this.idleTimer = setTimeout(markAway, IDLE_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        markAway();
      } else {
        this.presenceIsAway = false;
        resetIdleTimer();
      }
    };

    const onActivity = () => resetIdleTimer();

    this._presenceMarkOnline = markOnline;
    this._presenceMarkAway = markAway;
    this._presenceOnVisibility = onVisibility;
    this._presenceOnActivity = onActivity;

    document.addEventListener('visibilitychange', onVisibility);
    ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
      window.addEventListener(evt, onActivity, { passive: true });
    });

    resetIdleTimer();
  }

  teardownPresence() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this._presenceOnVisibility) {
      document.removeEventListener('visibilitychange', this._presenceOnVisibility);
    }
    if (this._presenceOnActivity) {
      ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach((evt) => {
        window.removeEventListener(evt, this._presenceOnActivity);
      });
    }
    this.presenceHandlersAttached = false;
    this.presenceWorkspaceId = null;
    this.presenceUserId = null;
    this.presenceIsAway = false;
    this._presenceMarkOnline = null;
    this._presenceMarkAway = null;
    this._presenceOnVisibility = null;
    this._presenceOnActivity = null;
  }

  joinChannel(channelId, userId) {
    this.emit('join-channel', { channelId, userId: userId || this.pendingRegisterUserId });
  }

  leaveChannel(channelId) {
    this.emit('leave-channel', { channelId });
  }

  sendMessage(message) {
    this.emit('send-message', message);
  }

  typing(data) {
    this.emit('typing', data);
  }

  // ─── WebRTC Call Signaling ─────────────────────────────────────────────────

  /** Register user id so the server can route call:* events to this socket. */
  registerUser(userId) {
    if (!userId) return;
    this.pendingRegisterUserId = userId;
    if (!this.socket) {
      this.connect();
    }
    if (this.socket?.connected) {
      this.emit('user:register', { userId });
    }
  }

  /**
   * Step 1 (caller): Notify the remote user of an incoming call.
   * Payload: { to, from, callerName, callerAvatar, callerColor, callType }
   */
  initiateCall(data) {
    this.emit('call:initiate', data);
  }

  /**
   * Step 2 (caller): Send the WebRTC offer to the remote user.
   * Payload: { to, from, offer: RTCSessionDescriptionInit, callType }
   */
  sendOffer(data) {
    this.emit('call:offer', data);
  }

  /**
   * Step 3 (callee): Send the WebRTC answer back to the caller.
   * Payload: { to, answer: RTCSessionDescriptionInit }
   */
  sendAnswer(data) {
    this.emit('call:answer', data);
  }

  /**
   * Both sides: Relay ICE candidates during negotiation.
   * Payload: { to, candidate: RTCIceCandidateInit }
   */
  sendIceCandidate(data) {
    this.emit('call:ice-candidate', data);
  }

  /**
   * Callee: Reject the incoming call.
   * Payload: { to }
   */
  rejectCall(to) {
    this.emit('call:reject', { to });
  }

  /**
   * Either side: End an active call.
   * Payload: { to }
   */
  endCall(to) {
    this.emit('call:end', { to });
  }
}

export const socketService = new SocketService();