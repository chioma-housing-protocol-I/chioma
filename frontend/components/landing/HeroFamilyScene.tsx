'use client';

import { motion } from 'framer-motion';

/**
 * Illustrated (not photographic) golden-hour scene of a family in front of a
 * home. Bold, high-contrast silhouettes against a warm sunset sky read
 * clearly at a glance — the classic "coming home" real-estate motif.
 * Renders as a self-contained card (fills its parent), so it sits beside the
 * headline instead of behind it — no risk of the art colliding with text.
 */
export default function HeroFamilyScene() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Sunset sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, #1e1b4b 0%, #4c1d95 20%, #9d174d 42%, #ea580c 65%, #f59e0b 85%, #fbbf24 100%)',
        }}
      />

      {/* Sun glow, centered behind the roofline so the house occludes its
          core (classic golden-hour silhouette) */}
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[85%] aspect-square bg-amber-200/20 rounded-full blur-3xl" />
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[46%] aspect-square bg-amber-200/35 rounded-full blur-2xl" />
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-[20%] aspect-square bg-yellow-50/80 rounded-full blur-xl" />

      {/* Drifting clouds, warm-tinted */}
      <motion.div
        className="absolute top-[10%] left-[-15%] w-40 h-14 bg-white/20 rounded-full blur-2xl"
        animate={{ x: ['0%', '20%', '0%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[16%] right-[-15%] w-48 h-16 bg-white/15 rounded-full blur-2xl"
        animate={{ x: ['0%', '-16%', '0%'] }}
        transition={{
          duration: 50,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      {/* Scene: house + family, bold silhouettes filling the card */}
      <svg
        viewBox="0 0 800 1000"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <radialGradient id="windowGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#fdba74" stopOpacity="0.4" />
          </radialGradient>
        </defs>

        {/* Ground */}
        <path d="M0,860 Q400,810 800,860 L800,1000 L0,1000 Z" fill="#0b0f19" />

        {/* House */}
        <g transform="translate(400,330)">
          {/* Roof */}
          <path d="M-210,150 L0,-40 L210,150 Z" fill="#0b0f19" />
          {/* Body */}
          <rect x="-180" y="150" width="360" height="260" fill="#0b0f19" />
          {/* Chimney */}
          <rect x="100" y="0" width="30" height="110" fill="#0b0f19" />
          {/* Door */}
          <rect x="-35" y="290" width="70" height="120" rx="4" fill="#05070c" />
          {/* Windows, gently pulsing like warm interior light */}
          <motion.rect
            x="-135"
            y="190"
            width="55"
            height="55"
            rx="3"
            fill="url(#windowGlow)"
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.rect
            x="80"
            y="190"
            width="55"
            height="55"
            rx="3"
            fill="url(#windowGlow)"
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1.2,
            }}
          />
        </g>

        {/* Family silhouette, standing on the path in front of the door.
            A warm rim-light glow separates it from the house's own black
            fill where the two silhouettes overlap. */}
        <g
          transform="translate(240,610)"
          fill="#0b0f19"
          style={{
            filter:
              'drop-shadow(0 0 3px #fdba74) drop-shadow(0 0 10px rgba(251,191,36,0.55))',
          }}
        >
          {/* Parent 1 */}
          <g transform="translate(0,0)">
            <circle cx="0" cy="0" r="32" />
            <path d="M-42,225 Q-42,60 0,49 Q42,60 42,225 Z" />
          </g>
          {/* Child, smaller, between parents, holding hands */}
          <g transform="translate(88,72)">
            <circle cx="0" cy="0" r="20" />
            <path d="M-25,140 Q-25,37 0,30 Q25,37 25,140 Z" />
          </g>
          {/* Parent 2 */}
          <g transform="translate(196,0)">
            <circle cx="0" cy="0" r="32" />
            <path d="M-42,225 Q-42,60 0,49 Q42,60 42,225 Z" />
          </g>
          {/* Joined hands (connecting arcs) */}
          <path
            d="M33,72 Q68,104 71,110"
            stroke="#05070c"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M163,72 Q128,104 125,110"
            stroke="#05070c"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}
