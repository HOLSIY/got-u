import React, { useState, useEffect } from 'react';
import { useBranding } from '../../context/BrandingContext';
import defaultGotULogo from '../../assets/images/got_u_logo.png';

interface GotULogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  showTagline?: boolean;
  variant?: 'full' | 'header' | 'icon';
}

/**
 * High-fidelity Vector representation of the canonical 'got u' 3D brand logo.
 * Guarantees crisp, instant rendering under zero-network / fallback conditions.
 */
export const GotUVectorLogo: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="got u logo"
    >
      <defs>
        {/* Main 3D Bubble Gradient */}
        <linearGradient id="gotu_bubble_grad" x1="20" y1="20" x2="180" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff4b7d" />
          <stop offset="45%" stopColor="#ff2d60" />
          <stop offset="100%" stopColor="#d90043" />
        </linearGradient>

        {/* Gloss / Top Highlight */}
        <linearGradient id="gotu_gloss" x1="100" y1="20" x2="100" y2="110" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* Ambient Drop Shadow */}
        <filter id="gotu_shadow" x="-10%" y="-5%" width="125%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#ff2d60" floodOpacity="0.38" />
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* 3D Chat Bubble Shape with Tail */}
      <path
        d="M 46 24 
           C 28 24, 16 36, 16 54 
           L 16 128 
           C 16 146, 28 158, 46 158 
           L 62 158 
           L 54 184 
           C 52 190, 59 194, 64 190 
           L 96 158 
           L 154 158 
           C 172 158, 184 146, 184 128 
           L 184 54 
           C 184 36, 172 24, 154 24 
           Z"
        fill="url(#gotu_bubble_grad)"
        filter="url(#gotu_shadow)"
      />

      {/* Inner Gloss Overlay */}
      <path
        d="M 46 27 
           C 30 27, 20 37, 20 53 
           L 20 95 
           C 65 105, 135 105, 180 95 
           L 180 53 
           C 180 37, 170 27, 154 27 
           Z"
        fill="url(#gotu_gloss)"
      />

      {/* Brand Typography "got u" */}
      <g fill="#ffffff" style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.25))' }}>
        {/* "got" text */}
        <text
          x="44"
          y="114"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="56"
          letterSpacing="-2px"
        >
          got
        </text>

        {/* Stylized "u" */}
        <text
          x="126"
          y="114"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="56"
          letterSpacing="-1px"
          fill="#ffffff"
        >
          u
        </text>
      </g>
    </svg>
  );
};

export const GotULogo: React.FC<GotULogoProps> = ({
  className = '',
  size = 40,
  showWordmark = true,
  showTagline = true,
  variant = 'full',
}) => {
  let customLogoUrl = '';
  let appName = 'got u';
  let tagline = 'CHAT • SHARE • BE YOU';

  try {
    const brandingCtx = useBranding();
    if (brandingCtx?.branding) {
      customLogoUrl = brandingCtx.branding.logoUrl || '';
      appName = brandingCtx.branding.appName || appName;
      tagline = brandingCtx.branding.subTagline || tagline;
    }
  } catch (e) {
    // Graceful fallback if used outside BrandingProvider
  }

  // Tiered fallback strategy:
  // 1. customLogoUrl (admin uploaded logo)
  // 2. defaultGotULogo (imported canonical asset)
  // 3. /got_u_logo.png (public canonical root)
  // 4. Vector SVG fallback
  const [useFallback, setUseFallback] = useState(false);
  const [loadErrorCount, setLoadErrorCount] = useState(0);

  useEffect(() => {
    setUseFallback(false);
    setLoadErrorCount(0);
  }, [customLogoUrl]);

  // Determine current image source
  let currentSrc = '';
  if (!useFallback) {
    if (loadErrorCount === 0 && customLogoUrl) {
      currentSrc = customLogoUrl;
    } else if (loadErrorCount <= 1) {
      currentSrc = defaultGotULogo || '/got_u_logo.png';
    } else if (loadErrorCount === 2) {
      currentSrc = '/got_u_logo.png';
    }
  }

  const handleImageError = () => {
    setLoadErrorCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setUseFallback(true);
      }
      return next;
    });
  };

  return (
    <div className={`inline-flex items-center gap-2.5 shrink-0 select-none ${className}`}>
      <div
        className="relative shrink-0 flex items-center justify-center overflow-visible"
        style={{ width: size, height: size }}
      >
        {useFallback || !currentSrc ? (
          <GotUVectorLogo size={size} />
        ) : (
          <img
            key={currentSrc}
            src={currentSrc}
            alt=""
            aria-label={appName}
            referrerPolicy="no-referrer"
            onError={handleImageError}
            style={{
              width: size,
              height: size,
              objectFit: 'contain',
            }}
            className="shrink-0 transition-opacity duration-200 select-none pointer-events-none drop-shadow-xs"
          />
        )}
      </div>

      {/* Wordmark and Tagline */}
      {variant !== 'icon' && showWordmark && (
        <div className="flex flex-col justify-center select-none">
          <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0f172a] dark:text-white leading-none">
            {appName}
          </span>
          {showTagline && (
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-[#ff2d60] mt-1">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};


