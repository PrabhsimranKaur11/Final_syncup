'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authLinkState, getAuthBackTarget } from '../utils/authNavigation';
import { Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, User } from 'lucide-react';
import { gsap } from 'gsap';
import { useTheme } from '../context/ThemeContext';
import { unlockCallAudio } from '../utils/callRingtone';

const workspaceFeatures = [
  "Channels", "Direct Messages", "Threads", "Mentions", 
  "Reactions", "Huddles", "File Sharing", "Universal Search", 
  "Integrations", "Custom Bots", "Workflows", "Canvas", 
  "Connect", "Status Updates", "Presence", "Smart Notifications", 
  "Reminders", "Saved Items", "Pinned Messages", "Voice Calls", 
  "Video Calls", "Screen Sharing", "Video Clips", "Enterprise Security", 
  "Compliance", "SSO Login", "Guest Access", "Roles & Permissions", 
  "Analytics", "Open API", "Webhooks", "Keyboard Shortcuts", 
  "Custom Themes", "Accessibility", "Auto-Archive", "Mute Channels", 
  "Do Not Disturb", "Custom Emojis", "App Directory", "Message Sync"
];

export default function LoginPage() {
  const { login: ctxLogin, darkMode } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ text: '', type: '' });

  // ── Forgot Password State ──
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [isTrackingInput, setIsTrackingInput] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [mouthStatus, setMouthStatus] = useState('small');

  const isTrackingInputRef = useRef(false);
  const isPasswordFocusedRef = useRef(false);

  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const lightRef = useRef(null);
  const textRef = useRef(null);
  const emailRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const q = gsap.utils.selector(containerRef);



  useEffect(() => { isTrackingInputRef.current = isTrackingInput; }, [isTrackingInput]);
  useEffect(() => { isPasswordFocusedRef.current = isPasswordFocused; }, [isPasswordFocused]);

  const trackFace = (targetX, targetY) => {
    const svgEls = q('.mySVG');
    if (!svgEls || svgEls.length === 0) return;
    const svgEl = svgEls[0];

    const svgRect = svgEl.getBoundingClientRect();
    const screenCenter = svgRect.left + (svgRect.width / 2);
    const dFromC = screenCenter - targetX;

    const eyeMaxHorizD = 20; const eyeMaxVertD = 10;
    const noseMaxHorizD = 23; const noseMaxVertD = 10;

    const getAngle = (cx, cy, tx, ty) => Math.atan2(ty - cy, tx - cx);
    const getScale = (cx, cy, tx, ty) => Math.min(Math.hypot(tx - cx, ty - cy) / 80, 1);

    const eyeLCoords = { x: svgRect.left + (84/200)*svgRect.width, y: svgRect.top + (76/200)*svgRect.height };
    const eyeRCoords = { x: svgRect.left + (113/200)*svgRect.width, y: svgRect.top + (76/200)*svgRect.height };
    const noseCoords = { x: svgRect.left + (97/200)*svgRect.width, y: svgRect.top + (81/200)*svgRect.height };
    const mouthCoords = { x: svgRect.left + (100/200)*svgRect.width, y: svgRect.top + (100/200)*svgRect.height };

    const eyeLAngle = getAngle(eyeLCoords.x, eyeLCoords.y, targetX, targetY);
    const eyeLScale = getScale(eyeLCoords.x, eyeLCoords.y, targetX, targetY);
    const eyeLX = Math.cos(eyeLAngle) * eyeMaxHorizD * eyeLScale;
    const eyeLY = Math.sin(eyeLAngle) * eyeMaxVertD * eyeLScale;

    const eyeRAngle = getAngle(eyeRCoords.x, eyeRCoords.y, targetX, targetY);
    const eyeRScale = getScale(eyeRCoords.x, eyeRCoords.y, targetX, targetY);
    const eyeRX = Math.cos(eyeRAngle) * eyeMaxHorizD * eyeRScale;
    const eyeRY = Math.sin(eyeRAngle) * eyeMaxVertD * eyeRScale;

    const noseAngle = getAngle(noseCoords.x, noseCoords.y, targetX, targetY);
    const noseScale = getScale(noseCoords.x, noseCoords.y, targetX, targetY);
    const noseX = Math.cos(noseAngle) * noseMaxHorizD * noseScale;
    const noseY = Math.sin(noseAngle) * noseMaxVertD * noseScale;

    const mouthAngle = getAngle(mouthCoords.x, mouthCoords.y, targetX, targetY);
    const mouthScale = getScale(mouthCoords.x, mouthCoords.y, targetX, targetY);
    const mouthX = Math.cos(mouthAngle) * noseMaxHorizD * mouthScale;
    const mouthY = Math.sin(mouthAngle) * noseMaxVertD * mouthScale;
    const mouthR = Math.cos(mouthAngle) * 6 * mouthScale;

    const chinX = mouthX * 0.8;
    const chinY = mouthY * 0.5;
    let chinS = 1 - (Math.abs(dFromC) * 0.15) / 100;
    if (chinS < 0.8) chinS = 0.8;

    const faceX = mouthX * 0.3; const faceY = mouthY * 0.4;
    const faceSkew = Math.cos(mouthAngle) * 5 * mouthScale;
    const eyebrowSkew = Math.cos(mouthAngle) * 25 * mouthScale;
    const outerEarX = Math.cos(mouthAngle) * 4 * mouthScale;
    const outerEarY = Math.cos(mouthAngle) * 5 * mouthScale;
    const hairX = Math.cos(mouthAngle) * 6 * mouthScale;

    gsap.to(q('.eyeL'), { duration: 0.5, x: eyeLX, y: eyeLY, ease: 'expo.out' });
    gsap.to(q('.eyeR'), { duration: 0.5, x: eyeRX, y: eyeRY, ease: 'expo.out' });
    gsap.to(q('.nose'), { duration: 0.5, x: noseX, y: noseY, rotation: mouthR, transformOrigin: 'center center', ease: 'expo.out' });
    gsap.to(q('.mouth'), { duration: 0.5, x: mouthX, y: mouthY, rotation: mouthR, transformOrigin: 'center center', ease: 'expo.out' });
    gsap.to(q('.chin'), { duration: 0.5, x: chinX, y: chinY, scaleY: chinS, ease: 'expo.out' });
    gsap.to(q('.face'), { duration: 0.5, x: faceX, y: faceY, skewX: faceSkew, transformOrigin: 'center top', ease: 'expo.out' });
    gsap.to(q('.eyebrow'), { duration: 0.5, x: faceX, y: faceY, skewX: eyebrowSkew, transformOrigin: 'center top', ease: 'expo.out' });
    gsap.to(q('.earL .outerEar'), { duration: 0.5, x: -outerEarX, y: -outerEarY, ease: 'expo.out' });
    gsap.to(q('.earR .outerEar'), { duration: 0.5, x: -outerEarX, y: -outerEarY, ease: 'expo.out' });
    gsap.to(q('.earL .earHair'), { duration: 0.5, x: outerEarX, y: outerEarY, ease: 'expo.out' });
    gsap.to(q('.earR .earHair'), { duration: 0.5, x: outerEarX, y: outerEarY, ease: 'expo.out' });
    gsap.to(q('.hair'), { duration: 0.5, x: hairX, scaleY: 1.2, transformOrigin: 'center bottom', ease: 'expo.out' });
  };

  const getCoord = (inputRef) => {
    const inputEl = inputRef.current;
    if (!inputEl) return;
    const carPos = inputEl.selectionEnd;
    const div = document.createElement('div');
    const span = document.createElement('span');
    const copyStyle = getComputedStyle(inputEl);

    [].forEach.call(copyStyle, (prop) => { div.style[prop] = copyStyle[prop]; });
    
    const inputRect = inputEl.getBoundingClientRect();
    div.style.position = 'absolute';
    div.style.left = `${inputRect.left}px`;
    div.style.top = `${inputRect.top}px`;
    div.style.width = `${inputRect.width}px`;
    div.style.height = `${inputRect.height}px`;
    div.style.visibility = 'hidden';
    div.style.pointerEvents = 'none';
    
    document.body.appendChild(div);
    div.textContent = inputEl.value.substr(0, carPos);
    span.textContent = inputEl.value.substr(carPos) || '.';
    div.appendChild(span);

    const spanRect = span.getBoundingClientRect();
    const caretX = spanRect.left;
    const caretY = spanRect.top + (spanRect.height / 2);

    trackFace(caretX, caretY);
    document.body.removeChild(div);
  };

  const resetFace = () => {
    gsap.to(q('.eyeL, .eyeR'), { duration: 1, x: 0, y: 0, ease: 'expo.out' });
    gsap.to(q('.nose'), { duration: 1, x: 0, y: 0, scaleX: 1, scaleY: 1, ease: 'expo.out' });
    gsap.to(q('.mouth'), { duration: 1, x: 0, y: 0, rotation: 0, ease: 'expo.out' });
    gsap.to(q('.chin'), { duration: 1, x: 0, y: 0, scaleY: 1, ease: 'expo.out' });
    gsap.to(q('.face, .eyebrow'), { duration: 1, x: 0, y: 0, skewX: 0, ease: 'expo.out' });
    gsap.to(q('.earL .outerEar, .earR .outerEar, .earL .earHair, .earR .earHair, .hair'), { duration: 1, x: 0, y: 0, scaleY: 1, ease: 'expo.out' });
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let ctx = gsap.context(() => {
      gsap.set('.armL', { x: -93, y: 220, rotation: 105, transformOrigin: 'top left' });
      gsap.set('.armR', { x: -93, y: 220, rotation: -105, transformOrigin: 'top right' });

      if (cardRef.current) {
        gsap.fromTo(cardRef.current, 
          { scale: 0.9, opacity: 0, y: 30 }, 
          { scale: 1, opacity: 1, y: 0, duration: 1, ease: "back.out(1.2)" }
        );
      }
      gsap.fromTo(".form-element", 
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "power2.out", delay: 0.2 }
      );

      const handleMouseMove = (e) => {
        const { clientX, clientY } = e;
        if (lightRef.current) {
          gsap.to(lightRef.current, { x: clientX, y: clientY, duration: 0.8, ease: "power2.out" });
        }
        if (textRef.current) {
          gsap.to(textRef.current, { '--x': `${clientX}px`, '--y': `${clientY}px`, duration: 0.8, ease: "power2.out" });
        }
        if (!isPasswordFocusedRef.current && !isTrackingInputRef.current) {
          trackFace(clientX, clientY);
        }
      };
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleEmailInput = (e) => {
    const value = e.target.value;
    setEmail(value); getCoord(emailRef);

    let newMouthStatus = mouthStatus;
    if (value.length > 0) {
      if (newMouthStatus === 'small') {
        newMouthStatus = 'medium';
        gsap.to(q('.tooth'), { duration: 1, x: 0, y: 0, ease: 'expo.out' });
        gsap.to(q('.tongue'), { duration: 1, x: 0, y: 1, ease: 'expo.out' });
        gsap.to(q('.eyeL, .eyeR'), { duration: 1, scaleX: 0.85, scaleY: 0.85, ease: 'expo.out' });
      }
      if (value.includes('@')) {
        newMouthStatus = 'large';
        gsap.to(q('.tooth'), { duration: 1, x: 3, y: -2, ease: 'expo.out' });
        gsap.to(q('.tongue'), { duration: 1, y: 2, ease: 'expo.out' });
        gsap.to(q('.eyeL, .eyeR'), { duration: 1, scaleX: 0.65, scaleY: 0.65, ease: 'expo.out', transformOrigin: 'center center' });
      } else {
        newMouthStatus = 'medium';
        gsap.to(q('.tooth'), { duration: 1, x: 0, y: 0, ease: 'expo.out' });
        gsap.to(q('.tongue'), { duration: 1, x: 0, y: 1, ease: 'expo.out' });
        gsap.to(q('.eyeL, .eyeR'), { duration: 1, scaleX: 0.85, scaleY: 0.85, ease: 'expo.out' });
      }
    } else {
      newMouthStatus = 'small';
      gsap.to(q('.tooth'), { duration: 1, x: 0, y: 0, ease: 'expo.out' });
      gsap.to(q('.tongue'), { duration: 1, y: 0, ease: 'expo.out' });
      gsap.to(q('.eyeL, .eyeR'), { duration: 1, scaleX: 1, scaleY: 1, ease: 'expo.out' });
    }
    setMouthStatus(newMouthStatus);
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (feedbackMessage.text) setFeedbackMessage({ text: '', type: '' });
  };

  const updateYetiArms = (isFocused, isShowingPassword) => {
    if (isFocused) {
      if (isShowingPassword) {
        gsap.to(q('.armL'), { duration: 0.45, x: -93, y: 28, rotation: -10, ease: 'power2.out' });
        gsap.to(q('.armR'), { duration: 0.45, x: -93, y: 100, rotation: -30, ease: 'power2.out' });
      } else {
        gsap.to(q('.armL'), { duration: 0.45, x: -93, y: 2, rotation: 0, ease: 'power2.out' });
        gsap.to(q('.armR'), { duration: 0.45, x: -93, y: 2, rotation: 0, ease: 'power2.out', delay: 0.1 });
      }
    } else {
      gsap.to(q('.armL'), { duration: 1, x: -93, y: 220, rotation: 105, ease: 'power2.out' });
      gsap.to(q('.armR'), { duration: 1, x: -93, y: 220, rotation: -105, ease: 'power2.out', delay: 0.1 });
    }
  };

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true); resetFace(); updateYetiArms(true, showPassword);
  };

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false); updateYetiArms(false, showPassword);
  };

  const togglePasswordVisibility = () => {
    const newShowPassword = !showPassword;
    setShowPassword(newShowPassword);
    if (isPasswordFocused) updateYetiArms(true, newShowPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      return setFeedbackMessage({ text: 'Please fill in all required fields.', type: 'error' });
    }
    try {
      await ctxLogin({ email, password });
      unlockCallAudio();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().catch(() => {});
      }
      setFeedbackMessage({ text: 'Login successful!', type: 'success' });
      setTimeout(() => navigate('/workspaces'), 500);
    } catch (err) {
      setFeedbackMessage({ text: err.message || 'Invalid credentials or login failed.', type: 'error' });
    }
  };

  // ── Forgot Password Handler ──
 const sendResetCode = async (emailToSend) => {
  const targetEmail = (emailToSend || forgotEmail || email || '').trim();
  if (!targetEmail) return { ok: false, message: 'Please provide an email.' };
  setForgotLoading(true);
  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      setFeedbackMessage({ text: data.message || 'Server error. Please try again.', type: 'error' });
      return { ok: false, message: data.message };
    }
    // Success: Code sent to a verified registered email
    setFeedbackMessage({ text: data.message || 'A reset code has been sent successfully.', type: 'success' });
    setCodeSent(true);
    return { ok: true, message: data.message };
  } catch (err) {
    setFeedbackMessage({ text: 'Could not connect to server. Is your backend running?', type: 'error' });
    return { ok: false, message: err.message };
  } finally {
    setForgotLoading(false);
  }
 };

 const handleForgotPassword = async (e) => {
  e.preventDefault();
  await sendResetCode();
 };

 const handleGetOrUseCode = async () => {
  // If code hasn't been sent yet, request it. Otherwise, try to sign in with the code.
  if (!codeSent) {
    const result = await sendResetCode();
    if (!result.ok) return; // feedback already set
    // keep the email visible for convenience
  } else {
    // Use code to sign in
    await handleCodeSignIn();
  }
 };

const handleCodeSignIn = async () => {
  if (!forgotCode) return setFeedbackMessage({ text: 'Please enter the 6-digit code.', type: 'error' });
  try {
    const res = await fetch('/api/auth/code-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: forgotCode })
    });
    const data = await res.json();
    if (!res.ok) return setFeedbackMessage({ text: data.message || 'Invalid or expired code.', type: 'error' });
    setFeedbackMessage({ text: 'Signed in successfully!', type: 'success' });
    setTimeout(() => navigate('/workspaces'), 400);
  } catch (err) {
    setFeedbackMessage({ text: 'Could not connect to server. Is your backend running?', type: 'error' });
  }
};

  const commonDomains = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "syncup.io"];
  const inputContainerStyle = "relative group transition-all duration-300";
  const inputStyle = `w-full bg-slate-50 dark:bg-[#222831]/80 border border-slate-200 dark:border-[#76ABAE]/30 
                      px-12 py-3 rounded-xl outline-none text-slate-900 dark:text-[#EEEEEE] 
                      focus:border-blue-500 dark:focus:border-[#76ABAE] focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-[#76ABAE]/20
                      placeholder:text-slate-400 dark:placeholder:text-[#EEEEEE]/40 font-medium transition-all shadow-sm
                      [&::-ms-reveal]:hidden [&::-ms-clear]:hidden [&::-webkit-contacts-auto-fill-button]:hidden`;
  const iconStyle = "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-[#EEEEEE]/50 group-focus-within:text-blue-500 dark:group-focus-within:text-[#76ABAE] transition-colors z-10";

  return (
    <div ref={containerRef} className="relative min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-[#222831] text-slate-900 dark:text-[#EEEEEE] transition-colors duration-500 overflow-hidden font-sans">
      
      {/* ── Giant Masked Brand Text (restored) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-end overflow-hidden w-full pl-6 pr-[5vw]">
        <h1
          ref={textRef}
          className="text-[27.5vw] font-black tracking-tighter text-blue-500/30 dark:text-[#76ABAE]/30 select-none whitespace-nowrap"
          style={{
            '--x': '50vw',
            '--y': '50vh',
            WebkitMaskImage: 'radial-gradient(circle 500px at var(--x) var(--y), black 0%, transparent 100%)',
            maskImage: 'radial-gradient(circle 500px at var(--x) var(--y), black 0%, transparent 100%)'
          }}
        >
          SyncUp
        </h1>
      </div>

      {/* ── Cursor Light Effect ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          ref={lightRef} 
          className="absolute w-[800px] h-[800px] rounded-full pointer-events-none" 
          style={{
            left: '-400px', top: '-400px',
            background: darkMode 
              ? 'radial-gradient(circle, rgba(118, 171, 174, 0.25) 0%, transparent 65%)' 
              : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* ── Main Card ── */}
      <div className="relative z-10 w-full max-w-[480px] p-4">
        <div ref={cardRef} className="w-full bg-white/90 dark:bg-[#31363F]/85 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-slate-200/50 dark:border-[#76ABAE]/20 p-6 md:p-8 transition-colors duration-500 relative">

          {/* ── Back Arrow ── */}
          <button
            type="button"
            onClick={() => {
              if (forgotMode) {
                setForgotMode(false);
                setFeedbackMessage({ text: '', type: '' });
              } else {
                navigate(getAuthBackTarget(location));
              }
            }}
            className="absolute top-5 left-5 p-2 rounded-xl text-slate-400 dark:text-[#EEEEEE]/50 hover:text-blue-600 dark:hover:text-[#76ABAE] hover:bg-slate-100 dark:hover:bg-[#222831]/50 transition-all duration-200"
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* ── Header ── */}
          <div className="text-center mb-6 form-element">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#EEEEEE]">
              {forgotMode
                ? 'Reset your password'
                : <>Sign in to <span className="text-blue-600 dark:text-[#76ABAE]">SyncUp Workspace</span></>
              }
            </h1>
            <p className="text-sm text-slate-500 dark:text-[#EEEEEE]/70 mt-1">
              {forgotMode
                ? "Enter your registered email and we'll send you a reset link."
                : 'Welcome back! Sign in to continue.'
              }
            </p>
          </div>

          {/* ── Yeti Avatar ── */}
          <div className="svgContainer relative w-[140px] h-[140px] mx-auto mb-5 rounded-full bg-white dark:bg-[#222831]/50 border-4 border-slate-200 dark:border-[#222831] overflow-hidden pointer-events-none shadow-inner transition-colors duration-500">
            <div className="relative w-full h-0 overflow-hidden pb-[100%]">
              <svg className="mySVG absolute left-0 top-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                <defs>
                  <circle id="armMaskPath" cx="100" cy="100" r="100" />
                </defs>
                <clipPath id="armMask">
                  <use href="#armMaskPath" overflow="visible" />
                </clipPath>
                <circle cx="100" cy="100" r="100" className="fill-slate-50 dark:fill-[#222831]/50 transition-colors duration-500" />
                <g className="body">
                  <path fill="#FFFFFF" d="M193.3,135.9c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51,44.4,51,72v50H32.1 c-10.6,0-20,5.1-25.8,13l0,78h187L193.3,135.9z" />
                  <path fill="none" stroke="#456882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M193.3,135.9 c-5.8-8.4-15.5-13.9-26.5-13.9H151V72c0-27.6-22.4-50-50-50S51,44.4,51,72v50H32.1c-10.6,0-20,5.1-25.8,13" />
                  <path fill="#DDF1FA" d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9 C143,167.5,122.9,156.4,100,156.4z" />
                </g>
                <g className="earL">
                  <g className="outerEar" fill="#ddf1fa" stroke="#456882" strokeWidth="2.5">
                    <circle cx="47" cy="83" r="11.5" />
                    <path d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <g className="earHair">
                    <rect x="51" y="64" fill="#FFFFFF" width="15" height="35" />
                    <path d="M53.4 62.8C48.5 67.4 45 72.2 42.8 77c3.4-.1 6.8-.1 10.1.1-4 3.7-6.8 7.6-8.2 11.6 2.1 0 4.2 0 6.3.2-2.6 4.1-3.8 8.3-3.7 12.5 1.2-.7 3.4-1.4 5.2-1.9" fill="#fff" stroke="#456882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
                <g className="earR">
                  <g className="outerEar" fill="#ddf1fa" stroke="#456882" strokeWidth="2.5">
                    <circle cx="155" cy="83" r="11.5" />
                    <path d="M155.7 78.9c2.3 0 4.1 1.9 4.1 4.1 0 2.3-1.9 4.1-4.1 4.1" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  <g className="earHair">
                    <rect x="131" y="64" fill="#FFFFFF" width="20" height="35" />
                    <path d="M148.6 62.8c4.9 4.6 8.4 9.4 10.6 14.2-3.4-.1-6.8-.1-10.1.1 4 3.7 6.8 7.6 8.2 11.6-2.1 0-4.2 0-6.3.2 2.6 4.1 3.8 8.3 3.7 12.5-1.2-.7-3.4-1.4-5.2-1.9" fill="#fff" stroke="#456882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
                <path className="chin" d="M84.1 121.6c2.7 2.9 6.1 5.4 9.8 7.5l.9-4.5c2.9 2.5 6.3 4.8 10.2 6.5 0-1.9-.1-3.9-.2-5.8 3 1.2 6.2 2 9.7 2.5-.3-2.1-.7-4.1-1.2-6.1" fill="none" stroke="#456882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path className="face" fill="#DDF1FA" d="M134.5,46v35.5c0,21.815-15.446,39.5-34.5,39.5s-34.5-17.685-34.5-39.5V46" />
                <path className="hair" fill="#FFFFFF" stroke="#456882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M81.457,27.929 c1.755-4.084,5.51-8.262,11.253-11.77c0.979,2.565,1.883,5.14,2.712,7.723c3.162-4.265,8.626-8.27,16.272-11.235 c-0.737,3.293-1.588,6.573-2.554,9.837c4.857-2.116,11.049-3.64,18.428-4.156c-2.403,3.23-5.021,6.391-7.852,9.474" />
                <g className="eyebrow">
                  <path fill="#FFFFFF" d="M138.142,55.064c-4.93,1.259-9.874,2.118-14.787,2.599c-0.336,3.341-0.776,6.689-1.322,10.037 c-4.569-1.465-8.909-3.222-12.996-5.226c-0.98,3.075-2.07,6.137-3.267,9.179c-5.514-3.067-10.559-6.545-15.097-10.329 c-1.806,2.889-3.745,5.73-5.816,8.515c-7.916-4.124-15.053-9.114-21.296-14.738l1.107-11.768h73.475V55.064z" />
                  <path fill="#FFFFFF" stroke="#456882" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M63.56,55.102 c6.243,5.624,13.38,10.614,21.296,14.738c2.071-2.785,4.01-5.626,5.816-8.515c4.537,3.785,9.583,7.263,15.097,10.329 c1.197-3.043,2.287-6.104,3.267-9.179c4.087,2.004,8.427,3.761,12.996,5.226c0.545-3.348,0.986-6.696,1.322-10.037 c4.913-0.481,9.857-1.34,14.787-2.599" />
                </g>
                <g className="eyeL">
                  <circle cx="85.5" cy="78.5" r="3.5" fill="#1B3C53" />
                  <circle cx="84" cy="76" r="1" fill="#fff" />
                </g>
                <g className="eyeR">
                  <circle cx="114.5" cy="78.5" r="3.5" fill="#1B3C53" />
                  <circle cx="113" cy="76" r="1" fill="#fff" />
                </g>
                <g className="mouth">
                  <path className="mouthBG" fill="#456882" d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z" />
                  <defs>
                    <path id="mouthMaskPath" d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z" />
                  </defs>
                  <clipPath id="mouthMask">
                    <use href="#mouthMaskPath" overflow="visible" />
                  </clipPath>
                  <g clipPath="url(#mouthMask)">
                    <g className="tongue">
                      <circle cx="100" cy="107" r="8" fill="#cc4a6c" />
                      <ellipse className="tongueHighlight" cx="100" cy="100.5" rx="3" ry="1.5" opacity=".1" fill="#fff" />
                    </g>
                  </g>
                  <path clipPath="url(#mouthMask)" className="tooth" style={{ fill: '#FFFFFF' }} d="M106,97h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,96.1,107.1,97,106,97z" />
                  <path className="mouthOutline" fill="none" stroke="#456882" strokeWidth="2.5" strokeLinejoin="round" d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8 c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2 c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z" />
                </g>
                <path className="nose" d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z" fill="#1B3C53" />
                <g className="arms" clipPath="url(#armMask)">
                  <g className="armL">
                    <path fill="#ddf1fa" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="2.5" d="M121.3 97.4L111 58.7l38.8-10.4 20 36.1z" />
                    <path fill="#ddf1fa" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="2.5" d="M134.4 52.5l19.3-5.2c2.7-.7 5.4.9 6.1 3.5-.7 2.7-.9 5.4-3.5 6.1L146 59.7M160.8 76.5l19.4-5.2c2.7-.7 5.4.9 6.1 3.5-.7 2.7-.9 5.4-3.5 6.1l-18.3 4.9M158.3 66.8l23.1-6.2c2.7-.7 5.4.9 6.1 3.5-.7 2.7-.9 5.4-3.5 6.1l-23.1 6.2M150.9 58.4l26-7c2.7-.7 5.4.9 6.1 3.5-.7 2.7-.9 5.4-3.5 6.1l-21.3 5.7" />
                    <path fill="#a9ddf3" d="M178.8 74.7l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM180.1 64l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM175.5 54.9l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8zM152.1 49.4l2.2-.6c1.1-.3 2.2.3 2.4 1.4.3 1.1-.3 2.2-1.4 2.4l-2.2.6-1-3.8z" />
                    <path fill="#fff" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M123.5 96.8c-41.4 14.9-84.1 30.7-108.2 35.5L1.2 80c33.5-9.9 71.9-16.5 111.9-21.8" />
                    <path fill="#fff" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M108.5 59.4c7.7-5.3 14.3-8.4 22.8-13.2-2.4 5.3-4.7 10.3-6.7 15.1 4.3.3 8.4.7 12.3 1.3-4.2 5-8.1 9.6-11.5 13.9 3.1 1.1 6 2.4 8.7 3.8-1.4 2.9-2.7 5.8-3.9 8.5 2.5 3.5 4.6 7.2 6.3 11-4.9-.8-9-.7-16.2-2.7M94.5 102.8c-.6 4-3.8 8.9-9.4 14.7-2.6-1.8-5-3.7-7.2-5.7-2.5 4.1-6.6 8.8-12.2 14-1.9-2.2-3.4-4.5-4.5-6.9-4.4 3.3-9.5 6.9-15.4 10.8-.2-3.4.1-7.1 1.1-10.9M97.5 62.9c-1.7-2.4-5.9-4.1-12.4-5.2-.9 2.2-1.8 4.3-2.5 6.5-3.8-1.8-9.4-3.1-17-3.8.5 2.3 1.2 4.5 1.9 6.8-5-.6-11.2-.9-18.4-1 2 2.9.9 3.5 3.9 6.2" />
                  </g>
                  <g className="armR">
                    <path fill="#ddf1fa" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="2.5" d="M265.4 97.3l10.4-38.6-38.9-10.5-20 36.1z" />
                    <path fill="#ddf1fa" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="2.5" d="M252.4 52.4L233 47.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l10.3 2.8M226 76.4l-19.4-5.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l18.3 4.9M228.4 66.7l-23.1-6.2c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l23.1 6.2M235.8 58.3l-26-7c-2.7-.7-5.4.9-6.1 3.5-.7 2.7.9 5.4 3.5 6.1l21.3 5.7" />
                    <path fill="#a9ddf3" d="M207.9 74.7l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM206.7 64l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM211.2 54.8l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8zM234.6 49.4l-2.2-.6c-1.1-.3-2.2.3-2.4 1.4-.3 1.1.3 2.2 1.4 2.4l2.2.6 1-3.8z" />
                    <path fill="#fff" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M263.3 96.7c41.4 14.9 84.1 30.7 108.2 35.5l14-52.3C352 70 313.6 63.5 273.6 58.1" />
                    <path fill="#fff" stroke="#456882" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M278.2 59.3l-18.6-10 2.5 11.9-10.7 6.5 9.9 8.7-13.9 6.4 9.1 5.9-13.2 9.2 23.1-.9M284.5 100.1c-.4 4 1.8 8.9 6.7 14.8 3.5-1.8 6.7-3.6 9.7-5.5 1.8 4.2 5.1 8.9 10.1 14.1 2.7-2.1 5.1-4.4 7.1-6.8 4.1 3.4 9 7 14.7 11 1.2-3.4 1.8-7 1.7-10.9M314 66.7s5.4-5.7 12.6-7.4c1.7 2.9 3.3 5.7 4.9 8.6 3.8-2.5 9.8-4.4 18.2-5.7.1 3.1.1 6.1 0 9.2 5.5-1 12.5-1.6 20.8-1.9-1.4 3.9-2.5 8.4-2.5 8.4" />
                  </g>
                </g>
              </svg>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              SIGN IN FORM
          ══════════════════════════════════════════ */}
          {!forgotMode ? (
            <form className="space-y-4 relative z-10" onSubmit={handleSubmit}>
              {feedbackMessage.text && (
                <div className={`form-element p-4 rounded-xl flex items-center space-x-3 text-sm font-medium border transition-colors ${
                  feedbackMessage.type === 'error' 
                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                }`}>
                  {feedbackMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                  <p>{feedbackMessage.text}</p>
                </div>
              )}

              {/* Email */}
              <div className="form-element space-y-1.5 relative">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Work Email</label>
                <div className={inputContainerStyle}>
                  <Mail className={iconStyle} />
                  <input 
                    type="email" 
                    list="email-options"
                    placeholder="user@syncup.io" 
                    className={inputStyle}
                    value={email}
                    ref={emailRef}
                    onChange={handleEmailInput}
                    onFocus={() => { setIsTrackingInput(true); setTimeout(() => getCoord(emailRef), 50); }}
                    onBlur={() => { setIsTrackingInput(false); resetFace(); }}
                    required 
                  />
                  <datalist id="email-options">
                    {email && !email.includes('@') && commonDomains.map((domain) => (
                      <option key={domain} value={`${email}@${domain}`} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Password */}
              <div className="form-element space-y-1.5 relative">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">Password</label>
                <div className={inputContainerStyle}>
                  <Lock className={iconStyle} />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" 
                    className={inputStyle}
                    value={password}
                    maxLength={32}
                    onChange={handlePasswordChange}
                    onFocus={handlePasswordFocus}
                    onBlur={handlePasswordBlur}
                    required 
                  />
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={togglePasswordVisibility}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#EEEEEE]/50 hover:text-blue-500 dark:hover:text-[#76ABAE] transition-colors z-10 p-1"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>

                {/* ── Forgot Password Link ── */}
                <div className="flex justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setFeedbackMessage({ text: '', type: '' });
                      // Pre-fill forgot email if user already typed one
                      if (email) setForgotEmail(email);
                    }}
                    className="text-xs font-semibold text-blue-500 dark:text-[#76ABAE] hover:underline transition-all"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                className="form-element w-full mt-2 py-3 px-6 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 text-white dark:text-[#222831] rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 dark:hover:shadow-[#76ABAE]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                Sign In
              </button>
            </form>

          ) : (
          /* ══════════════════════════════════════════
              FORGOT PASSWORD FORM
          ══════════════════════════════════════════ */
            <form className="space-y-4 relative z-10" onSubmit={handleForgotPassword}>
              {feedbackMessage.text && (
                <div className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium border transition-colors ${
                  feedbackMessage.type === 'error'
                    ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'
                }`}>
                  {feedbackMessage.type === 'error'
                    ? <AlertCircle className="w-5 h-5 shrink-0" />
                    : <CheckCircle className="w-5 h-5 shrink-0" />
                  }
                  <p>{feedbackMessage.text}</p>
                </div>
              )}

              {/* Registered Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">
                  Registered Email
                </label>
                <div className={inputContainerStyle}>
                  <Mail className={iconStyle} />
                  <input
                    type="email"
                    placeholder="user@syncup.io"
                    className={inputStyle}
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      setFeedbackMessage({ text: '', type: '' });
                    }}
                    required
                  />
                </div>
              </div>

              {/* Sign in with Code */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-[#EEEEEE]/70 ml-1">
                  Sign in with Code
                </label>
                <div className={inputContainerStyle}>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    className={inputStyle}
                    value={forgotCode}
                    onChange={(e) => { setForgotCode(e.target.value); setFeedbackMessage({ text: '', type: '' }); }}
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={handleGetOrUseCode}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-3 py-1.5 rounded-md shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    {codeSent ? 'Use Code' : 'Get Code'}
                  </button>
                </div>
              </div>

              {/* Send Reset Link Button */}
              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3 px-6 bg-blue-600 dark:bg-[#76ABAE] hover:bg-blue-700 dark:hover:bg-[#76ABAE]/80 text-white dark:text-[#222831] rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2"
              >
                {forgotLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              {/* Back to Sign In */}
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setFeedbackMessage({ text: '', type: '' });
                }}
                className="w-full py-2 text-sm font-semibold text-slate-500 dark:text-[#EEEEEE]/60 hover:text-blue-600 dark:hover:text-[#76ABAE] transition-colors"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* ── Sign Up Link (hidden in forgot mode) ── */}
          {!forgotMode && (
            <div className="mt-4 text-center form-element relative z-10">
              <p className="text-sm text-slate-500 dark:text-[#EEEEEE]/70">
                Don't have an account?
                <button
                  onClick={() => navigate('/register', { state: authLinkState('/login') })}
                  className="ml-2 font-bold text-blue-600 dark:text-[#76ABAE] hover:underline transition-all"
                >
                  Sign Up
                </button>
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}