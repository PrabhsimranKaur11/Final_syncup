import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Hash, Zap, ArrowRight, Building2, X, Link, Mail, Copy, Check, LogIn, AtSign, ChevronDown, LogOut, User, Trash2, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useWorkspace } from '../context/WorkspaceContext';

const generateInviteLink = (id) => `https://syncup.io/join/${id}`;

// ── Glass Filter SVG (required for liquid glass effect) ─────────────
function GlassFilter() {
  return (
    <svg style={{ display: "none" }}>
      <defs>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence" />
          <feComponentTransfer in="turbulence" result="mapped"><feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" /><feFuncG type="gamma" amplitude="0" exponent="1" offset="0" /><feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" /></feComponentTransfer>
          <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />
          <feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight"><fePointLight x="-200" y="-200" z="300" /></feSpecularLighting>
          <feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage" />
          <feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

// ── Logo Component ──────────────────────────────────────────────────
function Logo({ size = 28, id = "logo" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#76ABAE" /><stop offset="100%" stopColor="#9ECDD0" /></linearGradient></defs>
      <ellipse cx="38" cy="42" rx="24" ry="11" transform="rotate(-35 38 42)" fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" opacity=".95" />
      <ellipse cx="62" cy="58" rx="24" ry="11" transform="rotate(-35 62 58)" fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" opacity=".8" />
      <ellipse cx="50" cy="50" rx="18" ry="8" transform="rotate(55 50 50)" fill="none" stroke={`url(#${id})`} strokeWidth="6.5" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

// ── CSS for liquid glass navbar ─────────────────────────────────────
const WORKSPACE_NAVBAR_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

:root {
  --bg: #F0F2F5;
  --surface: #FFFFFF;
  --card: rgba(255,255,255,0.90);
  --card-h: rgba(255,255,255,0.97);
  --border: rgba(118,171,174,0.18);
  --border-l: rgba(118,171,174,0.40);
  --accent: #76ABAE;
  --accent2: #9ECDD0;
  --glow: rgba(118,171,174,0.28);
  --t1: #1A2025;
  --t2: rgba(26,32,37,0.60);
  --t3: rgba(26,32,37,0.35);
  --fd: 'Instrument Serif', Georgia, serif;
  --fb: 'Syne', sans-serif;
  --r: 18px;
  --shadow-card: 0 2px 16px rgba(118,171,174,0.10), 0 1px 4px rgba(0,0,0,0.06);
}

.dark {
  --bg: #222831;
  --surface: #31363F;
  --card: rgba(49,54,63,0.85);
  --card-h: rgba(49,54,63,0.95);
  --border: rgba(118,171,174,0.20);
  --border-l: rgba(118,171,174,0.38);
  --accent: #76ABAE;
  --accent2: #9ECDD0;
  --glow: rgba(118,171,174,0.28);
  --t1: #EEEEEE;
  --t2: rgba(238,238,238,0.60);
  --t3: rgba(238,238,238,0.32);
  --shadow-card: 0 2px 24px rgba(0,0,0,0.35);
}

.ws-lg-navbar {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  animation: wsNavSlideIn 0.6s cubic-bezier(.22,1,.36,1) forwards;
}
@keyframes wsNavSlideIn {
  from { transform: translateX(-50%) translateY(-30px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

.ws-glass-wrapper {
  position: relative;
  display: flex;
  font-family: var(--fb);
  font-weight: 600;
  cursor: pointer;
  transition: all 700ms cubic-bezier(0.175, 0.885, 0.32, 2.2);
  box-shadow: 0 6px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(118,171,174,0.14);
  border-radius: 9999px;
  padding: 8px 16px 8px 12px;
  min-width: 460px;
  align-items: center;
}
.ws-glass-wrapper:hover {
  padding: 10px 18px 10px 14px;
}

.ws-glass-blur { position: absolute; inset: 0; z-index: 0; overflow: hidden; border-radius: inherit; backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); filter: url(#glass-distortion); isolation: isolate; pointer-events: none; }
.ws-glass-white { position: absolute; inset: 0; z-index: 1; border-radius: inherit; background: rgba(255,255,255,0.72); pointer-events: none; }
.dark .ws-glass-white { background: rgba(49,54,63,0.78); }
.ws-glass-shine { position: absolute; inset: 0; z-index: 2; overflow: hidden; border-radius: inherit; box-shadow: inset 2px 2px 1px 0 rgba(255,255,255,0.55), inset -1px -1px 1px 1px rgba(255,255,255,0.18); pointer-events: none; }
.ws-glass-content { position: relative; z-index: 3; }

.ws-nav-link {
  font-size: 13px;
  font-weight: 500;
  color: var(--t2);
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: color .2s;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font-family: var(--fb);
}
.ws-nav-link:hover { color: var(--accent); }

.ws-profile-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 220px;
  background: var(--card-h);
  border: 1px solid var(--border-l);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(118,171,174,0.10);
  overflow: hidden;
  z-index: 10001;
  animation: dropIn 0.25s cubic-bezier(.22,1,.36,1);
}
@keyframes dropIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
`;

const WorkspaceSelectionPage = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useTheme();
  const { workspaces, loading, fetchWorkspaces, createWorkspace, joinWorkspace, deleteWorkspace } = useWorkspace();

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: '', icon: '🏢' });
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const [inviteEmails, setInviteEmails] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [joinValue, setJoinValue] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Deletion Modal states
  const [workspaceToDelete, setWorkspaceToDelete] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const mainRef = useRef(null);
  const createModalRef = useRef(null);
  const joinModalRef = useRef(null);
  const stepRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const gridRef = useRef(null);

  const overlayRef = useRef(null);
  const profileDropdownRef = useRef(null);

  // workspaces are fetched from context

  // Build user avatar details
  const userInitials = (currentUser?.displayName || currentUser?.fullName || 'U').substring(0, 2).toUpperCase();
  const hasAvatarImg = typeof currentUser?.avatar === 'string' && (/^(https?:)?\/\//i.test(currentUser.avatar) || currentUser.avatar.startsWith('/'));
  const userName = currentUser?.displayName || currentUser?.fullName || 'User';
  const userEmail = currentUser?.email || 'user@email.com';

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "ws-navbar-styles";
    el.textContent = WORKSPACE_NAVBAR_CSS;
    if (!document.getElementById("ws-navbar-styles")) document.head.appendChild(el);
    return () => document.getElementById("ws-navbar-styles")?.remove();
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Animations ─────────────────────────────────────────────────────
  useEffect(() => {
    gsap.set(titleRef.current, { opacity: 0, y: 50, skewY: 3 });
    gsap.set(subtitleRef.current, { opacity: 0, y: 25 });
    gsap.set('.workspace-card', { opacity: 0, y: 60, rotateX: 10, scale: 0.94 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.2 });

    tl.to(titleRef.current, { opacity: 1, y: 0, skewY: 0, duration: 1.1 })
      .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.9 }, '-=0.7')
      .to('.workspace-card',
        { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.85, stagger: { amount: 0.75, from: 'start' } },
        '-=0.5'
      );


  }, []);

  useEffect(() => {
    const cards = document.querySelectorAll('.workspace-card');
    cards.forEach((card) => {
      const enter = () => {
        gsap.to(card, { scale: 1.03, duration: 0.3, ease: 'power2.out' });
        gsap.to(card.querySelector('.card-icon'), { rotate: 8, scale: 1.15, duration: 0.3, ease: 'back.out(2)' });
        gsap.to(card.querySelector('.card-arrow'), { x: 5, duration: 0.25, ease: 'power2.out' });
      };
      const leave = () => {
        gsap.to(card, { scale: 1, duration: 0.3, ease: 'power2.out' });
        gsap.to(card.querySelector('.card-icon'), { rotate: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
        gsap.to(card.querySelector('.card-arrow'), { x: 0, duration: 0.25, ease: 'power2.out' });
      };
      card.addEventListener('mouseenter', enter);
      card.addEventListener('mouseleave', leave);
    });
  }, []);

  useEffect(() => {
    if (showCreateModal && createModalRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(createModalRef.current,
        { y: 100, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
      );
    }
  }, [showCreateModal]);

  useEffect(() => {
    if (showJoinModal && joinModalRef.current) {
      gsap.fromTo(joinModalRef.current,
        { y: 100, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.4)' }
      );
    }
  }, [showJoinModal]);

  useEffect(() => {
    if (createdWorkspace && stepRef.current) {
      gsap.fromTo(stepRef.current,
        { opacity: 0, y: 30, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power3.out' }
      );
      gsap.fromTo('.success-badge',
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)', delay: 0.15 }
      );
    }
  }, [createdWorkspace]);

  const closeWithAnimation = (ref, cb) => {
    gsap.to(ref.current, {
      y: 60, opacity: 0, scale: 0.93, duration: 0.28, ease: 'power2.in',
      onComplete: cb
    });
    if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 0, duration: 0.25 });
  };

  const addRipple = (e) => {
    const btn = e.currentTarget;
    const ripple = document.createElement('span');
    ripple.className = 'absolute rounded-full bg-white/20 pointer-events-none';
    const size = Math.max(btn.offsetWidth, btn.offsetHeight) * 1.5;
    const rect = btn.getBoundingClientRect();
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    gsap.fromTo(ripple, { scale: 0, opacity: 1 }, { scale: 1, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => ripple.remove() });
  };

  // ── Handlers ────────────────────────────────────────────────────
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    gsap.to(e.submitter || e.target, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1 });
    
    try {
      const created = await createWorkspace({
        name: newWorkspace.name,
        icon: newWorkspace.icon,
        description: 'New workspace'
      });
      // Use the returned inviteCode
      const inviteLink = `https://syncup.io/join/${created.inviteCode}`;
      setCreatedWorkspace({ ...created, inviteId: created.inviteCode, inviteLink });
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinishCreate = () => {
    closeWithAnimation(createModalRef, () => {
      setShowCreateModal(false);
      setCreatedWorkspace(null);
      setNewWorkspace({ name: '', icon: '🏢' });
      setInviteEmails('');
      setCopiedLink(false);
      setCopiedId(false);
    });
  };

  const handleCloseCreate = () => {
    closeWithAnimation(createModalRef, () => {
      setShowCreateModal(false);
      setCreatedWorkspace(null);
      setNewWorkspace({ name: '', icon: '🏢' });
      setInviteEmails('');
      setCopiedLink(false);
      setCopiedId(false);
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(createdWorkspace.inviteLink);
    setCopiedLink(true);
    gsap.fromTo('.copy-link-btn', { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(createdWorkspace.inviteId);
    setCopiedId(true);
    gsap.fromTo('.copy-id-btn', { scale: 1 }, { scale: 1.12, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    let val = joinValue.trim();
    if (!val) {
      setJoinError('Please enter a workspace ID or invite link.');
      gsap.fromTo('.join-input', { x: 0 }, { x: 8, duration: 0.07, repeat: 5, yoyo: true, ease: 'power2.inOut' });
      return;
    }
    
    // Extract code if it's a URL
    if (val.startsWith('http')) {
      const parts = val.split('/');
      val = parts[parts.length - 1];
    }

    try {
      const joined = await joinWorkspace(val.toUpperCase());
      closeWithAnimation(joinModalRef, () => {
        setShowJoinModal(false);
        setJoinValue('');
        setJoinError('');
        navigate(`/dashboard/${joined._id}`);
      });
    } catch (err) {
      setJoinError(err.message || 'Failed to join workspace.');
      gsap.fromTo('.join-input', { x: 0 }, { x: 8, duration: 0.07, repeat: 5, yoyo: true, ease: 'power2.inOut' });
    }
  };

  const handleCloseJoin = () => {
    closeWithAnimation(joinModalRef, () => {
      setShowJoinModal(false);
      setJoinValue('');
      setJoinError('');
    });
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };



  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#222831] text-slate-900 dark:text-[#EEEEEE] transition-colors duration-150 font-sans overflow-hidden">
      <GlassFilter />

      {/* ── Liquid Glass Navbar ─────────────────────────────────────── */}
      <div className="ws-lg-navbar">
        <div className="ws-glass-wrapper">
          <div className="ws-glass-blur" /><div className="ws-glass-white" /><div className="ws-glass-shine" />
          <div className="ws-glass-content" style={{ display: "flex", alignItems: "center", width: "100%" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 28, flexShrink: 0 }}>
              <Logo size={26} id="ws-nav-logo" />
              <span style={{ fontFamily: "var(--fd)", fontSize: 19, color: "var(--t1)" }}>SyncUp</span>
            </div>

            {/* Nav Links */}
            <div style={{ display: "flex", gap: 24, flex: 1 }}>
              <button className="ws-nav-link" onClick={() => navigate('/')}>Home</button>
              <button className="ws-nav-link" onClick={() => navigate('/workspaces')} style={{ color: 'var(--accent)' }}>Workspaces</button>
            </div>

            {/* Profile Section */}
            <div style={{ display: "flex", alignItems: "center", marginLeft: 8, flexShrink: 0, position: 'relative' }} ref={profileDropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 12,
                  transition: 'background 0.2s',
                }}
                className="hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg overflow-hidden">
                  {hasAvatarImg ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    userInitials
                  )}
                </div>
                <ChevronDown style={{ width: 14, height: 14, color: 'var(--t2)', transition: 'transform 0.2s', transform: showProfileDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>

              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div 
                  className="ws-profile-dropdown animate-in fade-in slide-in-from-top-2 duration-200" 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: '260px',
                    background: 'var(--card)', // glassmorphism translucent background
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: '16px',
                    boxShadow: 'var(--shadow-card)',
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    zIndex: 100
                  }}
                >
                  {/* User Info */}
                  <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden">
                        {hasAvatarImg ? (
                          <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          userInitials
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--fb)', fontWeight: 600, fontSize: 14, color: 'var(--t1)' }}>{userName}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)' }}>{userEmail}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '6px' }}>
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        border: 'none',
                        background: 'transparent',
                        borderRadius: 10,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        fontFamily: 'var(--fb)',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-500/10 active:scale-[0.98]"
                    >
                      <LogOut style={{ width: 16, height: 16 }} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative min-h-screen flex flex-col z-10">
        {/* ── Main ────────────────────────────────────────────────── */}
        <main ref={mainRef} className="flex-1 flex items-center justify-center px-6 py-12" style={{ paddingTop: '100px' }}>
          <div className="w-full max-w-6xl">

            {/* Title */}
            <div className="text-center mb-12">
              <h1 ref={titleRef} className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-[#EEEEEE] mb-4">
                Choose your <span className="text-blue-600 dark:text-[#76ABAE]">workspace</span>
              </h1>
              <p ref={subtitleRef} className="text-lg text-slate-500 dark:text-[#EEEEEE]/70">
                Select a workspace to continue or create a new one
              </p>
            </div>

            {/* Workspace Grid */}
            <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {loading ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-500">Loading workspaces...</p>
                </div>
              ) : workspaces.map((workspace) => (
                <div
                  key={workspace._id}
                  onClick={() => navigate(`/dashboard/${workspace._id}`)}
                  className="workspace-card group bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-[1.5rem] p-6 border border-slate-200/50 dark:border-[#76ABAE]/20 hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-[#76ABAE]/10 transition-shadow duration-150 text-left cursor-pointer relative animate-fade-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`card-icon w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg`}>
                      {workspace.icon || '🏢'}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#EEEEEE]/50 font-medium">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        Active
                      </div>
                      {(workspace.owner?._id === currentUser?._id || workspace.owner === currentUser?._id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkspaceToDelete(workspace);
                            setDeleteConfirmName('');
                            setDeleteError('');
                          }}
                          title="Delete Workspace"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-3 group-hover:text-blue-600 dark:group-hover:text-[#76ABAE] transition-colors duration-150">
                    {workspace.name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-[#EEEEEE]/50 mb-3">
                    <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /><span>{workspace.members?.length || 0} members</span></div>
                    <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /><span>{workspace.channels?.length || 0} channels</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-[#76ABAE]/20 flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-600 dark:text-[#76ABAE]">Open workspace</span>
                    <ArrowRight className="card-arrow w-4 h-4 text-blue-600 dark:text-[#76ABAE]" />
                  </div>
                </div>
              ))}

              {/* Create Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="workspace-card group bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-[1.5rem] p-6 border-2 border-dashed border-slate-300 dark:border-[#76ABAE]/30 hover:border-blue-500 dark:hover:border-[#76ABAE] hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-[#76ABAE]/10 transition-all duration-150"
              >
                <div className="flex flex-col items-center justify-center h-full min-h-[220px]">
                  <div className="card-icon w-14 h-14 bg-blue-600 dark:bg-[#76ABAE] rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20">
                    <Plus className="w-7 h-7 text-white dark:text-[#222831]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-2">Create Workspace</h3>
                  <p className="text-sm text-slate-500 dark:text-[#EEEEEE]/50 text-center">Start a new workspace for your team</p>
                  <div className="card-arrow opacity-0 group-hover:opacity-100 mt-4 flex items-center gap-1 text-blue-600 dark:text-[#76ABAE] text-sm font-bold transition-opacity duration-200">Get started <ArrowRight className="w-3.5 h-3.5" /></div>
                </div>
              </button>

              {/* Join Card */}
              <button
                onClick={() => setShowJoinModal(true)}
                className="workspace-card group bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-[1.5rem] p-6 border-2 border-dashed border-slate-300 dark:border-[#76ABAE]/30 hover:border-blue-500 dark:hover:border-[#76ABAE] hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-[#76ABAE]/10 transition-all duration-150"
              >
                <div className="flex flex-col items-center justify-center h-full min-h-[220px]">
                  <div className="card-icon w-14 h-14 bg-slate-600 dark:bg-[#31363F] border-2 border-slate-300 dark:border-[#76ABAE]/40 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-600 dark:group-hover:bg-[#76ABAE] transition-colors duration-150 shadow-lg">
                    <LogIn className="w-7 h-7 text-white dark:text-[#EEEEEE] dark:group-hover:text-[#222831]" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-[#EEEEEE] mb-2">Join Workspace</h3>
                  <p className="text-sm text-slate-500 dark:text-[#EEEEEE]/50 text-center">Join using an invite link or workspace ID</p>
                  <div className="card-arrow opacity-0 group-hover:opacity-100 mt-4 flex items-center gap-1 text-blue-600 dark:text-[#76ABAE] text-sm font-bold transition-opacity duration-200">Enter code <ArrowRight className="w-3.5 h-3.5" /></div>
                </div>
              </button>
            </div>



          </div>
        </main>
      </div>

      {/* ── Create Workspace Modal ───────────────────────────────── */}
      {showCreateModal && (
        <div ref={overlayRef} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50" style={{ opacity: 0 }}>
          <div ref={createModalRef} className="bg-white/90 dark:bg-[#31363F]/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200/50 dark:border-[#76ABAE]/20 transition-colors duration-500 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200/50 dark:border-[#76ABAE]/20 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#EEEEEE]">
                {createdWorkspace
                  ? <><span className="text-blue-600 dark:text-[#76ABAE]">Invite</span> your team</>
                  : <>Create a <span className="text-blue-600 dark:text-[#76ABAE]">workspace</span></>}
              </h3>
              <button onClick={handleCloseCreate} className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222831]/60 flex items-center justify-center transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#76ABAE]/30">
                <X className="w-4 h-4 text-slate-500 dark:text-[#EEEEEE]/50" />
              </button>
            </div>

            {/* Step 1 */}
            {!createdWorkspace && (
              <form ref={stepRef} onSubmit={handleCreateWorkspace} className="p-6 space-y-5 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Workspace Name</label>
                  <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-[#EEEEEE]/50 group-focus-within:text-blue-500 dark:group-focus-within:text-[#76ABAE] transition-colors z-10" />
                    <input
                      type="text"
                      value={newWorkspace.name}
                      onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 px-12 py-3 rounded-xl outline-none text-slate-900 dark:text-[#EEEEEE] focus:border-blue-500 dark:focus:border-[#76ABAE] focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-[#76ABAE]/20 placeholder:text-slate-400 dark:placeholder:text-[#EEEEEE]/40 font-medium transition-all shadow-sm"
                      placeholder="e.g., Marketing Team"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 ml-1">This will be the name of your workspace</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Choose an Icon</label>
                  <div className="grid grid-cols-6 gap-2">
                    {['🏢', '🚀', '💼', '🎨', '⚙️', '🔬', '📚', '🎯', '💡', '🌟', '🔥', '⚡'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          setNewWorkspace({ ...newWorkspace, icon: emoji });
                          gsap.fromTo(e.currentTarget, { scale: 0.8 }, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
                        }}
                        className={`w-full aspect-square rounded-xl flex items-center justify-center text-xl transition-all duration-200 border ${
                          newWorkspace.icon === emoji
                            ? 'bg-blue-600 dark:bg-[#76ABAE] border-blue-600 dark:border-[#76ABAE] shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20'
                            : 'bg-slate-50 dark:bg-[#222831]/80 border-slate-200 dark:border-[#76ABAE]/20 hover:border-blue-400 dark:hover:border-[#76ABAE]/50 hover:scale-110'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-slate-50 dark:bg-[#222831]/80 rounded-xl p-4 border border-slate-200 dark:border-[#76ABAE]/20">
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/50 mb-3">Preview</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-600 dark:bg-[#76ABAE] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20 dark:shadow-[#76ABAE]/10">
                      {newWorkspace.icon}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-[#EEEEEE]">{newWorkspace.name || 'Your Workspace'}</div>
                      <div className="text-xs text-slate-500 dark:text-[#EEEEEE]/50">0 members • 0 channels</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={handleCloseCreate} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 rounded-xl border border-slate-200 dark:border-[#76ABAE]/20 hover:bg-slate-200 dark:hover:bg-[#222831] font-bold tracking-wide transition-all duration-150">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    onClick={addRipple}
                    className="flex-1 py-3 px-4 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 text-white dark:text-[#222831] rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    Create & Invite
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>
              </form>
            )}

            {/* Step 2 — Invite */}
            {createdWorkspace && (
              <div ref={stepRef} className="p-6 space-y-5 overflow-y-auto">
                <div className="success-badge bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-green-700 dark:text-green-400 text-sm">Workspace created!</div>
                    <div className="text-xs text-green-600 dark:text-green-500">{createdWorkspace.icon} {createdWorkspace.name}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Invite by Code</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 px-4 py-3 rounded-xl flex items-center gap-2">
                      <Hash className="w-4 h-4 text-blue-600 dark:text-[#76ABAE] flex-shrink-0" />
                      <span className="text-sm font-mono font-bold tracking-widest text-blue-600 dark:text-[#76ABAE]">{createdWorkspace.inviteId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className={`copy-id-btn px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-150 border ${copiedId ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 border-slate-200 dark:border-[#76ABAE]/20 hover:bg-blue-600 dark:hover:bg-[#76ABAE] hover:text-white dark:hover:text-[#222831] hover:border-transparent'}`}
                    >
                      {copiedId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedId ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 ml-1">Share this 8-character code so teammates can join directly</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Invite Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 px-4 py-3 rounded-xl text-sm text-slate-500 dark:text-[#EEEEEE]/50 font-mono truncate">
                      {createdWorkspace.inviteLink}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`copy-link-btn px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-150 border ${copiedLink ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 border-slate-200 dark:border-[#76ABAE]/20 hover:bg-blue-600 dark:hover:bg-[#76ABAE] hover:text-white dark:hover:text-[#222831] hover:border-transparent'}`}
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={handleFinishCreate} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 rounded-xl border border-slate-200 dark:border-[#76ABAE]/20 hover:bg-slate-200 dark:hover:bg-[#222831] font-bold tracking-wide transition-all duration-150">
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { addRipple(e); handleFinishCreate(); }}
                    className="flex-1 py-3 px-4 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 text-white dark:text-[#222831] rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center justify-center gap-2 group relative overflow-hidden"
                  >
                    {inviteEmails ? 'Send Invites' : 'Go to Workspace'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Join Workspace Modal ─────────────────────────────────── */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div ref={joinModalRef} className="bg-white/90 dark:bg-[#31363F]/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200/50 dark:border-[#76ABAE]/20 transition-colors duration-500">
            <div className="p-6 border-b border-slate-200/50 dark:border-[#76ABAE]/20 flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#EEEEEE]">
                Join a <span className="text-blue-600 dark:text-[#76ABAE]">workspace</span>
              </h3>
              <button onClick={handleCloseJoin} className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222831]/60 flex items-center justify-center transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#76ABAE]/30">
                <X className="w-4 h-4 text-slate-500 dark:text-[#EEEEEE]/50" />
              </button>
            </div>

            <form onSubmit={handleJoinWorkspace} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-[#222831]/80 rounded-xl p-3 border border-slate-200 dark:border-[#76ABAE]/20 text-center">
                  <Link className="w-5 h-5 text-blue-600 dark:text-[#76ABAE] mx-auto mb-1.5" />
                  <div className="text-xs font-bold text-slate-700 dark:text-[#EEEEEE]">Invite Link</div>
                  <div className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 mt-0.5">syncup.io/join/…</div>
                </div>
                <div className="bg-slate-50 dark:bg-[#222831]/80 rounded-xl p-3 border border-slate-200 dark:border-[#76ABAE]/20 text-center">
                  <Hash className="w-5 h-5 text-blue-600 dark:text-[#76ABAE] mx-auto mb-1.5" />
                  <div className="text-xs font-bold text-slate-700 dark:text-[#EEEEEE]">Workspace ID</div>
                  <div className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 mt-0.5">e.g. AB12CD34</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Invite Link or Workspace ID</label>
                <div className="relative group">
                  <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-[#EEEEEE]/50 group-focus-within:text-blue-500 dark:group-focus-within:text-[#76ABAE] transition-colors z-10" />
                  <input
                    type="text"
                    value={joinValue}
                    onChange={(e) => { setJoinValue(e.target.value); setJoinError(''); }}
                    className="join-input w-full bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 px-12 py-3 rounded-xl outline-none text-slate-900 dark:text-[#EEEEEE] focus:border-blue-500 dark:focus:border-[#76ABAE] focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-[#76ABAE]/20 placeholder:text-slate-400 dark:placeholder:text-[#EEEEEE]/40 font-medium transition-all shadow-sm"
                    placeholder="https://syncup.io/join/AB12CD34  or  AB12CD34"
                  />
                </div>
                {joinError && <p className="text-xs text-red-500 dark:text-red-400 ml-1 font-medium">{joinError}</p>}
                <p className="text-xs text-slate-400 dark:text-[#EEEEEE]/40 ml-1">Paste the invite link or enter the 8-character workspace ID</p>
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleCloseJoin} className="flex-1 px-4 py-3 bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 rounded-xl border border-slate-200 dark:border-[#76ABAE]/20 hover:bg-slate-200 dark:hover:bg-[#222831] font-bold tracking-wide transition-all duration-150">
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={addRipple}
                  className="flex-1 py-3 px-4 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 text-white dark:text-[#222831] rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 dark:shadow-[#76ABAE]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                  Join Workspace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Workspace Confirmation Modal ────────────────────── */}
      {workspaceToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white/95 dark:bg-[#31363F]/95 backdrop-blur-xl rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 space-y-6">
            
            {/* Header */}
            <div className="flex items-center gap-3 text-red-500 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Delete Workspace?</h3>
            </div>

            {/* Warning Text */}
            <div className="text-sm text-slate-600 dark:text-[#EEEEEE]/70 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{workspaceToDelete.name}"</span>? 
                This action is permanent and cannot be undone.
              </p>
              <p className="bg-red-500/5 border border-red-500/15 rounded-xl p-3 text-xs text-red-600 dark:text-red-400">
                All channels, direct messages, files, and members associated with this workspace will be deleted forever.
              </p>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70">
                Type the workspace name to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={workspaceToDelete.name}
                className="w-full bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-red-500/20 focus:border-red-500 dark:focus:border-red-500 px-4 py-3 rounded-xl outline-none text-slate-900 dark:text-[#EEEEEE] focus:ring-4 focus:ring-red-500/10 placeholder:text-slate-400 dark:placeholder:text-[#EEEEEE]/30 font-medium transition-all shadow-sm"
              />
              {deleteError && <p className="text-xs text-red-500 dark:text-red-400 font-medium">{deleteError}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setWorkspaceToDelete(null);
                }}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-[#222831]/80 text-slate-700 dark:text-[#EEEEEE]/70 rounded-xl border border-slate-200 dark:border-[#76ABAE]/20 hover:bg-slate-200 dark:hover:bg-[#222831] font-bold tracking-wide transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmName !== workspaceToDelete.name || deleteLoading}
                onClick={async () => {
                  if (deleteConfirmName !== workspaceToDelete.name) return;
                  setDeleteLoading(true);
                  setDeleteError('');
                  try {
                    await deleteWorkspace(workspaceToDelete._id);
                    setWorkspaceToDelete(null);
                  } catch (err) {
                    console.error('Failed to delete workspace:', err);
                    setDeleteError(err.message || 'Failed to delete workspace. Only the workspace owner can delete it.');
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide shadow-lg shadow-red-500/20 hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none transition-all duration-150 flex items-center justify-center gap-2"
              >
                {deleteLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Delete Workspace</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSelectionPage;