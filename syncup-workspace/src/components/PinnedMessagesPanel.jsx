// syncup-workspace/src/components/PinnedMessagesPanel.jsx
// NEW FILE — Drop into src/components/

import { useEffect, useState, useRef } from 'react';
import { X, Pin, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import channelAPI from '../services/api'; // adjust import path as needed

export default function PinnedMessagesPanel({
  channelId,
  isOpen,
  onClose,
  onJumpToMessage, // (messageId) => void — scroll chat to that message
  currentUser,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 5;

  useEffect(() => {
    if (!isOpen || !channelId) return;
    const fetchPinned = async () => {
      setLoading(true);
      try {
        const { data } = await channelAPI.getPinnedMessages(channelId);
        setMessages(data.messages || []);
        setPage(0);
      } catch (err) {
        console.error('fetchPinned error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPinned();
  }, [isOpen, channelId]);

  const handleUnpin = async (messageId) => {
    try {
      await channelAPI.unpinMessage(channelId, messageId);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error('unpin error:', err);
    }
  };

  const paginated = messages.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(messages.length / perPage);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-[#1a1f25] border-l border-white/10 w-72 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Pin size={15} className="text-yellow-400" />
          <span className="text-white font-semibold text-sm">Pinned Messages</span>
          {messages.length > 0 && (
            <span className="text-xs bg-white/10 text-gray-400 px-1.5 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
              <Pin size={20} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm font-medium">No pinned messages</p>
            <p className="text-gray-600 text-xs mt-1">
              Hover a message and click{' '}
              <span className="text-gray-500">Pin</span> to pin it here.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {paginated.map((msg, idx) => (
              <PinnedMessageCard
                key={msg._id}
                msg={msg}
                index={page * perPage + idx + 1}
                total={messages.length}
                onJump={() => onJumpToMessage?.(msg._id)}
                onUnpin={() => handleUnpin(msg._id)}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-gray-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function PinnedMessageCard({ msg, index, total, onJump, onUnpin, currentUser }) {
  const sender = msg.senderId;
  const [showUnpin, setShowUnpin] = useState(false);

  const truncated =
    msg.content?.length > 120
      ? msg.content.slice(0, 120) + '…'
      : msg.content;

  const pinnedAgo = msg.pinnedAt
    ? formatTimeAgo(new Date(msg.pinnedAt))
    : '';

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl p-3 group hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all"
      onMouseEnter={() => setShowUnpin(true)}
      onMouseLeave={() => setShowUnpin(false)}
    >
      {/* Top row: index + unpin */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Pin size={11} className="text-yellow-500" />
          <span className="text-xs text-yellow-500/80 font-medium">
            Pinned message {index} of {total}
          </span>
        </div>
        {showUnpin && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnpin(); }}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <X size={11} />
            Unpin
          </button>
        )}
      </div>

      {/* Sender info */}
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
            sender?.color || 'bg-gradient-to-br from-blue-500 to-purple-600'
          }`}
        >
          {sender?.avatar ? (
            <img src={sender.avatar} className="w-full h-full rounded-full object-cover" alt="" />
          ) : (
            (sender?.name || '?')[0].toUpperCase()
          )}
        </div>
        <span className="text-xs font-medium text-gray-300 truncate">
          {sender?.name || 'Unknown'}
        </span>
        {msg.createdAt && (
          <span className="text-[10px] text-gray-600 ml-auto shrink-0">
            {formatDate(new Date(msg.createdAt))}
          </span>
        )}
      </div>

      {/* Content */}
      <p
        className={`text-sm text-gray-300 leading-relaxed ${
          msg.isDeleted ? 'italic text-gray-500' : ''
        }`}
      >
        {msg.isDeleted ? 'This message was deleted' : truncated}
      </p>

      {/* Jump button */}
      <button
        onClick={onJump}
        className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors hover:underline"
      >
        Jump to message →
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}