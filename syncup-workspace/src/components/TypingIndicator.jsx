import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

const TypingIndicator = ({ typingUser }) => {
  const dot1 = useRef(null);
  const dot2 = useRef(null);
  const dot3 = useRef(null);

  useEffect(() => {
    if (!typingUser) return;

    const dots = [dot1.current, dot2.current, dot3.current];
    const tl = gsap.timeline({ repeat: -1 });

    tl.to(dots, {
      y: -6,
      duration: 0.35,
      ease: 'power2.out',
      stagger: { each: 0.12 },
    })
    .to(dots, {
      y: 0,
      duration: 0.35,
      ease: 'power2.in',
      stagger: { each: 0.12 },
    }, '-=0.5');

    return () => tl.kill();
  }, [typingUser]);

  if (!typingUser) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-sm text-slate-500 dark:text-[#EEEEEE]/50 italic">
        {typingUser} is typing
      </span>
      <div className="flex items-center gap-1">
        <span ref={dot1} className="w-1.5 h-1.5 bg-blue-500 dark:bg-[#76ABAE] rounded-full inline-block" />
        <span ref={dot2} className="w-1.5 h-1.5 bg-blue-500 dark:bg-[#76ABAE] rounded-full inline-block" />
        <span ref={dot3} className="w-1.5 h-1.5 bg-blue-500 dark:bg-[#76ABAE] rounded-full inline-block" />
      </div>
    </div>
  );
};

export default TypingIndicator;
