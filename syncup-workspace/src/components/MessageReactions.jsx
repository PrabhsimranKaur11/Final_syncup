import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';

const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const MessageReactions = ({ reactions, onReaction }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactionClick = (emoji) => {
    onReaction(emoji);
    setShowPicker(false);
  };

  const existingReaction = reactions
    ? Object.entries(reactions)
        .map(([emoji, val]) => ({ emoji, count: typeof val === 'object' ? val.count : val, userReacted: typeof val === 'object' ? val.userReacted : false }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)[0]
    : null;

  return (
    <div className="relative inline-flex items-center gap-2 mt-2">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 border ${
          existingReaction ? 'bg-slate-100 dark:bg-[#31363F] border-slate-200 dark:border-[#76ABAE]/15 text-slate-700 dark:text-[#EEEEEE]' : 'bg-white/10 dark:bg-[#222831] border-slate-200 dark:border-[#76ABAE]/15 text-slate-400 dark:text-[#EEEEEE]/60'
        } hover:bg-slate-200 dark:hover:bg-[#31363F]`}
      >
        <span className="text-base leading-none">{existingReaction ? existingReaction.emoji : '😊'}</span>
        <span>{existingReaction ? existingReaction.count : ''}</span>
      </button>

      {showPicker && (
        <div ref={pickerRef} className="absolute bottom-full mb-2 left-0 bg-white dark:bg-[#31363F] rounded-xl shadow-2xl border border-slate-200 dark:border-[#76ABAE]/20 p-1.5 flex gap-0.5 z-30">
          {availableReactions.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleReactionClick(emoji)}
              className="w-8 h-8 text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-[#222831] transition-all hover:scale-125 flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
