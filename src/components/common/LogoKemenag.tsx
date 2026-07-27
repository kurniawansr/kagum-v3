import React from 'react';

// Official Logo Kementerian Agama RI (Vector SVG Component & Data URI)
export const KEMENAG_LOGO_DATA_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><path fill="%230b6623" d="M100 5 L185 45 L185 135 L100 195 L15 135 L15 45 Z"/><path fill="none" stroke="%23ffcc00" stroke-width="6" d="M100 12 L177 48 L177 130 L100 187 L23 130 L23 48 Z"/><path fill="%23004d1a" d="M100 20 L170 52 L170 125 L100 178 L30 125 L30 52 Z"/><g fill="%23ffcc00" stroke="%23ffcc00"><path stroke-width="2" d="M100 32 L103 42 L113 42 L105 48 L108 58 L100 52 L92 58 L95 48 L87 42 L97 42 Z"/><circle cx="100" cy="100" r="38" fill="none" stroke-width="4"/><path d="M72 100 A28 28 0 1 0 128 100 A34 34 0 1 1 72 100 Z" fill="%23ffcc00"/><path d="M75 130 Q100 120 125 130 L120 138 Q100 128 80 138 Z" fill="%23ffffff"/><rect x="85" y="80" width="30" height="35" rx="3" fill="%23ffffff" stroke="%23000000" stroke-width="1"/><line x1="100" y1="80" x2="100" y2="115" stroke="%23000000" stroke-width="1"/><text x="100" y="158" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="%23ffffff" text-anchor="middle">IKHLAS BERAMAL</text></g></svg>`;

export const LogoKemenag: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img
        src={KEMENAG_LOGO_DATA_URL}
        alt="Logo Kementerian Agama RI"
        className="w-full h-full object-contain drop-shadow-sm"
      />
    </div>
  );
};
