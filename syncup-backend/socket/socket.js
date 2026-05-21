import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Channel from "../models/Channel.js";
import Workspace from "../models/Workspace.js";
import CallLog from "../models/CallLog.js";
import { createRingingCall, finalizeCallLog } from "../utils/callHelpers.js";

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Track online users: Map<socketId, { userId, workspaceId }>
  const onlineUsers = new Map();

  // Live presence per workspace: workspaceId -> Map<userId, status>
  const workspacePresence = new Map();

  // Multi-tab socket counting so closing one tab doesn't set user offline
  const userSocketCountMap = new Map();

  const parseCookies = (cookieHeader = "") => {
    if (!cookieHeader) return {};
    return Object.fromEntries(
      cookieHeader.split(";").map((part) => {
        const [key, ...rest] = part.trim().split("=");
        return [key, decodeURIComponent(rest.join("="))];
      })
    );
  };

  const getWorkspacePresenceMap = (workspaceId) => {
    const key = String(workspaceId);
    if (!workspacePresence.has(key)) {
      workspacePresence.set(key, new Map());
    }
    return workspacePresence.get(key);
  };

  const broadcastStatus = (workspaceId, userId, status) => {
    const presenceMap = getWorkspacePresenceMap(workspaceId);
    presenceMap.set(String(userId), status);
    io.to(`workspace:${workspaceId}`).emit("user-status-changed", {
      userId: String(userId),
      status,
    });
  };

  // WebRTC Call Signaling Maps (multi-tab: userId -> Set<socketId>)
  const userSocketMap = new Map();
  const socketUserMap = new Map();
  const pendingSignals = new Map();

  const addUserSocket = (userId, socketId) => {
    const key = String(userId);
    const sockets = userSocketMap.get(key) || new Set();
    sockets.add(socketId);
    userSocketMap.set(key, sockets);
    socketUserMap.set(socketId, key);
  };

  const removeUserSocket = (socketId) => {
    const userId = socketUserMap.get(socketId);
    if (!userId) return;
    const sockets = userSocketMap.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) userSocketMap.delete(userId);
    }
    socketUserMap.delete(socketId);
  };

  const getSocketId = (userId) => {
    const sockets = userSocketMap.get(String(userId));
    if (!sockets || sockets.size === 0) return null;
    return [...sockets].at(-1);
  };

  const queueSignal = (toId, event, payload) => {
    const key = String(toId);
    const queue = pendingSignals.get(key) || [];
    if (event === "call:incoming" && payload?.callLogId) {
      const logKey = String(payload.callLogId);
      const existing = queue.findIndex(
        (q) => q.event === "call:incoming" && String(q.payload?.callLogId) === logKey
      );
      if (existing >= 0) {
        queue[existing] = { event, payload };
      } else {
        queue.push({ event, payload });
      }
    } else {
      queue.push({ event, payload });
    }
    pendingSignals.set(key, queue);
  };

  const deliverPendingSignals = (userId, socketId) => {
    const queue = pendingSignals.get(String(userId));
    if (!queue || queue.length === 0) return;
    queue.forEach(({ event, payload }) => io.to(socketId).emit(event, payload));
    pendingSignals.delete(String(userId));
  };

  const RING_TIMEOUT_MS = 30_000;
  const ringTimeouts = new Map();

  const clearRingTimeout = (callLogId) => {
    if (!callLogId) return;
    const key = String(callLogId);
    const t = ringTimeouts.get(key);
    if (t) {
      clearTimeout(t);
      ringTimeouts.delete(key);
    }
  };

  const emitToUser = (userId, event, payload) => {
    const targetSocketId = getSocketId(userId);
    if (targetSocketId) io.to(targetSocketId).emit(event, payload);
  };

  const scheduleRingTimeout = (log, callerId, calleeId) => {
    if (!log?._id) return;
    const callLogId = log._id.toString();
    clearRingTimeout(callLogId);

    const timeout = setTimeout(async () => {
      ringTimeouts.delete(callLogId);
      try {
        const current = await CallLog.findById(callLogId);
        if (!current || current.status !== 'ringing') return;

        const { log: updated } = await finalizeCallLog(callLogId, {
          status: 'missed',
          endedBy: callerId,
        });
        if (!updated || updated.status !== 'missed') return;

        emitToUser(calleeId, 'call:ended', { callLogId, reason: 'timeout' });
        emitToUser(callerId, 'call:ended', { callLogId, reason: 'timeout' });
      } catch (err) {
        console.error('Ring timeout error:', err);
      }
    }, RING_TIMEOUT_MS);

    ringTimeouts.set(callLogId, timeout);
  };

  // ─── Socket Auth Middleware ───────────────────────────────────────────────
  io.use(async (socket, next) => {
    const cookies = parseCookies(socket.handshake.headers?.cookie);
    const token =
      socket.handshake.auth?.token ||
      cookies.jwt ||
      socket.handshake.headers?.authorization?.split(" ")[1];
    if (!token) return next(new Error("Unauthorized"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId || decoded.id;
      if (!socket.userId) return next(new Error("Invalid token"));
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  const registerSocketForCalls = (socket) => {
    if (!socket.userId) return;
    const uid = String(socket.userId);
    addUserSocket(uid, socket.id);
    deliverPendingSignals(uid, socket.id);
  };

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId || "unknown"})`);

    // Auto-register from JWT so calls route even if client skips user:register
    registerSocketForCalls(socket);

    // ─── Workspace & Channel Room Management ─────────────────────────────────

    socket.on("join-workspace", async ({ workspaceId, userId: payloadUserId }) => {
      const userId = payloadUserId || socket.userId;
      if (!userId || !workspaceId) return;

      socket.join(`workspace:${workspaceId}`);
      onlineUsers.set(socket.id, { userId, workspaceId });

      const count = (userSocketCountMap.get(userId) || 0) + 1;
      userSocketCountMap.set(userId, count);

      try {
        await User.findByIdAndUpdate(userId, { status: "online", lastSeen: new Date() });
        broadcastStatus(workspaceId, userId, "online");

        const workspace = await Workspace.findById(workspaceId).populate(
          "members",
          "status fullName lastSeen"
        );
        if (workspace) {
          const presenceMap = getWorkspacePresenceMap(workspaceId);
          const snapshot = workspace.members.map((m) => {
            const memberId = m._id.toString();
            const liveStatus = presenceMap.get(memberId);
            if (memberId === String(userId)) {
              return { userId: memberId, status: "online" };
            }
            if (liveStatus) {
              return { userId: memberId, status: liveStatus };
            }
            const dbStatus = m.status || "offline";
            if (dbStatus === "online") {
              return { userId: memberId, status: "offline" };
            }
            return { userId: memberId, status: dbStatus };
          });
          socket.emit("workspace-presence-snapshot", snapshot);
        }
      } catch (err) {
        console.error("Error in join-workspace:", err);
      }

      console.log(`User ${userId} joined workspace ${workspaceId}`);
    });

    socket.on("leave-workspace", ({ workspaceId, userId }) => {
      socket.leave(`workspace:${workspaceId}`);
      onlineUsers.delete(socket.id);
      console.log(`User ${userId} left workspace ${workspaceId}`);
    });

    socket.on("join-channel", async ({ channelId, userId: payloadUserId }) => {
      try {
        const userId = payloadUserId || socket.userId;
        const channel = await Channel.findById(channelId).lean();
        if (!channel) return;

        if (channel.isPrivate) {
          const isMember = channel.members?.some((m) => m.toString() === userId);
          if (!isMember) {
            socket.emit("channel-access-denied", { channelId });
            return;
          }
        }

        socket.join(`channel:${channelId}`);
        console.log(`Socket ${socket.id} joined channel ${channelId}`);
      } catch (err) {
        console.error("Error in join-channel:", err);
      }
    });

    socket.on("leave-channel", ({ channelId }) => {
      socket.leave(`channel:${channelId}`);
      console.log(`Socket ${socket.id} left channel ${channelId}`);
    });

    // ─── Message Events ───────────────────────────────────────────────────────

    socket.on("send-message", (message) => {
      io.to(`channel:${message.channelId}`).emit("new-message", message);
    });

    socket.on("delete-message", ({ messageId, channelId }) => {
      io.to(`channel:${channelId}`).emit("delete-message", { messageId, channelId });
    });

    // ─── Presence Events ──────────────────────────────────────────────────────

    socket.on("user-away", async ({ userId, workspaceId }) => {
      const uid = userId || socket.userId;
      if (!uid || !workspaceId) return;
      try {
        await User.findByIdAndUpdate(uid, { status: "away", lastSeen: new Date() });
        broadcastStatus(workspaceId, uid, "away");
      } catch (err) {
        console.error("Error updating away status:", err);
      }
    });

    socket.on("user-online", async ({ userId, workspaceId }) => {
      const uid = userId || socket.userId;
      if (!uid || !workspaceId) return;
      try {
        await User.findByIdAndUpdate(uid, { status: "online", lastSeen: new Date() });
        broadcastStatus(workspaceId, uid, "online");
      } catch (err) {
        console.error("Error updating online status:", err);
      }
    });

    // ─── Typing Events ────────────────────────────────────────────────────────

    socket.on("typing", ({ channelId, userId, fullName }) => {
      socket.to(`channel:${channelId}`).emit("user-typing", {
        channelId,
        userId,
        fullName,
      });
    });

    socket.on("stop-typing", ({ channelId, userId }) => {
      socket.to(`channel:${channelId}`).emit("user-stop-typing", {
        channelId,
        userId,
      });
    });

    // ─── WebRTC Call Signaling ────────────────────────────────────────────────

    socket.on("user:register", ({ userId }) => {
      const uid = userId || socket.userId;
      if (!uid) return;
      removeUserSocket(socket.id);
      addUserSocket(String(uid), socket.id);
      console.log(`User ${uid} registered for calls on socket ${socket.id}`);
      deliverPendingSignals(uid, socket.id);
    });

    socket.on("call:initiate", async ({
      to,
      from,
      callerName,
      callerAvatar,
      callerColor,
      callType,
      workspaceId,
      contextChannelId,
    }) => {
      const callerId = from || socket.userId;
      if (!to || !callerId || !workspaceId) {
        socket.emit("call:error", {
          message: "Missing call target, caller, or workspace.",
        });
        return;
      }

      const emitIncomingToCallee = (payload, startedMeta) => {
        const targetSocketId = getSocketId(to);
        if (!targetSocketId) {
          queueSignal(to, "call:incoming", payload);
          socket.emit("call:pending", {
            to,
            reason: "offline",
            callLogId: startedMeta?.callLogId,
          });
          return;
        }
        io.to(targetSocketId).emit("call:incoming", payload);
        socket.emit("call:started", startedMeta || {});
      };

      try {
        const { findOrCreateDmChannel } = await import("../utils/callHelpers.js");
        const dmChannel = await findOrCreateDmChannel(workspaceId, callerId, to);
        socket.join(`channel:${dmChannel._id}`);

        const { log, dmChannel: dm, message } = await createRingingCall({
          callerId,
          calleeId: to,
          workspaceId,
          callType: callType || "audio",
          callerName: callerName || "Someone",
          contextChannelId,
          dmChannel,
        });

        scheduleRingTimeout(log, callerId, to);

        const startedMeta = {
          callLogId: log._id.toString(),
          channelId: dm._id.toString(),
          message: message || null,
        };

        emitIncomingToCallee(
          {
            from: String(callerId),
            callerName,
            callerAvatar,
            callerColor,
            callType: callType || "audio",
            channelId: dm._id.toString(),
            callLogId: log._id.toString(),
          },
          startedMeta
        );
      } catch (err) {
        console.error("call:initiate error (signaling fallback):", err);
        // Still ring the callee over socket if Mongo/call log fails
        emitIncomingToCallee(
          {
            from: String(callerId),
            callerName: callerName || "Someone",
            callerAvatar,
            callerColor,
            callType: callType || "audio",
          },
          {}
        );
      }
    });

    // NEW: call:ready — callee signals they are ready to receive the offer
    socket.on("call:ready", ({ to }) => {
      const targetSocketId = getSocketId(to);
      if (targetSocketId) io.to(targetSocketId).emit("call:ready");
    });

    socket.on("call:offer", ({ to, from, offer, callType }) => {
      const targetSocketId = getSocketId(to);
      const payload = { from, offer, callType };
      if (!targetSocketId) {
        queueSignal(to, "call:offer", payload);
        return;
      }
      io.to(targetSocketId).emit("call:offer", payload);
    });

    socket.on("call:answer", async ({ to, answer, callLogId }) => {
      if (callLogId) {
        clearRingTimeout(callLogId);
        try {
          await finalizeCallLog(callLogId, {
            status: "accepted",
            endedBy: socket.userId,
          });
        } catch (err) {
          console.error("call:answer log error:", err);
        }
      }

      const targetSocketId = getSocketId(to);
      const payload = { answer };
      if (!targetSocketId) {
        queueSignal(to, "call:answer", payload);
        return;
      }
      io.to(targetSocketId).emit("call:answer", payload);
    });

    socket.on("call:ice-candidate", ({ to, candidate }) => {
      const targetSocketId = getSocketId(to);
      const payload = { candidate };
      if (!targetSocketId) {
        queueSignal(to, "call:ice-candidate", payload);
        return;
      }
      io.to(targetSocketId).emit("call:ice-candidate", payload);
    });

    socket.on("call:reject", async ({ to, callLogId }) => {
      if (callLogId) {
        clearRingTimeout(callLogId);
        try {
          await finalizeCallLog(callLogId, {
            status: "declined",
            endedBy: socket.userId,
          });
        } catch (err) {
          console.error("call:reject log error:", err);
        }
      }

      const targetSocketId = getSocketId(to);
      if (targetSocketId) io.to(targetSocketId).emit("call:rejected", { callLogId });
    });

    socket.on("call:end", async ({ to, duration, callType, callLogId, reason }) => {
      if (callLogId) {
        clearRingTimeout(callLogId);
        try {
          const log = await CallLog.findById(callLogId);
          const clientSecs = Math.max(0, Math.floor(duration || 0));
          let status = "missed";
          let durationSeconds = 0;

          if (reason === "canceled" && log?.status === "ringing") {
            status = "canceled";
          } else if (
            log?.status === "accepted" ||
            (log?.startedAt && (reason === "ended" || clientSecs > 0))
          ) {
            status = "ended";
            durationSeconds = clientSecs;
          } else if (reason === "no-answer" || reason === "missed" || reason === "timeout") {
            status = "missed";
          } else if (clientSecs > 0 && log?.startedAt) {
            status = "ended";
            durationSeconds = clientSecs;
          }

          await finalizeCallLog(callLogId, {
            status,
            durationSeconds,
            endedBy: socket.userId,
          });
        } catch (err) {
          console.error("call:end log error:", err);
        }
      }

      const targetSocketId = getSocketId(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit("call:ended", { duration, callType, callLogId, reason });
      }
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────

    socket.on("disconnect", async () => {
      const userData = onlineUsers.get(socket.id);
      if (userData) {
        const { userId, workspaceId } = userData;
        onlineUsers.delete(socket.id);

        // Multi-tab: only set offline when last socket closes
        const newCount = (userSocketCountMap.get(userId) || 1) - 1;
        if (newCount <= 0) {
          userSocketCountMap.delete(userId);
          try {
            await User.findByIdAndUpdate(userId, { status: "offline", lastSeen: new Date() });
            getWorkspacePresenceMap(workspaceId).delete(String(userId));
            broadcastStatus(workspaceId, userId, "offline");
          } catch (err) {
            console.error("Error updating disconnect status:", err);
          }
        } else {
          userSocketCountMap.set(userId, newCount);
        }
      }

      removeUserSocket(socket.id);

      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.io initialized");
  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized — call initializeSocket first");
  return io;
};