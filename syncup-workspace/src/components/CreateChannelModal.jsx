import { useState } from 'react';
import { X, Hash, Lock, ChevronDown, ChevronUp } from 'lucide-react';

export default function CreateChannelModal({ isOpen, onClose, onCreateChannel, onJoinChannel, createdInviteCode }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [description, setDescription] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  if (createdInviteCode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="relative bg-[#1e2228] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
          <h2 className="text-white font-semibold text-lg mb-2">Private channel created</h2>
          <p className="text-gray-400 text-sm mb-4">Share this invite code with people you want to add:</p>
          <div className="bg-black/40 border border-yellow-500/30 rounded-xl px-4 py-3 text-center">
            <span className="text-2xl font-mono font-bold text-yellow-400 tracking-widest">{createdInviteCode}</span>
          </div>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(createdInviteCode); }}
            className="mt-3 w-full py-2 text-sm text-blue-400 hover:text-blue-300"
          >
            Copy code
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsPrivate(false);
    setShowAdvanced(false);
    setInviteCode('');
    setError('');
    setActiveTab('create');
    setLoading(false);
    onClose();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed) return setError('Channel name is required');
    if (trimmed.length < 2) return setError('Name must be at least 2 characters');
    if (trimmed.length > 32) return setError('Name must be 32 characters or less');

    setLoading(true);
    try {
      const result = await onCreateChannel(trimmed, isPrivate, description.trim());
      if (!result?.isPrivate || !result?.inviteCode) {
        handleClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');

    const code = inviteCode.trim();
    if (!code) return setError('Invite code is required');

    setLoading(true);
    try {
      await onJoinChannel(code);
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to join channel');
    } finally {
      setLoading(false);
    }
  };

  // Sanitise: only allow lowercase letters, numbers, hyphens, underscores
  const handleNameChange = (val) => {
    setName(val.toLowerCase().replace(/[^a-z0-9-_]/g, ''));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[#1e2228] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {activeTab === 'create' ? 'Create Channel' : 'Join Channel'}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {activeTab === 'create'
                ? 'Channels are where conversations happen.'
                : 'Enter an invite code to join a private channel.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            type="button"
            onClick={() => { setActiveTab('create'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('join'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'join'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* ─── CREATE TAB ─── */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreate} className="px-6 py-5 space-y-5">
            {/* Channel Type Toggle */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Channel Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Public */}
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    !isPrivate
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <Hash size={18} className="mt-0.5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium leading-tight">Public</p>
                    <p className="text-xs opacity-60 mt-0.5 leading-tight">
                      Anyone in the workspace can join
                    </p>
                  </div>
                </button>

                {/* Private */}
                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    isPrivate
                      ? 'border-yellow-500 bg-yellow-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                  }`}
                >
                  <Lock size={18} className="mt-0.5 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium leading-tight">Private</p>
                    <p className="text-xs opacity-60 mt-0.5 leading-tight">
                      Only invited members can see it
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Channel Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Channel Name
              </label>
              <div className="flex items-center bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 gap-2 focus-within:border-blue-500/60 transition-colors">
                {isPrivate ? (
                  <Lock size={15} className="text-yellow-400 shrink-0" />
                ) : (
                  <Hash size={15} className="text-gray-500 shrink-0" />
                )}
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. design-feedback"
                  maxLength={32}
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-600 outline-none"
                  autoFocus
                />
                <span className="text-xs text-gray-600">{name.length}/32</span>
              </div>
            </div>

            {/* Advanced (Description) */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAdvanced ? 'Hide' : 'Add'} description (optional)
              </button>
              {showAdvanced && (
                <div className="mt-2.5">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this channel about?"
                    rows={2}
                    maxLength={200}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-blue-500/60 resize-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Preview */}
            <div className="bg-black/20 border border-white/5 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Preview</p>
              <div className="flex items-center gap-2">
                {isPrivate ? (
                  <Lock size={14} className="text-yellow-400" />
                ) : (
                  <Hash size={14} className="text-gray-400" />
                )}
                <span className="text-white text-sm font-medium">
                  {name || 'channel-name'}
                </span>
                {isPrivate && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                    Private
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? 'Creating…' : 'Create Channel'}
              </button>
            </div>
          </form>
        )}

        {/* ─── JOIN TAB ─── */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoin} className="px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Invite Code
              </label>
              <div className="flex items-center bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 gap-2 focus-within:border-blue-500/60 transition-colors">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste the invite code here"
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-600 outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-300 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {loading ? 'Joining…' : 'Join Channel'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}