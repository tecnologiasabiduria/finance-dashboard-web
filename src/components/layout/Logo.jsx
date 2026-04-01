import { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

export function Logo({ size = 'md', showText = true }) {
  const [imgFailed, setImgFailed] = useState(false);
  const { theme } = useSettings();
  const isBeige = theme === 'sand-beige';

  const sizes = {
    sm: { icon: 'h-8 w-8', text: 'text-xl', sub: 'text-xs' },
    md: { icon: 'h-10 w-10', text: 'text-2xl', sub: 'text-sm' },
    lg: { icon: 'h-14 w-14', text: 'text-3xl', sub: 'text-base' },
  };

  return (
    <div className="flex items-center gap-3">
      {!imgFailed ? (
        <img
          src={isBeige ? "/icono.png" : "/assets/brand/logo-icon.svg"}
          alt="Finanzas Sabias"
          className={`${sizes[size].icon} rounded-full object-contain`}
          onError={() => setImgFailed(true)}
          onLoad={(e) => {
            if (e.target.naturalWidth === 0) setImgFailed(true);
          }}
        />
      ) : (
        <div
          className={`${sizes[size].icon} rounded-full flex items-center justify-center ${
            isBeige
              ? 'bg-gradient-to-br from-[#261c21] via-[#3d2b21] to-[#4d3828]'
              : 'bg-gradient-to-br from-gold-700 to-gold-400'
          }`}
        >
          <span className="font-serif font-bold text-white">FS</span>
        </div>
      )}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-serif font-bold text-gradient-gold ${sizes[size].text} leading-tight`}>
            Finanzas
          </span>
          <span className={`${sizes[size].sub} text-dark-400 tracking-widest uppercase`}>
            Sabias
          </span>
        </div>
      )}
    </div>
  );
}
