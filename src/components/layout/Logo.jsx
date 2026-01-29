export function Logo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { icon: 'h-8 w-8', text: 'text-lg' },
    md: { icon: 'h-10 w-10', text: 'text-xl' },
    lg: { icon: 'h-14 w-14', text: 'text-2xl' },
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${sizes[size].icon} rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold`}
      >
        <span className="font-serif font-bold text-dark-950">SE</span>
      </div>
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
