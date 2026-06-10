import React from "react";

const base64Cache = new Map();

export const getLogoBase64Url = (options = {}) => {
  const {
    primaryColor = "#004ea8",
    secondaryColor = "#00f2ff",
    glowColor = "#d4f9ff",
    shadowColor = "#00081a",
  } = options;

  const cacheKey = `${primaryColor}_${secondaryColor}_${glowColor}_${shadowColor}`;

  if (base64Cache.has(cacheKey)) {
    return base64Cache.get(cacheKey);
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <defs>
      <filter id="glass-shadow-custom-b64" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="24" result="blur" />
        <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.22 0" />
      </filter>
      <filter id="caustic-glow-custom-b64" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="12" result="blur" />
      </filter>
      <linearGradient id="crystal-body-primary-b64" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${shadowColor}" />
        <stop offset="25%" stop-color="${primaryColor}" />
        <stop offset="65%" stop-color="${secondaryColor}" />
        <stop offset="90%" stop-color="${glowColor}" />
        <stop offset="100%" stop-color="${primaryColor}" />
      </linearGradient>
      <linearGradient id="crystal-body-secondary-b64" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${glowColor}" />
        <stop offset="30%" stop-color="${secondaryColor}" />
        <stop offset="75%" stop-color="${primaryColor}" />
        <stop offset="100%" stop-color="${shadowColor}" />
      </linearGradient>
      <linearGradient id="inner-refraction-b64" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0" />
        <stop offset="50%" stop-color="${secondaryColor}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95" />
      </linearGradient>
      <linearGradient id="facet-overlay-b64" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="55%" stop-color="${secondaryColor}" stop-opacity="0.1" />
        <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.45" />
      </linearGradient>
      <radialGradient id="sparkle-flare-b64" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
        <stop offset="25%" stop-color="${glowColor}" stop-opacity="0.85" />
        <stop offset="60%" stop-color="${secondaryColor}" stop-opacity="0.25" />
        <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <g transform="translate(12, 42)">
      <g filter="url(#glass-shadow-custom-b64)" opacity="0.9">
        <path d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480" fill="none" stroke="${shadowColor}" stroke-width="54" stroke-linecap="round" />
        <path d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600" fill="none" stroke="${shadowColor}" stroke-width="56" stroke-linecap="round" />
        <path transform="translate(620, 195)" d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z" fill="none" stroke="${shadowColor}" stroke-width="22" stroke-linejoin="round" />
      </g>
      <g filter="url(#caustic-glow-custom-b64)" opacity="0.65">
        <path d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480" fill="none" stroke="${secondaryColor}" stroke-width="44" stroke-linecap="round" />
        <path d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600" fill="none" stroke="${primaryColor}" stroke-width="46" stroke-linecap="round" />
        <path transform="translate(620, 195)" d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z" fill="none" stroke="${primaryColor}" stroke-width="18" stroke-linejoin="round" />
      </g>
      <g>
        <path d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480" fill="none" stroke="url(#crystal-body-primary-b64)" stroke-width="38" stroke-linecap="round" />
        <path d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600" fill="none" stroke="url(#crystal-body-primary-b64)" stroke-width="40" stroke-linecap="round" />
        <path transform="translate(620, 195)" d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z" fill="none" stroke="url(#crystal-body-primary-b64)" stroke-width="16" stroke-linejoin="round" />
      </g>
      <g opacity="0.94">
        <path d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480" fill="none" stroke="url(#crystal-body-secondary-b64)" stroke-width="24" stroke-linecap="round" />
        <path d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600" fill="none" stroke="url(#crystal-body-secondary-b64)" stroke-width="26" stroke-linecap="round" />
        <path transform="translate(620, 195)" d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z" fill="none" stroke="url(#crystal-body-secondary-b64)" stroke-width="10" stroke-linejoin="round" />
      </g>
      <g opacity="0.88">
        <path d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480" fill="none" stroke="url(#inner-refraction-b64)" stroke-width="12" stroke-linecap="round" />
        <path d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600" fill="none" stroke="url(#inner-refraction-b64)" stroke-width="14" stroke-linecap="round" />
        <path transform="translate(620, 195)" d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z" fill="none" stroke="url(#inner-refraction-b64)" stroke-width="6" stroke-linejoin="round" />
      </g>
      <g opacity="0.55">
        <path d="M 450,280 C 515,280 550,320 535,400 L 525,395 C 540,325 505,295 450,295 Z" fill="url(#facet-overlay-b64)" />
        <path d="M 535,400 C 498,505 408,595 290,630 L 285,620 C 400,585 480,495 525,395 Z" fill="#ffffff" opacity="0.75" />
        <path d="M 320,480 C 335,380 372,295 430,285 L 425,275 C 365,290 330,385 315,480 Z" fill="${shadowColor}" />
      </g>
      <g opacity="0.96">
        <path d="M 90,240 C 130,185 205,215 185,295 C 165,355 125,340 120,300" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
        <path d="M 145,250 C 165,255 190,270 210,305 C 240,345 268,410 300,470" fill="none" stroke="${glowColor}" stroke-width="4" stroke-linecap="round" />
        <path d="M 328,420 C 338,340 375,290 440,290 C 500,290 532,310 522,370" fill="none" stroke="#ffffff" stroke-width="5.5" stroke-linecap="round" />
        <path d="M 522,370 C 492,470 405,560 288,610" fill="none" stroke="${glowColor}" stroke-width="4.5" stroke-linecap="round" />
        <path d="M 240,630 C 230,615 238,600 265,590" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" />
        <path transform="translate(620, 195)" d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" opacity="0.9" />
      </g>
      <g transform="translate(285, 605)">
        <circle cx="0" cy="0" r="35" fill="url(#sparkle-flare-b64)" />
        <path d="M 0,-52 Q 0,0 52,0 Q 0,0 0,52 Q 0,0 -52,0 Q 0,0 0,-52 Z" fill="#ffffff" />
        <path d="M 0,-24 Q 0,0 24,0 Q 0,0 0,24 Q 0,0 -24,0 Q 0,0 0,-24 Z" transform="rotate(45)" fill="#ffffff" opacity="0.85" />
        <circle cx="0" cy="0" r="8" fill="#ffffff" />
      </g>
      <g transform="translate(475, 290)" opacity="0.8">
        <circle cx="0" cy="0" r="24" fill="url(#sparkle-flare-b64)" />
        <path d="M 0,-30 Q 0,0 30,0 Q 0,0 0,30 Q 0,0 -30,0 Q 0,0 0,-30 Z" fill="#ffffff" />
      </g>
    </g>
  </svg>`;

  const isBrowser = typeof window !== "undefined";
  const base64 = isBrowser
    ? btoa(unescape(encodeURIComponent(svgString.trim())))
    : Buffer.from(svgString).toString("base64");

  const base64Url = `data:image/svg+xml;base64,${base64}`;
  base64Cache.set(cacheKey, base64Url);

  return base64Url;
};

export const Logo = ({
  size = "100%",
  className = "",
  style = {},
  primaryColor = "#004ea8",
  secondaryColor = "#00f2ff",
  glowColor = "#d4f9ff",
  shadowColor = "#00081a",
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 800 800"
      width={size}
      height={size}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      style={{ display: "block", ...style }}
    >
      <defs>
        <filter id="glass-shadow-custom" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="24" result="blur" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.22 0"
          />
        </filter>

        <filter id="caustic-glow-custom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
        </filter>

        <linearGradient id="crystal-body-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={shadowColor} />
          <stop offset="25%" stopColor={primaryColor} />
          <stop offset="65%" stopColor={secondaryColor} />
          <stop offset="90%" stopColor={glowColor} />
          <stop offset="100%" stopColor={primaryColor} />
        </linearGradient>

        <linearGradient id="crystal-body-secondary" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={glowColor} />
          <stop offset="30%" stopColor={secondaryColor} />
          <stop offset="75%" stopColor={primaryColor} />
          <stop offset="100%" stopColor={shadowColor} />
        </linearGradient>

        <linearGradient id="inner-refraction" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0" />
          <stop offset="50%" stopColor={secondaryColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id="facet-overlay" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor={secondaryColor} stopOpacity="0.1" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0.45" />
        </linearGradient>

        <radialGradient id="sparkle-flare" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor={glowColor} stopOpacity="0.85" />
          <stop offset="60%" stopColor={secondaryColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      <g transform="translate(12, 42)">
        <g filter="url(#glass-shadow-custom)" opacity="0.9">
          <path
            d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480"
            fill="none"
            stroke={shadowColor}
            strokeWidth="54"
            strokeLinecap="round"
          />
          <path
            d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600"
            fill="none"
            stroke={shadowColor}
            strokeWidth="56"
            strokeLinecap="round"
          />
          <path
            transform="translate(620, 195)"
            d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z"
            fill="none"
            stroke={shadowColor}
            strokeWidth="22"
            strokeLinejoin="round"
          />
        </g>

        <g filter="url(#caustic-glow-custom)" opacity="0.65">
          <path
            d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480"
            fill="none"
            stroke={secondaryColor}
            strokeWidth="44"
            strokeLinecap="round"
          />
          <path
            d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600"
            fill="none"
            stroke={primaryColor}
            strokeWidth="46"
            strokeLinecap="round"
          />
          <path
            transform="translate(620, 195)"
            d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z"
            fill="none"
            stroke={primaryColor}
            strokeWidth="18"
            strokeLinejoin="round"
          />
        </g>

        <g>
          <path
            d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480"
            fill="none"
            stroke="url(#crystal-body-primary)"
            strokeWidth="38"
            strokeLinecap="round"
          />
          <path
            d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600"
            fill="none"
            stroke="url(#crystal-body-primary)"
            strokeWidth="40"
            strokeLinecap="round"
          />
          <path
            transform="translate(620, 195)"
            d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z"
            fill="none"
            stroke="url(#crystal-body-primary)"
            strokeWidth="16"
            strokeLinejoin="round"
          />
        </g>

        <g opacity="0.94">
          <path
            d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480"
            fill="none"
            stroke="url(#crystal-body-secondary)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600"
            fill="none"
            stroke="url(#crystal-body-secondary)"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <path
            transform="translate(620, 195)"
            d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z"
            fill="none"
            stroke="url(#crystal-body-secondary)"
            strokeWidth="10"
            strokeLinejoin="round"
          />
        </g>

        <g opacity="0.88">
          <path
            d="M 85,245 C 135,175 215,225 190,305 C 170,365 125,350 120,310 C 120,270 175,260 215,280 C 265,305 295,390 320,480"
            fill="none"
            stroke="url(#inner-refraction)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M 320,480 C 340,380 380,280 450,280 C 530,280 570,320 550,400 C 510,515 410,610 290,650 C 240,665 230,615 260,600"
            fill="none"
            stroke="url(#inner-refraction)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            transform="translate(620, 195)"
            d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z"
            fill="none"
            stroke="url(#inner-refraction)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
        </g>

        <g opacity="0.55">
          <path d="M 450,280 C 515,280 550,320 535,400 L 525,395 C 540,325 505,295 450,295 Z" fill="url(#facet-overlay)" />
          <path d="M 535,400 C 498,505 408,595 290,630 L 285,620 C 400,585 480,495 525,395 Z" fill="#ffffff" opacity="0.75" />
          <path d="M 320,480 C 335,380 372,295 430,285 L 425,275 C 365,290 330,385 315,480 Z" fill={shadowColor} />
        </g>

        <g opacity="0.96">
          <path
            d="M 90,240 C 130,185 205,215 185,295 C 165,355 125,340 120,300"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M 145,250 C 165,255 190,270 210,305 C 240,345 268,410 300,470"
            fill="none"
            stroke={glowColor}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 328,420 C 338,340 375,290 440,290 C 500,290 532,310 522,370"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M 522,370 C 492,470 405,560 288,610"
            fill="none"
            stroke={glowColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d="M 240,630 C 230,615 238,600 265,590"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            transform="translate(620, 195)"
            d="M 0,-35 L 8.2,-11.3 L 33.2,-10.8 L 13.3,9.7 L 20.5,33.2 L 0,14 L -20.5,33.2 L -13.3,9.7 L -33.2,-10.8 L -8.2,-11.3 Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinejoin="round"
            opacity="0.9"
          />
        </g>

        <g transform="translate(285, 605)">
          <circle cx="0" cy="0" r="35" fill="url(#sparkle-flare)" />
          <path d="M 0,-52 Q 0,0 52,0 Q 0,0 0,52 Q 0,0 -52,0 Q 0,0 0,-52 Z" fill="#ffffff" />
          <path d="M 0,-24 Q 0,0 24,0 Q 0,0 0,24 Q 0,0 -24,0 Q 0,0 0,-24 Z" transform="rotate(45)" fill="#ffffff" opacity="0.85" />
          <circle cx="0" cy="0" r="8" fill="#ffffff" />
        </g>

        <g transform="translate(475, 290)" opacity="0.8">
          <circle cx="0" cy="0" r="24" fill="url(#sparkle-flare)" />
          <path d="M 0,-30 Q 0,0 30,0 Q 0,0 0,30 Q 0,0 -30,0 Q 0,0 0,-30 Z" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
};

export default Logo;
