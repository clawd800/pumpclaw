// SVG Icon components — replaces emoji usage across the site for visual consistency

interface IconProps {
  className?: string;
  size?: number;
}

const defaults = { size: 16 };

export function IconFire({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 23C16.5 23 20 19.5 20 15.5C20 11.5 17 8 14 5.5C14 8.5 12 10.5 10 10.5C10 7.5 8 3 6 1C6 5 4 8 4 12C4 16.5 7.5 23 12 23Z" fill="url(#fire-grad)" />
      <path d="M12 23C14.5 23 16.5 20.5 16.5 17.5C16.5 14.5 14.5 12.5 13 11C13 13 11.5 14.5 10 14.5C10 12.5 9 10 8 8.5C8 11 7.5 13 7.5 15C7.5 19.5 9.5 23 12 23Z" fill="url(#fire-inner)" />
      <defs>
        <linearGradient id="fire-grad" x1="12" y1="1" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
        <linearGradient id="fire-inner" x1="12" y1="8.5" x2="12" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="1" stopColor="#FF8C00" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconRocket({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 7 7 7 13L9.5 16L12 14L14.5 16L17 13C17 7 12 2 12 2Z" fill="url(#rocket-body)" stroke="#999" strokeWidth="0.5" />
      <path d="M9.5 16L8 20L10.5 18.5L12 20L13.5 18.5L16 20L14.5 16" fill="url(#rocket-flame)" />
      <circle cx="12" cy="10" r="1.5" fill="#1a1a2e" />
      <defs>
        <linearGradient id="rocket-body" x1="12" y1="2" x2="12" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8E8E8" />
          <stop offset="1" stopColor="#B0B0B0" />
        </linearGradient>
        <linearGradient id="rocket-flame" x1="12" y1="16" x2="12" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="0.5" stopColor="#FFD700" />
          <stop offset="1" stopColor="#FF4500" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconCrown({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 18H21V20H3V18Z" fill="#F7931A" />
      <path d="M4 18L2 8L7 12L12 6L17 12L22 8L20 18H4Z" fill="url(#crown-grad)" />
      <circle cx="7" cy="14" r="1" fill="#1a1a2e" opacity="0.3" />
      <circle cx="12" cy="13" r="1" fill="#1a1a2e" opacity="0.3" />
      <circle cx="17" cy="14" r="1" fill="#1a1a2e" opacity="0.3" />
      <defs>
        <linearGradient id="crown-grad" x1="12" y1="6" x2="12" y2="18" gradientUnits="userSpaceOnUse">
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
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="13" rx="4" ry="5" fill="url(#lobster-body)" />
      <ellipse cx="12" cy="8" rx="3" ry="2.5" fill="url(#lobster-head)" />
      <path d="M9 8C7 5 4 4 3 5C2 6 4 7 6 8" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 8C17 5 20 4 21 5C22 6 20 7 18 8" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 5L2 3" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 5L1 5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21 5L22 3" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M21 5L23 5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 18C10 20 9 22 8 22" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 18V22" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14 18C14 20 15 22 16 22" stroke="#FF6B35" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="10.5" cy="7.5" r="0.7" fill="#1a1a2e" />
      <circle cx="13.5" cy="7.5" r="0.7" fill="#1a1a2e" />
      <defs>
        <linearGradient id="lobster-body" x1="12" y1="8" x2="12" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B35" />
          <stop offset="1" stopColor="#CC4400" />
        </linearGradient>
        <linearGradient id="lobster-head" x1="12" y1="5.5" x2="12" y2="10.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF8C55" />
          <stop offset="1" stopColor="#FF6B35" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconMoney({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" fill="url(#money-grad)" />
      <path d="M12 6V18M15 9.5C15 8.12 13.66 7 12 7C10.34 7 9 8.12 9 9.5S10.34 12 12 12C13.66 12 15 13.12 15 14.5S13.66 17 12 17C10.34 17 9 15.88 9 14.5" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="money-grad" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD700" />
          <stop offset="1" stopColor="#F7931A" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function IconBolt({ className = "", size = defaults.size }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" fill="url(#bolt-grad)" />
      <defs>
        <linearGradient id="bolt-grad" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
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
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20L7 9L15 17L4 20Z" fill="url(#party-grad)" />
      <circle cx="14" cy="5" r="1.5" fill="#FF6B35" />
      <circle cx="19" cy="8" r="1" fill="#FFD700" />
      <circle cx="17" cy="3" r="1" fill="#22C55E" />
      <path d="M9 4L10 2M20 12L22 11M18 16L20 17" stroke="#F7931A" strokeWidth="1.5" strokeLinecap="round" />
      <defs>
        <linearGradient id="party-grad" x1="4" y1="9" x2="15" y2="20" gradientUnits="userSpaceOnUse">
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
