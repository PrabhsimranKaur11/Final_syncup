import React, { useState, useRef, useEffect } from 'react';
import { X, Hash, Link, Copy, Check, UserPlus } from 'lucide-react';
import { gsap } from 'gsap';
import { useWorkspace } from '../context/WorkspaceContext';

const AddMemberModal = ({ isOpen, onClose, workspaceId }) => {
  const { createInvite } = useWorkspace();
  const [inviteData, setInviteData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  // Generate invite when modal opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      const data = createInvite(workspaceId);
      setInviteData(data);
    }
  }, [isOpen, workspaceId, createInvite]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current,
        { y: 100, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
      );
    }
  }, [isOpen]);

  const closeWithAnimation = () => {
    gsap.to(modalRef.current, {
      y: 60, opacity: 0, scale: 0.93, duration: 0.28, ease: 'power2.in',
      onComplete: onClose
    });
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.25 });
  };

  const handleCopyCode = () => {
    if (!inviteData) return;
    navigator.clipboard.writeText(inviteData.code);
    setCopiedCode(true);
    gsap.fromTo('.copy-code-btn', { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!inviteData) return;
    navigator.clipboard.writeText(inviteData.link);
    setCopiedLink(true);
    gsap.fromTo('.copy-link-modal-btn', { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50" style={{ opacity: 0 }}>
      <div ref={modalRef} className="bg-white/90 dark:bg-[#31363F]/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200/50 dark:border-[#76ABAE]/20 transition-colors duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-[#76ABAE]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-[#76ABAE] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20">
              <UserPlus className="w-5 h-5 text-white dark:text-[#222831]" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#EEEEEE]">
              Add <span className="text-blue-600 dark:text-[#76ABAE]">Members</span>
            </h3>
          </div>
          <button onClick={closeWithAnimation} className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222831]/60 flex items-center justify-center transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#76ABAE]/30">
            <X className="w-4 h-4 text-slate-500 dark:text-[#EEEEEE]/50" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Invite by Code */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Invite by Code</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 px-4 py-3 rounded-xl flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600 dark:text-[#76ABAE] flex-shrink-0" />
                <span className="text-sm font-mono font-bold tracking-widest text-blue-600 dark:text-[#76ABAE]">{inviteData?.code || '--------'}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className={`copy-code-btn px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-150 border ${copiedCode ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 border-slate-200 dark:border-[#76ABAE]/20 hover:bg-blue-600 dark:hover:bg-[#76ABAE] hover:text-white dark:hover:text-[#222831] hover:border-transparent'}`}
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 ml-1">Share this code so teammates can join directly</p>
          </div>

          {/* Invite by Link */}
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Invite by Link</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 px-4 py-3 rounded-xl flex items-center gap-2 overflow-hidden">
                <Link className="w-4 h-4 text-blue-600 dark:text-[#76ABAE] flex-shrink-0" />
                <span className="text-xs font-mono text-slate-500 dark:text-[#EEEEEE]/50 truncate">{inviteData?.link || 'https://syncup.io/join/...'}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className={`copy-link-modal-btn px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-150 border ${copiedLink ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 border-slate-200 dark:border-[#76ABAE]/20 hover:bg-blue-600 dark:hover:bg-[#76ABAE] hover:text-white dark:hover:text-[#222831] hover:border-transparent'}`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 ml-1">Share this link to invite teammates</p>
          </div>

          {/* Done button */}
          <button
            onClick={closeWithAnimation}
            className="w-full py-3 px-4 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 text-white dark:text-[#222831] rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMemberModal;
