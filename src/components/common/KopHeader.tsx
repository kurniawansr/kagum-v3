import React from 'react';
import { useApp } from '../../context/AppContext';
import { LogoKemenag } from './LogoKemenag';

interface KopHeaderProps {
  className?: string;
}

export const KopHeader: React.FC<KopHeaderProps> = ({ className = '' }) => {
  const { schoolProfile } = useApp();
  const kop = schoolProfile.kopLaporan;

  return (
    <div className={`p-4 bg-white rounded-xl border border-slate-200 text-center relative ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Logo Madrasah / Kemenag on Left */}
        <div className="w-16 h-16 flex items-center justify-center shrink-0">
          {schoolProfile.logoUrl ? (
            <img
              src={schoolProfile.logoUrl}
              alt="Logo Madrasah"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                // If logo fails to load, fallback to Logo Kemenag
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200"><path fill="%230b6623" d="M100 5 L185 45 L185 135 L100 195 L15 135 L15 45 Z"/><path fill="none" stroke="%23ffcc00" stroke-width="6" d="M100 12 L177 48 L177 130 L100 187 L23 130 L23 48 Z"/><path fill="%23004d1a" d="M100 20 L170 52 L170 125 L100 178 L30 125 L30 52 Z"/><g fill="%23ffcc00" stroke="%23ffcc00"><path stroke-width="2" d="M100 32 L103 42 L113 42 L105 48 L108 58 L100 52 L92 58 L95 48 L87 42 L97 42 Z"/><circle cx="100" cy="100" r="38" fill="none" stroke-width="4"/><path d="M72 100 A28 28 0 1 0 128 100 A34 34 0 1 1 72 100 Z" fill="%23ffcc00"/><path d="M75 130 Q100 120 125 130 L120 138 Q100 128 80 138 Z" fill="%23ffffff"/><rect x="85" y="80" width="30" height="35" rx="3" fill="%23ffffff" stroke="%23000000" stroke-width="1"/><line x1="100" y1="80" x2="100" y2="115" stroke="%23000000" stroke-width="1"/><text x="100" y="158" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="%23ffffff" text-anchor="middle">IKHLAS BERAMAL</text></g></svg>';
              }}
            />
          ) : (
            <LogoKemenag className="w-16 h-16" />
          )}
        </div>

        {/* Center Kop Text with precise line spacing and formal typography */}
        <div className="text-center flex-1 space-y-0.5">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 leading-tight">
            {kop.line1 || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA'}
          </h4>
          <h3 className="font-bold text-xs sm:text-sm uppercase tracking-wide text-slate-900 leading-tight">
            {kop.line2 || 'KANTOR KEMENTERIAN AGAMA KABUPATEN PURBALINGGA'}
          </h3>
          <h2 className="font-extrabold text-sm sm:text-base uppercase tracking-wider text-slate-900 leading-tight py-0.5">
            {kop.line3 || schoolProfile.namaMadrasah}
          </h2>
          <p className="text-[11px] font-normal text-slate-800 leading-tight">
            {kop.line4 || schoolProfile.alamatMadrasah}
          </p>
          {kop.line5 && (
            <p className="text-[10px] font-normal text-slate-600 leading-tight">{kop.line5}</p>
          )}
          {kop.line6 && (
            <p className="text-[10px] font-normal text-slate-600 leading-tight">{kop.line6}</p>
          )}
        </div>

        {/* Spacer on Right to balance Left Logo for exact horizontal centering */}
        <div className="w-16 h-16 shrink-0" />
      </div>

      {/* Official Kop Double Line Separator */}
      <div className="mt-3 space-y-[2px]">
        <div className="border-b-2 border-slate-900"></div>
        <div className="border-b border-slate-900"></div>
      </div>
    </div>
  );
};

