// SVG Icon components — replaces emoji usage across the site for visual consistency
import { useId } from "react";

interface IconProps {
  className?: string;
  size?: number;
}

const defaults = { size: 16 };

export function IconFire({ className = "", size = defaults.size }: IconProps) {
  const id = useId();
  const gradId = `fire-grad-${id}`;
  const innerId = `fire-inner-${id}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 23C16.5 23 20 19.5 20 15.5C20 11.5 17 8 14 5.5C14 8.5 12 10.5 10 10.5C10 7.5 8 3 6 1C6 5 4 8 4 12C4 16.5 7.5 23 12 23Z" fill={`url(#${gradId})`} />
      <path d="M12 23C14.5 23 16.5 20.5 16.5 17.5C16.5 14.5 14.5 12.5 13 11C13 13 11.5 14.5 10 14.5C10 12.5 9 10 8 8.5C8 11 7.5 13 7.5 15C7.5 19.5 9.5 23 12 23Z" fill={`url(#${innerId})`} />
      <defs>
        <linearGradient id={gradId} x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
        <linearGradient id={innerId} x1="12" y1="8.5" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="1" stopColor="#FF8C00" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconRocket({ className = "", size = defaults.size }: IconProps) {
  const id = useId();
  const bodyId = `rocket-body-${id}`;
  const flameId = `rocket-flame-${id}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 7 7 7 13L9.5 16L12 14L14.5 16L17 13C17 7 12 2 12 2Z" fill={`url(#${bodyId})`} stroke="#999" strokeWidth="0.5" />
      <path d="M9.5 16L8 20L10.5 18.5L12 20L13.5 18.5L16 20L14.5 16" fill={`url(#${flameId})`} />
      <circle cx="12" cy="10" r="1.5" fill="#1a1a2e" />
      <defs>
        <linearGradient id={bodyId} x1="12" y1="2" x2="12" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8E8E8" />
          <stop offset="1" stopColor="#B0B0B0" />
        </linearGradient>
        <linearGradient id={flameId} x1="12" y1="16" x2="12" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="0.5" stopColor="#FFD700" />
          <stop offset="1" stopColor="#FF4500" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconCrown({ className = "", size = defaults.size }: IconProps) {
  const id = useId();
  const gradId = `crown-grad-${id}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 18H21V20H3V18Z" fill="#F7931A" />
      <path d="M4 18L2 8L7 12L12 6L17 12L22 8L20 18H4Z" fill={`url(#${gradId})`} />
      <circle cx="7" cy="14" r="1" fill="#1a1a2e" opacity="0.3" />
      <circle cx="12" cy="13" r="1" fill="#1a1a2e" opacity="0.3" />
      <circle cx="17" cy="14" r="1" fill="#1a1a2e" opacity="0.3" />
      <defs>
        <linearGradient id={gradId} x1="12" y1="6" x2="12" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconClock({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="#9CA3AF" strokeWidth="2" />
      <path d="M12 7V12L15 15" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChart({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20V10" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 20V4" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 20V14" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 20V8" stroke="#F7931A" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconChartLine({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 17L9 11L13 15L21 7" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7H21V11" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLobster({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      {/* Antennae */}
      <g stroke="#FF574D" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M 110 85 C 100 20 40 20 25 50" />
        <path d="M 146 85 C 156 20 216 20 231 50" />
      </g>
      {/* Side legs */}
      <g stroke="#FF574D" strokeWidth="8" strokeLinecap="round" fill="none">
        <path d="M 105 110 Q 85 105 75 115" />
        <path d="M 105 125 Q 80 125 70 135" />
        <path d="M 105 140 Q 85 145 75 155" />
        <path d="M 151 110 Q 171 105 181 115" />
        <path d="M 151 125 Q 176 125 186 135" />
        <path d="M 151 140 Q 171 145 181 155" />
      </g>
      {/* Tail segments */}
      <rect x="110" y="140" width="36" height="15" rx="7.5" fill="#FF574D" />
      <rect x="114" y="152" width="28" height="15" rx="7.5" fill="#FF574D" />
      <rect x="118" y="164" width="20" height="15" rx="7.5" fill="#FF574D" />
      {/* Tail fan */}
      <ellipse cx="108" cy="183" rx="16" ry="12" transform="rotate(-30 108 183)" fill="#FF574D" />
      <ellipse cx="148" cy="183" rx="16" ry="12" transform="rotate(30 148 183)" fill="#FF574D" />
      <circle cx="128" cy="187" r="16" fill="#FF574D" />
      {/* Arms */}
      <g stroke="#FF574D" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 105 105 L 85 90 L 75 85" />
        <path d="M 151 105 L 171 90 L 181 85" />
      </g>
      {/* Left claw */}
      <g transform="translate(75, 85) rotate(10)">
        <path d="M 0 0 C -35 0, -55 -35, -35 -60 C -25 -50, -20 -40, -15 -30 Q -10 -25, -5 -30 C 0 -40, 5 -45, 10 -50 C 20 -40, 15 -10, 0 0 Z" fill="#FF574D" />
        <path d="M -28 -45 Q -38 -20 -18 -5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
      </g>
      {/* Right claw */}
      <g transform="translate(181, 85) scale(-1, 1) rotate(10)">
        <path d="M 0 0 C -35 0, -55 -35, -35 -60 C -25 -50, -20 -40, -15 -30 Q -10 -25, -5 -30 C 0 -40, 5 -45, 10 -50 C 20 -40, 15 -10, 0 0 Z" fill="#FF574D" />
        <path d="M -28 -45 Q -38 -20 -18 -5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4" />
      </g>
      {/* Body */}
      <rect x="100" y="75" width="56" height="75" rx="28" fill="#FF574D" />
      {/* Body lines */}
      <path d="M 102 120 Q 128 130 154 120" stroke="#D9362B" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 104 135 Q 128 145 152 135" stroke="#D9362B" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      {/* Eyes */}
      <circle cx="114" cy="92" r="6" fill="#222222" />
      <circle cx="112" cy="90" r="2.5" fill="#FFFFFF" />
      <circle cx="142" cy="92" r="6" fill="#222222" />
      <circle cx="140" cy="90" r="2.5" fill="#FFFFFF" />
      {/* Cheeks */}
      <ellipse cx="106" cy="100" rx="7" ry="3.5" fill="#FF8C82" opacity="0.8" />
      <ellipse cx="150" cy="100" rx="7" ry="3.5" fill="#FF8C82" opacity="0.8" />
      {/* Smile */}
      <path d="M 123 99 Q 128 104 133 99" stroke="#222222" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Head highlight */}
      <ellipse cx="128" cy="85" rx="16" ry="5" fill="#FFFFFF" opacity="0.3" />
    </svg>
  );
}

export function IconMoney({ className = "", size = defaults.size }: IconProps) {
  const id = useId();
  const gradId = `money-grad-${id}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill={`url(#${gradId})`} />
      <path d="M12 6V18M15 9.5C15 8.12 13.66 7 12 7C10.34 7 9 8.12 9 9.5S10.34 12 12 12C13.66 12 15 13.12 15 14.5S13.66 17 12 17C10.34 17 9 15.88 9 14.5" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradId} x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconBolt({ className = "", size = defaults.size }: IconProps) {
  const id = useId();
  const gradId = `bolt-grad-${id}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" fill={`url(#${gradId})`} />
      <defs>
        <linearGradient id={gradId} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconCopy({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 8V6C16 4.9 15.1 4 14 4H6C4.9 4 4 4.9 4 6V14C4 15.1 4.9 16 6 16H8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconCheck({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 12L10 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconRefresh({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12C4 7.58 7.58 4 12 4C14.8 4 17.26 5.44 18.7 7.6L20 6V11H15L17.05 8.95C15.95 7.15 14.1 6 12 6C8.69 6 6 8.69 6 12S8.69 18 12 18C14.35 18 16.36 16.67 17.35 14.74" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconParty({ className = "", size = defaults.size }: IconProps) {
  const id = useId();
  const gradId = `party-grad-${id}`;
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20L7 9L15 17L4 20Z" fill={`url(#${gradId})`} />
      <circle cx="14" cy="5" r="1.5" fill="#FF6B35" />
      <circle cx="19" cy="8" r="1" fill="#FFD700" />
      <circle cx="17" cy="3" r="1" fill="#22C55E" />
      <path d="M9 4L10 2M20 12L22 11M18 16L20 17" stroke="#F7931A" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id={gradId} x1="4" y1="9" x2="15" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F7931A" />
          <stop offset="1" stopColor="#FF6B35" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconExternal({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 13V19C18 20.1 17.1 21 16 21H5C3.9 21 3 20.1 3 19V8C3 6.9 3.9 6 5 6H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 3H21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconShare({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function IconNoTrades({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20V14" stroke="#525252" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 20V10" stroke="#525252" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 20V16" stroke="#525252" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 20V12" stroke="#525252" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M2 2L22 22" stroke="#525252" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
