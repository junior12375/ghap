import React from 'react';
import ghacemLogoImg from '../assets/ghacem_logo.png';
import ghacemLogoFullImg from '../assets/ghacem_logo_full.png';

interface LogoProps {
  className?: string;
  size?: number | string;
  variant?: 'emblem' | 'full';
}

/**
 * Official GHACEM Emblem
 * Extracted directly from official vector PDF asset provided by user.
 * Displays the authentic circular black and gold emblem with bold wordmark.
 */
export const GhacemLogo: React.FC<LogoProps> = ({ className = 'h-10 w-10', size, variant = 'emblem' }) => {
  const style = size ? { width: size, height: size } : undefined;
  const src = variant === 'full' ? ghacemLogoFullImg : ghacemLogoImg;

  return (
    <img
      src={src}
      alt="GHACEM Official Logo - A Heidelberg Materials Company"
      className={`object-contain select-none shrink-0 ${className}`}
      style={style}
      loading="eager"
    />
  );
};

export const GhacemFullLogo: React.FC<LogoProps> = (props) => (
  <GhacemLogo {...props} variant="full" />
);

/**
 * Official Heidelberg Materials Logo
 * Features the signature dual-leaf green rounded shield icon and geometric modern brand type.
 * Grounded directly in the official brand asset provided by user.
 */
export const HeidelbergMaterialsLogo: React.FC<{
  className?: string;
  showText?: boolean;
  textColor?: string;
  iconSize?: number | string;
}> = ({ className = 'h-8', showText = true, textColor, iconSize }) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Leaf / Shield Dual-Tone Green Icon */}
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full shrink-0 aspect-square"
        style={iconSize ? { width: iconSize, height: iconSize } : undefined}
        role="img"
        aria-label="Heidelberg Materials Icon"
      >
        {/* Deep Forest Green Base Container with rounded opposite corners */}
        <path
          d="M 30 16
             C 100 16, 144 60, 144 130
             C 144 140, 136 144, 126 144
             H 30
             C 20 144, 16 140, 16 130
             V 30
             C 16 20, 20 16, 30 16 Z"
          fill="#004A2F"
        />

        {/* White Stylized Vertical Left Pillar */}
        <path
          d="M 40 40
             H 74
             V 112
             C 74 118, 70 122, 64 122
             H 40
             V 40 Z"
          fill="#FFFFFF"
        />

        {/* Electric Lime Leaf Shape on Right */}
        <path
          d="M 88 64
             C 88 56, 92 52, 100 52
             C 120 52, 132 76, 132 108
             C 132 118, 126 122, 116 122
             H 88
             V 64 Z"
          fill="#00E040"
        />
      </svg>

      {/* Typography: Heidelberg Materials */}
      {showText && (
        <div className="flex flex-col justify-center leading-[1.08] select-none">
          <span
            className="font-display font-extrabold tracking-tight text-sm sm:text-[15px]"
            style={{ color: textColor || 'currentColor' }}
          >
            Heidelberg
          </span>
          <span
            className="font-display font-bold tracking-tight text-xs sm:text-[13px] opacity-95"
            style={{ color: textColor || 'currentColor' }}
          >
            Materials
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * Co-Branded Corporate Header Component
 * Unifies GHACEM and Heidelberg Materials into an authoritative, executive header lockup.
 */
export const CorporateBrandLockup: React.FC<{
  className?: string;
  compact?: boolean;
}> = ({ className = '', compact = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* GHACEM Round Emblem */}
      <GhacemLogo className={compact ? 'h-9 w-9 shrink-0' : 'h-10 w-10 sm:h-11 sm:w-11 shrink-0 shadow-sm'} />

      {/* Brand Divider */}
      <div className="h-8 w-px bg-[var(--color-border)] shrink-0 hidden sm:block" />

      {/* Heidelberg Materials Co-Branding */}
      <div className="flex items-center gap-2">
        <HeidelbergMaterialsLogo
          className={compact ? 'h-7 sm:h-8' : 'h-8 sm:h-9'}
          textColor="var(--color-text-main)"
        />
        <div className="hidden xl:flex flex-col border-l border-[var(--color-border)] pl-2.5 ml-1">
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
            A HEIDELBERG MATERIALS COMPANY
          </span>
          <span className="font-display text-[11px] font-semibold text-[var(--color-text-muted)]">
            Permit-to-Work Portal
          </span>
        </div>
      </div>
    </div>
  );
};
