import React from 'react';

interface MascotProps {
  mascot: 'foxy' | 'bunny' | 'panda' | 'kitty';
  size?: number;
  className?: string;
  expression?: 'happy' | 'winking' | 'celebrating' | 'teaching';
}

export const MascotVector: React.FC<MascotProps> = ({
  mascot,
  size = 120,
  className = '',
  expression = 'happy',
}) => {
  switch (mascot) {
    case 'foxy':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-300 ${className}`}
        >
          {/* Foxy the Fox - Original Vector Design */}
          <defs>
            <linearGradient id="foxy_body" x1="50" y1="50" x2="150" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F97316" />
              <stop offset="1" stopColor="#EA580C" />
            </linearGradient>
            <linearGradient id="foxy_ear_inner" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#FED7AA" />
              <stop offset="1" stopColor="#FDBA74" />
            </linearGradient>
          </defs>

          {/* Bushy Tail behind */}
          <path
            d="M130 140 C175 140 190 90 170 70 C150 50 140 85 130 110 Z"
            fill="url(#foxy_body)"
          />
          <path
            d="M170 70 C165 75 160 80 155 82 C162 70 170 70 170 70 Z"
            fill="#FFF7ED"
          />

          {/* Ears */}
          <path d="M50 80 L35 25 L85 55 Z" fill="#C2410C" />
          <path d="M52 75 L43 35 L78 58 Z" fill="url(#foxy_ear_inner)" />

          <path d="M150 80 L165 25 L115 55 Z" fill="#C2410C" />
          <path d="M148 75 L157 35 L122 58 Z" fill="url(#foxy_ear_inner)" />

          {/* Head & Cheeks */}
          <circle cx="100" cy="105" r="58" fill="url(#foxy_body)" />
          <path
            d="M48 105 C48 135 75 155 100 155 C125 155 152 135 152 105 C140 108 120 120 100 120 C80 120 60 108 48 105 Z"
            fill="#FFF7ED"
          />

          {/* Cheek Tufts */}
          <path d="M48 105 L30 115 L52 125 Z" fill="url(#foxy_body)" />
          <path d="M152 105 L170 115 L148 125 Z" fill="url(#foxy_body)" />

          {/* Cute Eyes */}
          {expression === 'winking' ? (
            <>
              <path d="M72 98 Q80 90 88 98" stroke="#431407" strokeWidth="4" strokeLinecap="round" />
              <circle cx="120" cy="95" r="7" fill="#431407" />
              <circle cx="122" cy="93" r="2.5" fill="#FFFFFF" />
            </>
          ) : (
            <>
              <circle cx="78" cy="95" r="7.5" fill="#431407" />
              <circle cx="80" cy="92.5" r="2.5" fill="#FFFFFF" />
              <circle cx="122" cy="95" r="7.5" fill="#431407" />
              <circle cx="124" cy="92.5" r="2.5" fill="#FFFFFF" />
            </>
          )}

          {/* Nose & Snout */}
          <ellipse cx="100" cy="118" rx="8" ry="5.5" fill="#1C1917" />
          <path d="M96 125 Q100 130 104 125" stroke="#431407" strokeWidth="2.5" strokeLinecap="round" />

          {/* Scout Bandana / Collar */}
          <path
            d="M72 152 Q100 168 128 152 L100 185 Z"
            fill="#059669"
          />
          <circle cx="100" cy="160" r="4" fill="#FBBF24" />
        </svg>
      );

    case 'bunny':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-300 ${className}`}
        >
          {/* Bunny the Rabbit - Original Vector Design */}
          <defs>
            <linearGradient id="bunny_body" x1="40" y1="40" x2="160" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F472B6" />
              <stop offset="1" stopColor="#DB2777" />
            </linearGradient>
            <linearGradient id="bunny_ear_pink" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#FBCFE8" />
              <stop offset="1" stopColor="#F472B6" />
            </linearGradient>
          </defs>

          {/* Tall Ears */}
          <ellipse cx="70" cy="50" rx="15" ry="42" transform="rotate(-10 70 50)" fill="#DB2777" />
          <ellipse cx="70" cy="52" rx="9" ry="32" transform="rotate(-10 70 52)" fill="url(#bunny_ear_pink)" />

          <ellipse cx="130" cy="50" rx="15" ry="42" transform="rotate(10 130 50)" fill="#DB2777" />
          <ellipse cx="130" cy="52" rx="9" ry="32" transform="rotate(10 130 52)" fill="url(#bunny_ear_pink)" />

          {/* Head */}
          <ellipse cx="100" cy="120" rx="56" ry="50" fill="url(#bunny_body)" />

          {/* Rosy Cheeks */}
          <ellipse cx="65" cy="132" rx="10" ry="6" fill="#FDA4AF" opacity="0.8" />
          <ellipse cx="135" cy="132" rx="10" ry="6" fill="#FDA4AF" opacity="0.8" />

          {/* Big Sparkling Eyes */}
          <ellipse cx="78" cy="115" rx="7" ry="9" fill="#374151" />
          <circle cx="80" cy="112" r="3" fill="#FFFFFF" />
          <circle cx="76" cy="118" r="1.5" fill="#FFFFFF" />

          <ellipse cx="122" cy="115" rx="7" ry="9" fill="#374151" />
          <circle cx="124" cy="112" r="3" fill="#FFFFFF" />
          <circle cx="120" cy="118" r="1.5" fill="#FFFFFF" />

          {/* Cute Nose & Whiskers */}
          <polygon points="100,126 95,122 105,122" fill="#BE185D" />
          <path d="M100 126 Q95 133 90 131" stroke="#500724" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 126 Q105 133 110 131" stroke="#500724" strokeWidth="2" strokeLinecap="round" />

          {/* Whiskers */}
          <line x1="45" y1="126" x2="60" y2="128" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" />
          <line x1="46" y1="133" x2="60" y2="132" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" />
          <line x1="155" y1="126" x2="140" y2="128" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" />
          <line x1="154" y1="133" x2="140" y2="132" stroke="#FCE7F3" strokeWidth="2" strokeLinecap="round" />

          {/* Green Bow / Leaf */}
          <circle cx="100" cy="168" r="5" fill="#10B981" />
          <ellipse cx="90" cy="168" rx="8" ry="4" transform="rotate(-15 90 168)" fill="#34D399" />
          <ellipse cx="110" cy="168" rx="8" ry="4" transform="rotate(15 110 168)" fill="#34D399" />
        </svg>
      );

    case 'panda':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-300 ${className}`}
        >
          {/* Panda the Zen Master - Original Vector Design */}
          {/* Black Ears */}
          <circle cx="56" cy="68" r="22" fill="#1F2937" />
          <circle cx="144" cy="68" r="22" fill="#1F2937" />

          {/* White Head */}
          <ellipse cx="100" cy="115" rx="58" ry="52" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />

          {/* Iconic Eye Patches */}
          <ellipse cx="74" cy="112" rx="16" ry="20" transform="rotate(-20 74 112)" fill="#1F2937" />
          <ellipse cx="126" cy="112" rx="16" ry="20" transform="rotate(20 126 112)" fill="#1F2937" />

          {/* Zen Eyes */}
          <circle cx="75" cy="112" r="6" fill="#FFFFFF" />
          <circle cx="76" cy="112" r="3" fill="#111827" />
          <circle cx="125" cy="112" r="6" fill="#FFFFFF" />
          <circle cx="124" cy="112" r="3" fill="#111827" />

          {/* Snout & Nose */}
          <ellipse cx="100" cy="132" rx="16" ry="12" fill="#F3F4F6" />
          <ellipse cx="100" cy="128" rx="8" ry="5" fill="#111827" />
          <path d="M100 133 Q100 138 95 139" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 133 Q100 138 105 139" stroke="#111827" strokeWidth="2" strokeLinecap="round" />

          {/* Bamboo Sprig in mouth */}
          <path d="M110 138 Q140 145 155 130" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="152" cy="128" rx="8" ry="3.5" transform="rotate(-30 152 128)" fill="#10B981" />
          <ellipse cx="140" cy="138" rx="7" ry="3" transform="rotate(-15 140 138)" fill="#34D399" />
        </svg>
      );

    case 'kitty':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-300 ${className}`}
        >
          {/* Kitty the Cosmic Violet Cat - Original Vector Design */}
          <defs>
            <linearGradient id="kitty_body" x1="40" y1="40" x2="160" y2="180" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#6D28D9" />
            </linearGradient>
            <linearGradient id="kitty_ear_inner" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#DDD6FE" />
              <stop offset="1" stopColor="#C4B5FD" />
            </linearGradient>
          </defs>

          {/* Perky Triangular Ears */}
          <polygon points="50,90 35,35 90,65" fill="#6D28D9" />
          <polygon points="53,85 42,45 83,67" fill="url(#kitty_ear_inner)" />

          <polygon points="150,90 165,35 110,65" fill="#6D28D9" />
          <polygon points="147,85 158,45 117,67" fill="url(#kitty_ear_inner)" />

          {/* Head */}
          <circle cx="100" cy="115" r="54" fill="url(#kitty_body)" />

          {/* Almond Bright Eyes */}
          <ellipse cx="75" cy="108" rx="8" ry="11" transform="rotate(-10 75 108)" fill="#FBBF24" />
          <ellipse cx="75" cy="108" rx="3.5" ry="9" fill="#1E1B4B" />

          <ellipse cx="125" cy="108" rx="8" ry="11" transform="rotate(10 125 108)" fill="#FBBF24" />
          <ellipse cx="125" cy="108" rx="3.5" ry="9" fill="#1E1B4B" />

          {/* Nose & Mouth */}
          <polygon points="100,123 96,120 104,120" fill="#F472B6" />
          <path d="M100 123 Q96 128 92 126" stroke="#EDE9FE" strokeWidth="2" strokeLinecap="round" />
          <path d="M100 123 Q104 128 108 126" stroke="#EDE9FE" strokeWidth="2" strokeLinecap="round" />

          {/* Whiskers */}
          <line x1="45" y1="118" x2="62" y2="120" stroke="#DDD6FE" strokeWidth="2" strokeLinecap="round" />
          <line x1="46" y1="125" x2="62" y2="124" stroke="#DDD6FE" strokeWidth="2" strokeLinecap="round" />
          <line x1="155" y1="118" x2="138" y2="120" stroke="#DDD6FE" strokeWidth="2" strokeLinecap="round" />
          <line x1="154" y1="125" x2="138" y2="124" stroke="#DDD6FE" strokeWidth="2" strokeLinecap="round" />

          {/* Star Bell Collar */}
          <path d="M75 160 Q100 174 125 160" stroke="#F59E0B" strokeWidth="5" strokeLinecap="round" />
          <polygon points="100,165 103,172 110,173 105,178 106,185 100,181 94,185 95,178 90,173 97,172" fill="#FBBF24" />
        </svg>
      );
  }
};
