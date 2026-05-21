import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";
import * as THREE from "three";

const GLOBAL_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; -webkit-font-smoothing: antialiased; }
body::after { content: ''; position: fixed; inset: 0; background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.04'/%3E%3C/svg%3E"); pointer-events: none; z-index: 9998; opacity: .08; mix-blend-mode: multiply; }

#su-cursor { width: 10px; height: 10px; background: var(--accent); border-radius: 50%; position: fixed; top: 0; left: 0; pointer-events: none; z-index: 99999; transform: translate(-50%,-50%); transition: width .2s, height .2s; mix-blend-mode: multiply; }
.dark #su-cursor { mix-blend-mode: difference; }
#su-cursor.big { width: 42px; height: 42px; background: rgba(118,171,174,0.15); border: 1px solid var(--accent); mix-blend-mode: normal; }
#su-prog { position: fixed; top: 0; left: 0; height: 2px; width: 0; background: linear-gradient(90deg, var(--accent), var(--accent2)); z-index: 10001; pointer-events: none; box-shadow: 0 0 10px var(--glow); transition: width .06s linear; }

#theme-toggle { position: fixed; bottom: 24px; right: 24px; z-index: 10002; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border-l); background: var(--card); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-card); transition: background .25s, border-color .25s, transform .2s; }
#theme-toggle:hover { transform: scale(1.1); background: var(--card-h); }

.hero-section { position: relative; height: 100vh; overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--hero-bg); }
.hero-grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(118,171,174,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(118,171,174,0.07) 1px, transparent 1px); background-size: 48px 48px; pointer-events: none; z-index: 1; }

.lg-navbar { position: fixed; top: 18px; left: 50%; transform: translateX(-50%) translateY(-110px); opacity: 0; visibility: hidden; z-index: 10000; transition: none; }
.lg-navbar.visible { visibility: visible; transition: transform .6s cubic-bezier(.22,1,.36,1), opacity .5s; }
.lg-navbar.compact { top: 10px; }
.glass-effect-wrapper { position: relative; display: flex; font-family: var(--fb); font-weight: 600; overflow: hidden; cursor: pointer; transition: all 700ms cubic-bezier(0.175, 0.885, 0.32, 2.2); box-shadow: 0 6px 24px rgba(0,0,0,0.08), 0 0 0 1px rgba(118,171,174,0.14); }
.glass-blur-layer { position: absolute; inset: 0; z-index: 0; overflow: hidden; border-radius: inherit; backdrop-filter: blur(20px) saturate(160%); -webkit-backdrop-filter: blur(20px) saturate(160%); filter: url(#glass-distortion); isolation: isolate; }
.glass-white-layer { position: absolute; inset: 0; z-index: 1; border-radius: inherit; background: rgba(255,255,255,0.72); }
.dark .glass-white-layer { background: rgba(49,54,63,0.78); }
.glass-shine-layer { position: absolute; inset: 0; z-index: 2; overflow: hidden; border-radius: inherit; box-shadow: inset 2px 2px 1px 0 rgba(255,255,255,0.55), inset -1px -1px 1px 1px rgba(255,255,255,0.18); }
.glass-content { position: relative; z-index: 3; }
.lg-navbar-pill { border-radius: 9999px; padding: 8px 16px 8px 12px; min-width: 500px; align-items: center; }
.lg-navbar-pill:hover { padding: 10px 18px 10px 14px; }

.btn { position: relative; overflow: hidden; cursor: pointer; display: inline-flex; font-family: var(--fb); font-weight: 600; border: none; transition: transform .15s, box-shadow .25s; display: inline-flex; align-items: center; gap: 6px; }
.btn:hover { transform: translateY(-1px); }
.btn-p { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: #fff; padding: 8px 18px; border-radius: 99px; font-size: 13px; }
.btn-p:hover { box-shadow: 0 0 28px var(--glow); }
.btn-s { background: rgba(118,171,174,0.08); color: var(--t1); border: 1px solid var(--border-l); padding: 8px 18px; border-radius: 99px; font-size: 13px; }
.btn-s:hover { background: rgba(118,171,174,0.15); border-color: var(--accent); }
.ripple { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.28); transform: scale(0); animation: rpl .7s ease-out forwards; pointer-events: none; }
@keyframes rpl { to { transform: scale(5); opacity: 0; } }

.section { padding: 110px 24px; position: relative; }
.container { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
.section-label { font-family: var(--fb); font-size: 10px; font-weight: 700; letter-spacing: .3em; text-transform: uppercase; color: var(--accent); margin-bottom: 14px; display: block; }
.section-h { font-family: var(--fd); font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 400; letter-spacing: -0.025em; line-height: 1.05; color: var(--t1); margin-bottom: 20px; }
.section-h em { font-style: italic; color: var(--accent); }

.glass { background: var(--card); border: 1px solid var(--border); border-radius: var(--r); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: var(--shadow-card); transition: background .3s, border-color .3s, box-shadow .3s, transform .25s; }
.glass:hover { background: var(--card-h); border-color: var(--border-l); box-shadow: 0 0 40px rgba(118,171,174,0.10), 0 16px 40px rgba(0,0,0,.07); }

.stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; margin-top: 52px; }
.stat-card { padding: 36px 24px; border-radius: 18px; text-align: center; }
.stat-val { font-family: var(--fd); font-size: clamp(2.4rem,5vw,3.8rem); color: var(--accent); line-height: 1; margin-bottom: 8px; letter-spacing: 0.02em; }
.stat-lbl { font-size: 13px; color: var(--t2); font-weight: 500; }

.marquee-section { padding: 80px 0; border-top: 1px solid var(--border); overflow: hidden; }
.marquee-row { overflow: hidden; padding: 8px 0; }
.marquee-inner { display: flex; gap: 16px; animation: marqL 36s linear infinite; width: max-content; }
.marquee-inner.rev { animation: marqR 40s linear infinite; }
.marquee-row:hover .marquee-inner { animation-play-state: paused; }
@keyframes marqL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes marqR { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.tcard { width: 280px; flex-shrink: 0; padding: 22px; border-radius: 16px; }
.tcard p { font-size: 13.5px; color: var(--t2); line-height: 1.68; margin: 12px 0 16px; }
.tcard-author { display: flex; align-items: center; gap: 10px; }
.tcard-av { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; }
.tcard-name { font-size: 13px; font-weight: 600; color: var(--t1); }
.tcard-role { font-size: 11px; color: var(--t3); }

.pricing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin-top: 56px; align-items: start; }
.pricing-card { padding: 34px; border-radius: 22px; }
.pricing-card.featured { border-color: var(--accent); box-shadow: 0 0 48px rgba(118,171,174,0.14), 0 8px 32px rgba(0,0,0,.07); transform: scale(1.04); }
.pricing-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(90deg, var(--accent), var(--accent2)); color: #fff; font-size: 9px; font-weight: 800; letter-spacing: .15em; padding: 4px 14px; border-radius: 99px; white-space: nowrap; }
.pricing-tier { font-size: 11px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
.pricing-price { font-family: var(--fd); font-size: 44px; font-weight: 400; color: var(--t1); line-height: 1; letter-spacing: -0.02em; }
.pricing-period { font-size: 13px; color: var(--t3); margin-left: 6px; }
.pricing-desc { font-size: 14px; color: var(--t2); margin: 12px 0 24px; line-height: 1.6; }
.pricing-features { display: flex; flex-direction: column; gap: 11px; margin-bottom: 28px; }
.feat-row { display: flex; align-items: center; gap: 10px; }
.check-box { width: 18px; height: 18px; border-radius: 5px; background: rgba(118,171,174,0.10); border: 1px solid var(--border-l); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.feat-row span { font-size: 13.5px; color: var(--t2); }

.blob { position: absolute; border-radius: 50%; filter: blur(110px); pointer-events: none; }
.s-reveal { opacity: 0; transform: translateY(44px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
.s-reveal.in { opacity: 1; transform: translateY(0); }
.card-reveal { opacity: 0; transform: translateY(50px) scale(0.96); transition: opacity .7s cubic-bezier(.22,1,.36,1), transform .7s cubic-bezier(.22,1,.36,1); }
.card-reveal.in { opacity: 1; transform: translateY(0) scale(1); }
.scale-reveal { opacity: 0; transform: scale(0.9); transition: opacity .7s, transform .7s; }
.scale-reveal.in { opacity: 1; transform: scale(1); }

.feat-card { padding: 30px; border-radius: 18px; }
.feat-icon { width: 48px; height: 48px; border-radius: 13px; background: rgba(118,171,174,0.10); border: 1px solid var(--border-l); display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
.feat-card h3 { font-family: var(--fd); font-size: 20px; font-weight: 400; color: var(--t1); margin-bottom: 10px; }
.feat-card p { font-size: 13.5px; color: var(--t2); line-height: 1.7; }
.feat-card-float { transition: box-shadow .3s, border-color .3s; will-change: transform; }
.feat-card-float:hover { border-color: var(--border-l); box-shadow: 0 0 40px rgba(118,171,174,0.10), 0 16px 48px rgba(0,0,0,0.07); }
.feat-icon-glow { transition: background .3s, box-shadow .3s; }
.feat-card-float:hover .feat-icon-glow { background: rgba(118,171,174,0.18); box-shadow: 0 0 20px rgba(118,171,174,0.18); }

.features-split-layout { display: grid; grid-template-columns: 1fr 460px; gap: 48px; align-items: start; margin-top: 56px; }
.features-right-col { position: sticky; top: 100px; height: 560px; border-radius: 24px; overflow: hidden; border: 1px solid rgba(118,171,174,0.22); background: var(--hero-bg); box-shadow: 0 0 60px rgba(118,171,174,0.07), 0 24px 64px rgba(0,0,0,0.08); }

.hud-corner { position: absolute; width: 16px; height: 16px; pointer-events: none; z-index: 20; }
.hud-tl { top: 14px; left: 14px; border-top: 1.5px solid rgba(118,171,174,0.50); border-left: 1.5px solid rgba(118,171,174,0.50); }
.hud-tr { top: 14px; right: 14px; border-top: 1.5px solid rgba(118,171,174,0.50); border-right: 1.5px solid rgba(118,171,174,0.50); }
.hud-bl { bottom: 14px; left: 14px; border-bottom: 1.5px solid rgba(118,171,174,0.50); border-left: 1.5px solid rgba(118,171,174,0.50); }
.hud-br { bottom: 14px; right: 14px; border-bottom: 1.5px solid rgba(118,171,174,0.50); border-right: 1.5px solid rgba(118,171,174,0.50); }
@keyframes scanLine { 0% { top: -2px; opacity:0; } 5%{ opacity:1; } 95%{ opacity:1; } 100% { top: 100%; opacity:0; } }
.scan-line { position: absolute; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(118,171,174,0.45), transparent); animation: scanLine 5s ease-in-out infinite; pointer-events: none; z-index: 20; }
@keyframes statusPulse { 0%,100%{ opacity:.5; } 50%{ opacity:1; } }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #76ABAE; box-shadow: 0 0 8px #76ABAE; animation: statusPulse 2s ease-in-out infinite; }

.shader-cta-section { position: relative; overflow: hidden; padding: 0; }
.shader-canvas-wrap { position: absolute; inset: 0; z-index: 0; opacity: 0.50; width: 100%; height: 100%; }
.shader-cta-content { position: relative; z-index: 2; padding: 110px 24px 120px; }
.shader-cta-section::after { content: ''; position: absolute; inset: 0; z-index: 1; background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(240,242,245,0.70) 0%, rgba(240,242,245,0.92) 100%); pointer-events: none; }
.dark .shader-cta-section::after { background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(34,40,49,0.65) 0%, rgba(34,40,49,0.88) 100%); }

footer { border-top: 1px solid var(--border); padding: 60px 24px 44px; background: var(--surface); }
.footer-bottom { border-top: 1px solid var(--border); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; }
.footer-bottom span { font-size: 12px; color: var(--t3); }

.lg-nav-link { font-size: 13px; font-weight: 500; color: var(--t2); text-decoration: none; letter-spacing: 0.01em; transition: color .2s; cursor: pointer; background: none; border: none; }
.lg-nav-link:hover { color: var(--accent); }

@keyframes arrPulse { 0%,100%{ transform:scaleY(1); opacity:.4 } 50%{ transform:scaleY(1.3); opacity:1 } }
@media (max-width: 960px) { .features-split-layout { grid-template-columns: 1fr; } .features-right-col { position: relative; top: auto; height: 400px; } }
`;

const FEATURES = [
    { title: "Real-Time Messaging", desc: "Sub-100 ms delivery — typing indicators, threads, reactions and full message history.", path: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
    { title: "Organized Channels", desc: "Structure conversations by team, project, or topic. Zero noise, total context.", path: "M4 6h16M4 12h16M4 18h16" },
    { title: "Secure File Sharing", desc: "Drag-and-drop uploads with versioning, previews, and granular permissions.", path: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
    { title: "Role-Based Access", desc: "Enterprise-grade security — the right people see exactly the right things.", path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
    { title: "Activity Tracking", desc: "Timelines, audit logs, and real-time productivity analytics built right in.", path: "M22 12h-4l-3 9L9 3l-3 9H2" },
    { title: "Scalable Architecture", desc: "99.99% SLA. From 10 to 100,000+ users without missing a single beat.", path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
];
const STATS = [
    { val: 99.99, suf: "%", label: "Uptime SLA", dec: 2 },
    { val: 10, suf: "K+", label: "Messages / day", dec: 0 },
    { val: 2, suf: "K+", label: "Teams worldwide", dec: 0 },
    { val: 100, suf: "ms", label: "Avg. delivery", dec: 0 },
];
const TESTIMONIALS = [
    { name: "Sarah Chen", role: "CTO · Vertex AI", quote: "SyncUp replaced 4 tools overnight. The speed is genuinely unreal." },
    { name: "James Okafor", role: "Head of Product · Narwhal Labs", quote: "Best team communication tool we've used in 7 years of building software." },
    { name: "Priya Nair", role: "Engineering Lead · Cascade", quote: "The role-based access controls are exactly what enterprises need. Flawless." },
    { name: "Tom Brinkley", role: "Founder · Foundry.io", quote: "Went from chaotic email threads to organized channels in under 10 minutes." },
    { name: "Aiko Tanaka", role: "Design Director · Studio Zero", quote: "File sharing with previews is a game-changer. No more 'which version is this'." },
    { name: "Lucas Ferreira", role: "VP Engineering · GridScale", quote: "99.99% uptime is not just a claim — zero incidents in 9 months." },
];
const PRICING = [
    { tier: "Free", price: "$0", period: "forever", desc: "Perfect for small teams just getting started.", features: ["Up to 10 members", "10K message history", "5GB file storage", "Basic channels", "Community support"], cta: "Get started free", featured: false },
    { tier: "Pro", price: "$12", period: "per seat / mo", desc: "For growing teams that need more power.", features: ["Unlimited members", "Unlimited history", "100GB file storage", "Advanced analytics", "Priority support", "Custom integrations"], cta: "Start free trial", featured: true },
    { tier: "Enterprise", price: "Custom", period: "contact us", desc: "Built for large organizations with complex needs.", features: ["SSO & SAML", "Audit logs & compliance", "Dedicated infrastructure", "SLA guarantees", "24/7 support", "Custom contracts"], cta: "Book a demo", featured: false },
];
const PARALLAX_IMAGES = [
    { src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1280&auto=format&fit=crop&q=80", label: "Live Collaboration" },
    { src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1280&auto=format&fit=crop&q=80", label: "Modern Workspace" },
    { src: "https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80", label: "Visual Design" },
    { src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&auto=format&fit=crop&q=80", label: "Scale & Reach" },
    { src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80", label: "Creative Flow" },
    { src: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1280&auto=format&fit=crop&q=80", label: "Global Teams" },
    { src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1280&auto=format&fit=crop&q=80", label: "Remote First" },
];
const TOTAL_IMAGES = 20;
const MAX_SCROLL = 3000;
const IMG_W = 90, IMG_H = 126;
const HERO_IMAGES = [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80",
    "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80",
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400&q=80",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&q=80",
    "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&q=80",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&q=80",
    "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400&q=80",
    "https://images.unsplash.com/photo-1531497865144-0464ef8fb9a9?w=400&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
];
const lerp = (a, b, t) => a * (1 - t) + b * t;

function SplineScene3D() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const rafRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current, container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        const resize = () => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; };
        resize(); 
        setTimeout(resize, 100); // Force resize after mount to ensure dimensions
        window.addEventListener('resize', resize, { passive: true });
        const onMouseMove = (e) => { const r = container.getBoundingClientRect(); mouseRef.current = { x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: -((e.clientY - r.top) / r.height - 0.5) * 2, active: true }; };
        const onMouseLeave = () => { mouseRef.current = { x: 0, y: 0, active: false }; };
        container.addEventListener('mousemove', onMouseMove);
        container.addEventListener('mouseleave', onMouseLeave);
        const particles = Array.from({ length: 120 }, () => { const r = 140 + Math.random() * 90, theta = Math.random() * Math.PI * 2, phi = Math.acos(2 * Math.random() - 1); return { r, theta, phi, speed: 0.002 + Math.random() * 0.003, size: 1 + Math.random() * 1.5, opacity: 0.3 + Math.random() * 0.5 }; });
        const orbits = [{ rx: 110, ry: 28, tilt: 0.3, speed: 0.008, color: 'rgba(118,171,174,' }, { rx: 145, ry: 40, tilt: -0.5, speed: -0.006, color: 'rgba(158,205,208,' }, { rx: 175, ry: 20, tilt: 0.8, speed: 0.004, color: 'rgba(118,171,174,' }];
        const satellites = orbits.map((o, oi) => ({ orbitIdx: oi, angle: (oi / orbits.length) * Math.PI * 2, speed: o.speed * 1.5, size: 4 + oi * 1.5 }));
        let t = 0, camX = 0, camY = 0;
        const draw = () => {
            const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2;
            ctx.clearRect(0, 0, W, H);
            camX += (mouseRef.current.x * 18 - camX) * 0.05; camY += (-mouseRef.current.y * 12 - camY) * 0.05;
            const R = 72 * (1 + Math.sin(t * 0.8) * 0.015);
            const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
            bg.addColorStop(0, 'rgba(118,171,174,0.07)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
            particles.forEach(p => { p.theta += p.speed; const x3 = p.r * Math.sin(p.phi) * Math.cos(p.theta + t * 0.1), y3 = p.r * Math.cos(p.phi) * 0.45, z3 = p.r * Math.sin(p.phi) * Math.sin(p.theta + t * 0.1); const sx = cx + x3 + camX * (p.r / 200), sy = cy + y3 + camY * (p.r / 200), ds = 0.6 + (z3 / p.r) * 0.4; ctx.beginPath(); ctx.arc(sx, sy, p.size * ds * 0.8, 0, Math.PI * 2); ctx.fillStyle = `rgba(118,171,174,${p.opacity * ds * 0.7})`; ctx.fill(); });
            orbits.forEach((o, i) => { const oa = t * o.speed * 60; ctx.save(); ctx.translate(cx + camX * 0.4, cy + camY * 0.4); ctx.rotate(o.tilt); ctx.beginPath(); for (let s = 0; s <= 80; s++) { const a = (s / 80) * Math.PI * 2, ex = Math.cos(a + oa) * o.rx, ey = Math.sin(a + oa) * o.ry; s === 0 ? ctx.moveTo(ex, ey) : ctx.lineTo(ex, ey); } ctx.closePath(); const rg = ctx.createLinearGradient(-o.rx, 0, o.rx, 0), ba = 0.5 + Math.sin(t * 0.4 + i) * 0.15; rg.addColorStop(0, o.color + '0)'); rg.addColorStop(0.3, o.color + ba + ')'); rg.addColorStop(0.7, o.color + ba + ')'); rg.addColorStop(1, o.color + '0)'); ctx.strokeStyle = rg; ctx.lineWidth = i === 1 ? 1.5 : 1; ctx.stroke(); ctx.restore(); });
            satellites.forEach((sat, si) => { sat.angle += sat.speed; const o = orbits[sat.orbitIdx], sx = Math.cos(sat.angle) * o.rx, sy2 = Math.sin(sat.angle) * o.ry, ang = o.tilt, sxs = cx + camX * 0.4 + sx * Math.cos(ang) - sy2 * Math.sin(ang), sys = cy + camY * 0.4 + sx * Math.sin(ang) + sy2 * Math.cos(ang); const gr = ctx.createRadialGradient(sxs, sys, 0, sxs, sys, sat.size * 4); gr.addColorStop(0, 'rgba(118,171,174,0.6)'); gr.addColorStop(1, 'rgba(118,171,174,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sxs, sys, sat.size * 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(sxs, sys, sat.size, 0, Math.PI * 2); ctx.fillStyle = si === 1 ? '#9ECDD0' : '#76ABAE'; ctx.fill(); });
            const halo = ctx.createRadialGradient(cx + camX * 0.2, cy + camY * 0.2, R * 0.5, cx + camX * 0.2, cy + camY * 0.2, R * 2.2); halo.addColorStop(0, 'rgba(118,171,174,0)'); halo.addColorStop(0.4, 'rgba(118,171,174,0.09)'); halo.addColorStop(1, 'rgba(0,0,0,0)'); ctx.beginPath(); ctx.arc(cx + camX * 0.2, cy + camY * 0.2, R * 2.2, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
            const sg = ctx.createRadialGradient(cx + camX * 0.2 - R * 0.3, cy + camY * 0.2 - R * 0.35, R * 0.05, cx + camX * 0.2, cy + camY * 0.2, R); sg.addColorStop(0, 'rgba(200,230,232,0.90)'); sg.addColorStop(0.15, 'rgba(118,171,174,0.65)'); sg.addColorStop(0.4, 'rgba(60,90,110,0.90)'); sg.addColorStop(0.75, 'rgba(34,40,49,1)'); sg.addColorStop(1, 'rgba(26,32,37,1)'); ctx.beginPath(); ctx.arc(cx + camX * 0.2, cy + camY * 0.2, R, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
            const es = 0.12 + Math.sin(t * 1.1) * 0.05, eg = ctx.createRadialGradient(cx + camX * 0.2, cy + camY * 0.2, 0, cx + camX * 0.2, cy + camY * 0.2, R * 0.7); eg.addColorStop(0, `rgba(118,171,174,${es})`); eg.addColorStop(1, 'rgba(118,171,174,0)'); ctx.beginPath(); ctx.arc(cx + camX * 0.2, cy + camY * 0.2, R, 0, Math.PI * 2); ctx.fillStyle = eg; ctx.fill();
            const rg2 = ctx.createRadialGradient(cx + camX * 0.2 + R * 0.7, cy + camY * 0.2 + R * 0.55, 0, cx + camX * 0.2 + R * 0.5, cy + camY * 0.2 + R * 0.4, R * 0.75); rg2.addColorStop(0, 'rgba(118,171,174,0.30)'); rg2.addColorStop(1, 'rgba(118,171,174,0)'); ctx.beginPath(); ctx.arc(cx + camX * 0.2, cy + camY * 0.2, R, 0, Math.PI * 2); ctx.fillStyle = rg2; ctx.fill();
            const specX = cx + camX * 0.2 - R * 0.28, specY = cy + camY * 0.2 - R * 0.32, spg = ctx.createRadialGradient(specX, specY, 0, specX, specY, R * 0.38); spg.addColorStop(0, 'rgba(255,255,255,0.75)'); spg.addColorStop(0.3, 'rgba(220,240,242,0.28)'); spg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.beginPath(); ctx.arc(cx + camX * 0.2, cy + camY * 0.2, R, 0, Math.PI * 2); ctx.fillStyle = spg; ctx.fill();
            ctx.save(); ctx.beginPath(); ctx.arc(cx + camX * 0.2, cy + camY * 0.2, R, 0, Math.PI * 2); ctx.clip(); const wa = 0.06 + Math.sin(t * 0.3) * 0.02; ctx.strokeStyle = `rgba(118,171,174,${wa})`; ctx.lineWidth = 0.5; for (let lat = -80; lat <= 80; lat += 40) { const lr = Math.cos((lat * Math.PI) / 180) * R, ly = Math.sin((lat * Math.PI) / 180) * R; ctx.beginPath(); ctx.ellipse(cx + camX * 0.2, cy + camY * 0.2 + ly, lr, lr * 0.15, 0, 0, Math.PI * 2); ctx.stroke(); } for (let lng = 0; lng < 360; lng += 60) { const lr2 = (lng + t * 8) * Math.PI / 180; ctx.beginPath(); ctx.ellipse(cx + camX * 0.2, cy + camY * 0.2, R * Math.abs(Math.cos(lr2)), R, lr2 > Math.PI / 2 && lr2 < Math.PI * 1.5 ? lr2 + Math.PI : lr2, 0, Math.PI * 2); ctx.stroke(); } ctx.restore();
            satellites.forEach(sat => { const o = orbits[sat.orbitIdx], ang = o.tilt, sx2 = Math.cos(sat.angle) * o.rx, sy2 = Math.sin(sat.angle) * o.ry, sxs = cx + camX * 0.4 + sx2 * Math.cos(ang) - sy2 * Math.sin(ang), sys = cy + camY * 0.4 + sx2 * Math.sin(ang) + sy2 * Math.cos(ang), d = Math.hypot(sxs - (cx + camX * 0.2), sys - (cy + camY * 0.2)); if (d < 200) { ctx.beginPath(); ctx.moveTo(cx + camX * 0.2, cy + camY * 0.2); ctx.lineTo(sxs, sys); ctx.strokeStyle = `rgba(118,171,174,${(1 - d / 200) * 0.22})`; ctx.lineWidth = 0.8; ctx.stroke(); } });
            t += 0.012; rafRef.current = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); container.removeEventListener('mousemove', onMouseMove); container.removeEventListener('mouseleave', onMouseLeave); };
    }, []);
    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
            <div className="hud-corner hud-tl" /><div className="hud-corner hud-tr" /><div className="hud-corner hud-bl" /><div className="hud-corner hud-br" />
            <div className="scan-line" />
            <div style={{ position: 'absolute', top: 14, left: 20, right: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><div className="status-dot" /><span style={{ fontFamily: 'var(--fb)', fontSize: 9, fontWeight: 700, letterSpacing: '.2em', color: 'rgba(118,171,174,0.7)', textTransform: 'uppercase' }}>Active</span></div>
                <span style={{ fontFamily: 'var(--fb)', fontSize: 9, color: 'rgba(118,171,174,0.45)', letterSpacing: '.1em' }}>3D · LIVE</span>
            </div>
            <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--fb)', fontSize: 9, fontWeight: 700, letterSpacing: '.22em', color: 'rgba(118,171,174,0.45)', textTransform: 'uppercase', whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none' }}>SyncUp · Live Network · v2.4.1</div>
        </div>
    );
}

function ParallaxFeatureCard({ feature, index, isVisible }) {
    const cardRef = useRef(null), rafRef = useRef(null), cur = useRef({ x: 0, y: 0 }), tgt = useRef({ x: 0, y: 0 }), iconRef = useRef(null), titleRef = useRef(null), descRef = useRef(null);
    const [settled, setSettled] = useState(false);
    useEffect(() => { if (!isVisible) return; const t = setTimeout(() => setSettled(true), index * 110 + 700); return () => clearTimeout(t); }, [isVisible, index]);
    useEffect(() => {
        if (!settled) return;
        const card = cardRef.current; if (!card) return;
        const onMove = e => { const r = card.getBoundingClientRect(); tgt.current = { x: ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * -10, y: ((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 10 }; };
        const onLeave = () => { tgt.current = { x: 0, y: 0 }; };
        const tick = () => { cur.current.x += (tgt.current.x - cur.current.x) * 0.08; cur.current.y += (tgt.current.y - cur.current.y) * 0.08; const { x, y } = cur.current; card.style.transform = `perspective(900px) rotateX(${x}deg) rotateY(${y}deg) translateZ(4px)`; if (iconRef.current) iconRef.current.style.transform = `translate(${y * 0.3}px,${x * -0.3}px) scale(1.05)`; if (titleRef.current) titleRef.current.style.transform = `translate(${y * 0.15}px,${x * -0.15}px)`; if (descRef.current) descRef.current.style.transform = `translate(${y * 0.07}px,${x * -0.07}px)`; rafRef.current = requestAnimationFrame(tick); };
        card.addEventListener("mousemove", onMove); card.addEventListener("mouseleave", onLeave); rafRef.current = requestAnimationFrame(tick);
        return () => { card.removeEventListener("mousemove", onMove); card.removeEventListener("mouseleave", onLeave); cancelAnimationFrame(rafRef.current); };
    }, [settled]);
    return (
        <div style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(52px)", transition: `opacity .65s cubic-bezier(.22,1,.36,1) ${index * 0.11}s, transform .65s cubic-bezier(.22,1,.36,1) ${index * 0.11}s` }}>
            <div ref={cardRef} className="glass feat-card feat-card-float" style={{ transformOrigin: "center center", transformStyle: "preserve-3d", cursor: "default", position: "relative", overflow: "hidden", transition: settled ? "box-shadow .3s, border-color .3s" : "none" }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: "linear-gradient(135deg,rgba(118,171,174,0.04) 0%,transparent 55%)", pointerEvents: "none", zIndex: 0 }} />
                <div ref={iconRef} className="feat-icon feat-icon-glow" style={{ position: "relative", zIndex: 1, transition: "transform .1s" }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={feature.path} /></svg></div>
                <h3 ref={titleRef} style={{ position: "relative", zIndex: 1, fontFamily: "var(--fd)", fontSize: 20, fontWeight: 400, color: "var(--t1)", marginBottom: 10, transition: "transform .1s" }}>{feature.title}</h3>
                <p ref={descRef} style={{ position: "relative", zIndex: 1, fontSize: "13.5px", color: "var(--t2)", lineHeight: 1.7, transition: "transform .1s" }}>{feature.desc}</p>
            </div>
        </div>
    );
}

function FlipCard({ src, index, target }) {
    return (
        <motion.div animate={{ x: target.x, y: target.y, rotate: target.rotation, scale: target.scale, opacity: target.opacity }} transition={{ type: "spring", stiffness: 40, damping: 15 }} style={{ position: "absolute", width: IMG_W, height: IMG_H, transformStyle: "preserve-3d", perspective: "1000px" }}>
            <motion.div style={{ transformStyle: "preserve-3d", width: '100%', height: '100%', position: 'relative' }} transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }} whileHover={{ rotateY: 180 }}>
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: "hidden", background: "#e8edf2", borderRadius: 12, overflow: 'hidden', boxShadow: "0 8px 28px rgba(0,0,0,0.12), 0 0 0 1px rgba(118,171,174,0.18)" }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.88 }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(118,171,174,0.06) 0%, rgba(240,242,245,0.22) 100%)" }} />
                </div>
                <div style={{ position: 'absolute', inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "linear-gradient(135deg, #f0f2f5 0%, #dde8ea 100%)", border: "1px solid rgba(118,171,174,0.25)", borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#76ABAE,#9ECDD0)", marginBottom: 8 }} />
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#76ABAE", letterSpacing: ".2em", textTransform: "uppercase" }}>SyncUp</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

function ScrollMorphHero({ onReady }) {
    const [introPhase, setIntroPhase] = useState("scatter");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef(null);
    const scrollRef = useRef(0);
    const virtualScroll = useMotionValue(0);
    useEffect(() => {
        if (!containerRef.current) return;
        const obs = new ResizeObserver(entries => { for (const e of entries) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height }); });
        obs.observe(containerRef.current);
        setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
        return () => obs.disconnect();
    }, []);
    useEffect(() => {
        const onScroll = () => {
            const v = Math.min(window.scrollY * 2.5, MAX_SCROLL);
            scrollRef.current = v;
            virtualScroll.set(v);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [virtualScroll]);
    const morphProgress = useTransform(virtualScroll, [0, 700], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });
    const scrollRotate = useTransform(virtualScroll, [700, 3000], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });
    useEffect(() => { const el = containerRef.current; if (!el) return; const onMove = e => { const rect = el.getBoundingClientRect(); mouseX.set(((e.clientX - rect.left) / rect.width * 2 - 1) * 80); }; el.addEventListener("mousemove", onMove); return () => el.removeEventListener("mousemove", onMove); }, [mouseX]);
    useEffect(() => { const t1 = setTimeout(() => setIntroPhase("line"), 400), t2 = setTimeout(() => setIntroPhase("circle"), 2200), t3 = setTimeout(() => onReady?.(), 2800); return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); }; }, [onReady]);
    const [morphVal, setMorphVal] = useState(0), [rotateVal, setRotateVal] = useState(0), [parallaxVal, setParallaxVal] = useState(0);
    useEffect(() => { const u1 = smoothMorph.on("change", setMorphVal), u2 = smoothScrollRotate.on("change", setRotateVal), u3 = smoothMouseX.on("change", setParallaxVal); return () => { u1(); u2(); u3(); }; }, [smoothMorph, smoothScrollRotate, smoothMouseX]);
    const contentOpacity = useTransform(smoothMorph, [0.75, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.75, 1], [24, 0]);
    const scatterPos = useMemo(() => HERO_IMAGES.map(() => ({ x: (Math.random() - 0.5) * 1600, y: (Math.random() - 0.5) * 1000, rotation: (Math.random() - 0.5) * 200, scale: 0.5, opacity: 0 })), []);
    return (
        <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "var(--hero-bg)" }}>
            <div className="hero-grid-overlay" />
            <div style={{ position: "absolute", top: "20%", left: "30%", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(118,171,174,0.10) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 0, pointerEvents: "none" }}>
                <motion.h1 initial={{ opacity: 0, y: 20, filter: "blur(10px)" }} animate={introPhase === "circle" && morphVal < 0.5 ? { opacity: 1 - morphVal * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }} transition={{ duration: 1 }} style={{ fontFamily: "var(--fd)", fontSize: "clamp(2.2rem, 5vw, 4.5rem)", fontWeight: 400, color: "var(--t1)", textAlign: "center", lineHeight: 1.1 }}>
                    Work <em style={{ fontStyle: "italic", color: "#76ABAE" }}>Together.</em>
                </motion.h1>
            </div>
            <motion.div style={{ opacity: contentOpacity, y: contentY, position: "absolute", top: "8%", left: 0, right: 0, zIndex: 15, pointerEvents: morphVal > 0.85 ? "all" : "none", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 24px" }}>
                <p style={{ fontFamily: "var(--fb)", fontSize: 11, fontWeight: 700, letterSpacing: ".28em", textTransform: "uppercase", color: "rgba(118,171,174,0.85)", marginBottom: 14 }}>Real-time team collaboration</p>
                <h1 style={{ fontFamily: "var(--fd)", fontSize: "clamp(2.8rem, 6vw, 5.5rem)", fontWeight: 400, color: "var(--t1)", lineHeight: 1.05, marginBottom: 28 }}>Work <em style={{ fontStyle: "italic", color: "#76ABAE" }}>Together.</em></h1>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <Link to="/register" className="btn btn-p" style={{ padding: "13px 28px", borderRadius: 13, fontSize: 14, textDecoration: "none" }}>Get Started Free <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
                    <button className="btn btn-s" style={{ padding: "13px 28px", borderRadius: 13, fontSize: 14 }}>Watch demo</button>
                </div>
            </motion.div>
            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {HERO_IMAGES.slice(0, TOTAL_IMAGES).map((src, i) => {
                    let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };
                    if (introPhase === "scatter") { target = scatterPos[i]; }
                    else if (introPhase === "line") { const spacing = IMG_W + 14, total = TOTAL_IMAGES * spacing; target = { x: i * spacing - total / 2, y: 0, rotation: 0, scale: 1, opacity: 1 }; }
                    else {
                        const { width: W, height: H } = containerSize, isMobile = W < 768, minDim = Math.min(W, H), cRadius = Math.min(minDim * 0.32, 300), cAngle = (i / TOTAL_IMAGES) * 360, cRad = (cAngle * Math.PI) / 180, circlePos = { x: Math.cos(cRad) * cRadius, y: Math.sin(cRad) * cRadius, rotation: cAngle + 90 };
                        const baseRadius = Math.min(W, H * 1.5), arcRadius = baseRadius * (isMobile ? 1.45 : 1.15), arcApexY = H * (isMobile ? 0.38 : 0.28), arcCenterY = arcApexY + arcRadius, spreadAngle = isMobile ? 105 : 135, startAngle = -90 - spreadAngle / 2, step = spreadAngle / (TOTAL_IMAGES - 1), scrollProgress = Math.min(Math.max(rotateVal / 360, 0), 1), curAngle = startAngle + i * step + (-scrollProgress * spreadAngle * 0.8), arcRad = (curAngle * Math.PI) / 180, arcPos = { x: Math.cos(arcRad) * arcRadius + parallaxVal, y: Math.sin(arcRad) * arcRadius + arcCenterY, rotation: curAngle + 90, scale: isMobile ? 1.5 : 1.9 };
                        target = { x: lerp(circlePos.x, arcPos.x, morphVal), y: lerp(circlePos.y, arcPos.y, morphVal), rotation: lerp(circlePos.rotation, arcPos.rotation, morphVal), scale: lerp(1, arcPos.scale, morphVal), opacity: 1 };
                    }
                    return <FlipCard key={i} src={src} index={i} target={target} />;
                })}
            </div>
            <motion.div style={{ position: "absolute", bottom: 38, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, fontFamily: "var(--fb)", fontSize: 11, fontWeight: 600, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--t3)", pointerEvents: "none", zIndex: 20 }} animate={morphVal > 0.5 ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.5 }}>
                <span>Scroll to explore</span>
                <div style={{ width: 1, height: 40, background: "linear-gradient(180deg, #76ABAE, transparent)", animation: "arrPulse 2s ease-in-out infinite" }} />
            </motion.div>
        </div>
    );
}

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

function ShaderAnimation() {
    const containerRef = useRef(null), sceneRef = useRef(null);
    useEffect(() => {
        const container = containerRef.current; if (!container) return;
        const camera = new THREE.Camera(); camera.position.z = 1;
        const scene = new THREE.Scene(), geometry = new THREE.PlaneGeometry(2, 2);
        const uniforms = { time: { value: 1.0 }, resolution: { value: new THREE.Vector2() } };
        const material = new THREE.ShaderMaterial({ uniforms, vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`, fragmentShader: `precision highp float; uniform vec2 resolution; uniform float time; void main(void) { vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y); float t = time * 0.05; float lineWidth = 0.002; vec3 color = vec3(0.0); for(int j = 0; j < 3; j++){ for(int i = 0; i < 5; i++){ color[j] += lineWidth * float(i*i) / abs(fract(t - 0.01*float(j) + float(i)*0.01)*5.0 - length(uv) + mod(uv.x + uv.y, 0.2)); } } gl_FragColor = vec4(color[0]*0.47, color[1]*0.67, color[2]*0.68, 1.0); }` });
        scene.add(new THREE.Mesh(geometry, material));
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", position: "absolute", top: "0", left: "0" });
        container.appendChild(renderer.domElement);
        const resize = () => { const w = container.clientWidth, h = container.clientHeight; renderer.setSize(w, h); uniforms.resolution.value.x = renderer.domElement.width; uniforms.resolution.value.y = renderer.domElement.height; };
        resize(); window.addEventListener("resize", resize, { passive: true });
        sceneRef.current = { animId: 0 };
        const animate = () => { sceneRef.current.animId = requestAnimationFrame(animate); uniforms.time.value += 0.05; renderer.render(scene, camera); };
        animate();
        return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(sceneRef.current?.animId); if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); renderer.dispose(); geometry.dispose(); material.dispose(); };
    }, []);
    return <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden", position: "relative" }} />;
}

function ZoomParallax({ images }) {
    const outerRef = useRef(null), layerRefs = useRef([]), rafRef = useRef(null);
    const SCALES = [4, 5, 6, 5, 6, 8, 9];
    const OFFSETS = [{}, { top: "-30vh", left: "5vw", height: "30vh", width: "35vw" }, { top: "-10vh", left: "-25vw", height: "45vh", width: "20vw" }, { top: "0", left: "27.5vw", height: "25vh", width: "25vw" }, { top: "27.5vh", left: "5vw", height: "25vh", width: "20vw" }, { top: "27.5vh", left: "-22.5vw", height: "25vh", width: "30vw" }, { top: "22.5vh", left: "25vw", height: "15vh", width: "15vw" }];
    useEffect(() => {
        const outer = outerRef.current; if (!outer) return;
        const tick = () => { const rect = outer.getBoundingClientRect(), progress = Math.max(0, Math.min(1, -rect.top / (outer.offsetHeight - window.innerHeight))); layerRefs.current.forEach((layer, i) => { if (layer) layer.style.transform = `scale(${1 + progress * (SCALES[i % SCALES.length] - 1)})`; }); rafRef.current = requestAnimationFrame(tick); };
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);
    return (
        <div ref={outerRef} style={{ position: "relative", height: "300vh" }}>
            <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
                {images.map((img, i) => {
                    const off = OFFSETS[i] || {};
                    return (
                        <div key={i} ref={el => layerRefs.current[i] = el} style={{ position: "absolute", top: 0, left: 0, display: "flex", height: "100%", width: "100%", alignItems: "center", justifyContent: "center", transformOrigin: "center center", willChange: "transform" }}>
                            <div style={{ position: "relative", height: off.height || "25vh", width: off.width || "25vw", top: off.top || "0", left: off.left || "0", overflow: "hidden", borderRadius: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)", border: "1px solid rgba(118,171,174,0.20)" }}>
                                <img src={img.src} alt={img.label} style={{ height: "100%", width: "100%", objectFit: "cover", display: "block" }} />
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(0deg, rgba(26,32,37,0.78), transparent)", padding: "12px 14px 10px", fontFamily: "var(--fb)", fontSize: "10px", fontWeight: 600, letterSpacing: ".12em", color: "var(--accent2)", textTransform: "uppercase" }}>{img.label}</div>
                            </div>
                        </div>
                    );
                })}
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none", textAlign: "center" }}>
                    <span style={{ fontFamily: "var(--fb)", fontSize: "10px", fontWeight: 700, letterSpacing: ".3em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>Real Teams · Real Results</span>
                    <h2 style={{ fontFamily: "var(--fd)", fontSize: "clamp(2.4rem,6vw,5rem)", fontWeight: 400, letterSpacing: "-0.025em", lineHeight: 1.05, color: "var(--t1)", maxWidth: 700, textShadow: "0 2px 24px rgba(240,242,245,0.7)" }}>Where great work<br /><em style={{ fontStyle: "italic", color: "var(--accent)" }}>happens together</em></h2>
                </div>
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 70% at center, transparent 20%, rgba(240,242,245,0.55) 100%)" }} />
            </div>
        </div>
    );
}

function FeaturesSection() {
    const sectionRef = useRef(null);
    const [visibleCards, setVisibleCards] = useState(new Set());
    const [headingVisible, setHeadingVisible] = useState(false);
    const [panelVisible, setPanelVisible] = useState(false);
    useEffect(() => {
        const el = sectionRef.current; if (!el) return;
        const headObs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setHeadingVisible(true); setPanelVisible(true); headObs.disconnect(); } }, { threshold: 0.05 });
        headObs.observe(el);
        const cardObs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { setVisibleCards(prev => new Set([...prev, parseInt(e.target.dataset.cardIdx)])); cardObs.unobserve(e.target); } }); }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" });
        const t = setTimeout(() => { el.querySelectorAll("[data-card-idx]").forEach(c => cardObs.observe(c)); }, 50);
        return () => { headObs.disconnect(); cardObs.disconnect(); clearTimeout(t); };
    }, []);
    return (
        <section className="section" id="features" ref={sectionRef} style={{ position: "relative", background: "var(--bg)" }}>
            <div className="blob" style={{ width: 500, height: 500, background: "radial-gradient(circle,rgba(118,171,174,0.08) 0%,transparent 70%)", top: -100, left: -100 }} />
            <div className="container" style={{ position: "relative", zIndex: 1 }}>
                <div style={{ textAlign: "center" }}>
                    <span className={`section-label s-reveal${headingVisible ? " in" : ""}`}>Platform</span>
                    <h2 className={`section-h s-reveal${headingVisible ? " in" : ""}`} style={{ transitionDelay: "0.12s" }}>Everything your <em>team needs</em></h2>
                    <p className={`s-reveal${headingVisible ? " in" : ""}`} style={{ fontSize: 16, color: "var(--t2)", maxWidth: 480, margin: "0 auto", lineHeight: 1.65, transitionDelay: "0.22s" }}>Six core capabilities designed to eliminate friction and amplify your team's velocity.</p>
                </div>
                <div className="features-split-layout">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                        {FEATURES.map((f, i) => (<div key={i} data-card-idx={i}><ParallaxFeatureCard feature={f} index={i} isVisible={visibleCards.has(i)} /></div>))}
                    </div>
                    <div className="features-right-col" style={{ opacity: panelVisible ? 1 : 0, transform: panelVisible ? 'translateX(0)' : 'translateX(40px)', transition: 'opacity .9s cubic-bezier(.22,1,.36,1) .4s, transform .9s cubic-bezier(.22,1,.36,1) .4s' }}>
                        <SplineScene3D />
                    </div>
                </div>
            </div>
        </section>
    );
}

function LiquidGlassNavbar({ navbarRef, onNavClick }) {
    return (
        <div className="lg-navbar" ref={navbarRef}>
            <div className="glass-effect-wrapper lg-navbar-pill">
                <div className="glass-blur-layer" /><div className="glass-white-layer" /><div className="glass-shine-layer" />
                <div className="glass-content" style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 28, flexShrink: 0 }}><Logo size={26} id="lg-nav-logo" /><span style={{ fontFamily: "var(--fd)", fontSize: 19, color: "var(--t1)" }}>SyncUp</span></div>
                    <div style={{ display: "flex", gap: 24, flex: 1 }}>{[["Features", "features"], ["Stats", "stats"], ["Pricing", "pricing"]].map(([label, id]) => (<button key={label} className="lg-nav-link" style={{ padding: 0 }} onClick={() => onNavClick(id)}>{label}</button>))}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 8, flexShrink: 0 }}>
                        <Link to="/login" className="btn btn-s" style={{ fontSize: 13, padding: "7px 16px", textDecoration: "none" }}>Login</Link>
                        <Link to="/register" className="btn btn-p" style={{ fontSize: 13, padding: "7px 16px", textDecoration: "none" }}>Get Started <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LandingPage() {
    const cursorRef = useRef(null), cursorPos = useRef({ x: -100, y: -100 }), cursorTarget = useRef({ x: -100, y: -100 }), cursorRaf = useRef(null), navbarRef = useRef(null), progRef = useRef(null), obsRef = useRef(null), statCounterObsRef = useRef(null), countersStarted = useRef(false);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        setDarkMode(mq.matches);
        const h = e => setDarkMode(e.matches);
        mq.addEventListener('change', h);
        return () => mq.removeEventListener('change', h);
    }, []);

    useEffect(() => {
        if (darkMode) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [darkMode]);

    useEffect(() => {
        const el = document.createElement("style"); el.id = "su-lp-styles"; el.textContent = GLOBAL_CSS;
        if (!document.getElementById("su-lp-styles")) document.head.appendChild(el);
        return () => document.getElementById("su-lp-styles")?.remove();
    }, []);

    const showNavbar = useCallback(() => {
        const nav = navbarRef.current; if (!nav) return;
        nav.classList.add("visible");
        requestAnimationFrame(() => { nav.style.transform = "translateX(-50%) translateY(0)"; nav.style.opacity = "1"; });
        triggerRevealAnimations();
    }, []);

    useEffect(() => {
        const cursor = cursorRef.current; if (!cursor) return;
        const onMove = e => { cursorTarget.current = { x: e.clientX, y: e.clientY }; };
        const onOver = e => { if (e.target.closest("a,button,.btn,.lg-nav-link")) cursor.classList.add("big"); };
        const onOut = e => { if (e.target.closest("a,button,.btn,.lg-nav-link")) cursor.classList.remove("big"); };
        window.addEventListener("mousemove", onMove, { passive: true }); document.addEventListener("mouseover", onOver, { passive: true }); document.addEventListener("mouseout", onOut, { passive: true });
        const loop = () => { const c = cursorPos.current, t = cursorTarget.current; c.x += (t.x - c.x) * 0.13; c.y += (t.y - c.y) * 0.13; cursor.style.left = c.x + "px"; cursor.style.top = c.y + "px"; cursorRaf.current = requestAnimationFrame(loop); };
        cursorRaf.current = requestAnimationFrame(loop);
        return () => { cancelAnimationFrame(cursorRaf.current); window.removeEventListener("mousemove", onMove); document.removeEventListener("mouseover", onOver); document.removeEventListener("mouseout", onOut); };
    }, []);

    useEffect(() => {
        const h = e => { const btn = e.target.closest(".btn"); if (!btn) return; const r = document.createElement("span"); r.className = "ripple"; const rect = btn.getBoundingClientRect(), sz = Math.max(rect.width, rect.height); Object.assign(r.style, { width: sz + "px", height: sz + "px", left: e.clientX - rect.left - sz / 2 + "px", top: e.clientY - rect.top - sz / 2 + "px" }); btn.appendChild(r); setTimeout(() => r.remove(), 750); };
        document.addEventListener("click", h, { passive: true }); return () => document.removeEventListener("click", h);
    }, []);

    useEffect(() => {
        const onScroll = () => { const nav = navbarRef.current; if (nav) nav.classList.toggle("compact", window.scrollY > 60); const prog = progRef.current; if (prog) { const d = document.documentElement; prog.style.width = Math.min(d.scrollTop / (d.scrollHeight - d.clientHeight) * 100, 100) + "%"; } };
        window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const triggerRevealAnimations = () => {
        if (obsRef.current) obsRef.current.disconnect();
        obsRef.current = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); obsRef.current?.unobserve(e.target); } }); }, { threshold: 0.12 });
        setTimeout(() => { document.querySelectorAll(".s-reveal,.card-reveal,.scale-reveal").forEach(el => obsRef.current?.observe(el)); startCounters(); }, 200);
    };

    const startCounters = () => {
        if (countersStarted.current) return; countersStarted.current = true;
        if (statCounterObsRef.current) statCounterObsRef.current.disconnect();
        statCounterObsRef.current = new IntersectionObserver(entries => {
            entries.forEach(e => { if (!e.isIntersecting) return; const i = parseInt(e.target.dataset.idx), s = STATS[i], el = document.getElementById(`sv-${i}`); if (!el) return; let start = null; const step = ts => { if (!start) start = ts; const p = Math.min((ts - start) / 2400, 1), ease = 1 - Math.pow(1 - p, 3); el.textContent = (ease * s.val).toFixed(s.dec) + s.suf; if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); statCounterObsRef.current?.unobserve(e.target); });
        }, { threshold: 0.5 });
        STATS.forEach((_, i) => { const el = document.getElementById(`sc-${i}`); if (el) { el.dataset.idx = i; statCounterObsRef.current?.observe(el); } });
    };

    useEffect(() => () => { obsRef.current?.disconnect(); statCounterObsRef.current?.disconnect(); }, []);
    const handleNavClick = useCallback((id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);

    return (
        <>
            <GlassFilter />
            <div id="su-cursor" ref={cursorRef} />
            <div id="su-prog" ref={progRef} />
            {/* Theme toggle */}
            <button id="theme-toggle" onClick={() => setDarkMode(d => !d)} title="Toggle theme">
                {darkMode ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                )}
            </button>
            <LiquidGlassNavbar navbarRef={navbarRef} onNavClick={handleNavClick} />
            <div className="hero-section"><ScrollMorphHero onReady={showNavbar} /></div>

            <section className="section" style={{ padding: "80px 24px 60px", textAlign: "center", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
                <div className="container" style={{ maxWidth: 720 }}>
                    <p className="s-reveal" style={{ fontSize: 18, color: "var(--t2)", lineHeight: 1.7, marginBottom: 36 }}>A unified digital workspace for modern teams. Channels, messages, files, and activity — all beautifully synced in real time.</p>
                    <div className="s-reveal" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                        <div style={{ display: "flex" }}>{["#76ABAE", "#9ECDD0", "#5A9396", "#4A8082"].map((c, i) => (<div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid var(--surface)", marginLeft: i > 0 ? -9 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{String.fromCharCode(65 + i)}</div>))}</div>
                        <span style={{ color: "var(--accent)", fontSize: 13 }}>★★★★★</span>
                        <span style={{ fontSize: 13, color: "var(--t3)" }}>2,000+ teams worldwide</span>
                    </div>
                </div>
            </section>

            <FeaturesSection />

            <section className="section" id="stats" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
                <div className="container">
                    <div style={{ textAlign: "center" }}><h2 className="section-h s-reveal">Built for scale. <em>Designed for speed.</em></h2></div>
                    <div className="stats-grid">{STATS.map((s, i) => (<div key={i} id={`sc-${i}`} className="glass stat-card scale-reveal" style={{ transitionDelay: `${i * 0.1}s` }}><div id={`sv-${i}`} className="stat-val">0{s.suf}</div><div className="stat-lbl">{s.label}</div></div>))}</div>
                </div>
            </section>

            <div className="marquee-section" style={{ background: "var(--bg)" }}>
                <div style={{ maxWidth: 1160, margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
                    <span className="section-label s-reveal">Testimonials</span>
                    <h2 className="section-h s-reveal">Loved by teams <em>worldwide</em></h2>
                </div>
                {[TESTIMONIALS, [...TESTIMONIALS].reverse()].map((row, ri) => (
                    <div key={ri} className="marquee-row" style={{ marginTop: ri === 1 ? 16 : 0 }}>
                        <div className={`marquee-inner${ri === 1 ? " rev" : ""}`}>
                            {[...row, ...row].map((t, i) => (<div key={i} className="glass tcard"><div style={{ color: "var(--accent)", fontSize: 12 }}>★★★★★</div><p>"{t.quote}"</p><div className="tcard-author"><div className="tcard-av">{t.name[0]}</div><div><div className="tcard-name">{t.name}</div><div className="tcard-role">{t.role}</div></div></div></div>))}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
                <div style={{ padding: "80px 24px 40px", textAlign: "center" }}>
                    <span className="section-label s-reveal">In Action</span>
                    <h2 className="section-h s-reveal" style={{ maxWidth: 600, margin: "0 auto" }}>See what's possible <em>with your team</em></h2>
                </div>
                <ZoomParallax images={PARALLAX_IMAGES} />
            </div>

            <section className="section" id="pricing" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
                <div className="container">
                    <div style={{ textAlign: "center" }}>
                        <span className="section-label s-reveal">Pricing</span>
                        <h2 className="section-h s-reveal">Simple, transparent <em>pricing</em></h2>
                        <p className="s-reveal" style={{ fontSize: 15, color: "var(--t2)", maxWidth: 420, margin: "0 auto" }}>No hidden fees. Upgrade or downgrade at any time.</p>
                    </div>
                    <div className="pricing-grid">
                        {PRICING.map((p, i) => (
                            <div key={i} className={`glass pricing-card card-reveal${p.featured ? " featured" : ""}`} style={{ position: "relative", transitionDelay: `${i * 0.12}s` }}>
                                {p.featured && <span className="pricing-badge">MOST POPULAR</span>}
                                <div className="pricing-tier">{p.tier}</div>
                                <div style={{ display: "flex", alignItems: "baseline", marginBottom: 8 }}><span className="pricing-price">{p.price}</span><span className="pricing-period">{p.period}</span></div>
                                <p className="pricing-desc">{p.desc}</p>
                                <div className="pricing-features">{p.features.map(f => (<div key={f} className="feat-row"><div className="check-box"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div><span>{f}</span></div>))}</div>
                                <Link to="/register" className={`btn ${p.featured ? "btn-p" : "btn-s"}`} style={{ width: "100%", padding: "12px 20px", borderRadius: 12, fontSize: 14, justifyContent: "center", textDecoration: "none" }}>{p.cta}{p.featured && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}</Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="shader-cta-section" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="shader-canvas-wrap"><ShaderAnimation /></div>
                <div className="shader-cta-content" style={{ textAlign: "center" }}>
                    <div style={{ maxWidth: 700, margin: "0 auto" }}>
                        <span className="section-label" style={{ display: "block", marginBottom: 20 }}>Get Started Today</span>
                        <h2 className="section-h" style={{ fontSize: "clamp(2.6rem,6vw,4.4rem)", marginBottom: 22 }}>Ready to transform<br /><em>how your team works?</em></h2>
                        <p style={{ fontSize: 17, color: "var(--t2)", maxWidth: 460, margin: "0 auto 48px", lineHeight: 1.7 }}>Join 2,000+ teams already on SyncUp. Free forever for small teams — no credit card required.</p>
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
                            <Link to="/register" className="btn btn-p" style={{ padding: "15px 36px", borderRadius: 13, fontSize: 16, boxShadow: "0 0 36px rgba(118,171,174,0.35)", textDecoration: "none" }}>Start for free <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
                            <button className="btn btn-s" style={{ padding: "15px 36px", borderRadius: 13, fontSize: 16, backdropFilter: "blur(12px)" }}>Book a demo</button>
                        </div>
                        <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
                            {["No credit card required", "Free forever plan", "Setup in 2 minutes"].map(t => (<div key={t} style={{ display: "flex", alignItems: "center", gap: 7 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg><span style={{ fontSize: 13, color: "var(--t2)" }}>{t}</span></div>))}
                        </div>
                    </div>
                </div>
            </section>

            <footer>
                <div className="container">
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}><Logo size={24} id="ft-logo-g" /><span style={{ fontFamily: "var(--fd)", fontSize: 18, color: "var(--t1)" }}>SyncUp</span></div>
                            <p style={{ fontSize: 13, color: "var(--t3)", lineHeight: 1.75, maxWidth: 200 }}>Real-time collaboration for modern, fast-moving teams.</p>
                        </div>
                        {[{ head: "Product", items: ["Features", "Pricing", "Security", "Changelog", "API"] }, { head: "Company", items: ["About", "Blog", "Careers", "Press", "Contact"] }, { head: "Legal", items: ["Privacy", "Terms", "Cookies", "DPA", "Security"] }].map(col => (
                            <div key={col.head}><h4 style={{ fontFamily: "var(--fb)", fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--t1)', marginBottom: 16 }}>{col.head}</h4><ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>{col.items.map(item => <li key={item}><a href="#" style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'none' }}>{item}</a></li>)}</ul></div>
                        ))}
                    </div>
                    <div className="footer-bottom"><span>© 2025 SyncUp Workspace, Inc.</span><span>Crafted with precision ◈</span></div>
                </div>
            </footer>
        </>
    );
}
