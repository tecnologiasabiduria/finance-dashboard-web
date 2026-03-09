import { useState } from 'react';

export function Logo({ size = 'md', showText = true }) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizes = {
    sm: { icon: 'h-8 w-8', text: 'text-lg' },
    md: { icon: 'h-10 w-10', text: 'text-xl' },
    lg: { icon: 'h-14 w-14', text: 'text-2xl' },
  };

  return (
    <div className="flex items-center gap-3">
      {!imgFailed ? (
        <img
          src="/assets/brand/logo-icon.svg"
          alt="Sabiduría Empresarial"
          className={`${sizes[size].icon} rounded-full object-contain`}
          onError={() => setImgFailed(true)}
          onLoad={(e) => {
            if (e.target.naturalWidth === 0) setImgFailed(true);
          }}
        />
      ) : (
        <div
          className={`${sizes[size].icon} rounded-full bg-gradient-to-br from-gold-700 to-gold-400 flex items-center justify-center`}
        >
          <span className="font-serif font-bold text-white">SE</span>
        </div>
      )}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-serif font-bold text-gradient-gold ${sizes[size].text}`}>
            Sabiduría Empresarial
          </span>
          <span className="text-xs text-dark-400 tracking-widest uppercase">
            Finanzas Sabias
          </span>
        </div>
      )}
    </div>
  );
}
