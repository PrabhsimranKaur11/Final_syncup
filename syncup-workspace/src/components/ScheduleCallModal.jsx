import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

export default function ScheduleCallModal({
  isOpen,
  onClose,
  onSchedule,
  chatName = 'this chat',
}) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const minDatetime = () => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Enter a title for the call');
      return;
    }
    if (!scheduledAt) {
      setError('Pick a date and time');
      return;
    }
    setLoading(true);
    try {
      await onSchedule({ title: title.trim(), scheduledAt: new Date(scheduledAt).toISOString() });
      setTitle('');
      setScheduledAt('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to schedule call');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#31363F] rounded-2xl shadow-2xl w-full max-w-md mx-4 border border-slate-200 dark:border-[#76ABAE]/20 transition-colors duration-150">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#76ABAE]/20">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-[#76ABAE]" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE]">Schedule work call</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#222831] transition-colors duration-150">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-[#EEEEEE]/50">
            Participants in {chatName} will see a system message in the chat.
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-[#EEEEEE]/50 uppercase mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sprint planning, design review…"
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#222831] border border-slate-200 dark:border-[#76ABAE]/20 text-slate-900 dark:text-[#EEEEEE] outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-[#EEEEEE]/50 uppercase mb-1">Date & time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDatetime()}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#222831] border border-slate-200 dark:border-[#76ABAE]/20 text-slate-900 dark:text-[#EEEEEE] outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#76ABAE]/20 text-slate-700 dark:text-[#EEEEEE] hover:bg-slate-50 dark:hover:bg-[#222831] transition-colors duration-150">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 dark:bg-[#76ABAE] text-white dark:text-[#222831] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity duration-150"
            >
              {loading ? 'Scheduling…' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
