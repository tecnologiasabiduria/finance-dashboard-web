import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown, Plus, Search, Tag, Loader2 } from 'lucide-react';

/**
 * Select con búsqueda y opción de crear nueva categoría inline
 */
export function CreatableSelect({
  label,
  error,
  options = [],
  placeholder = 'Seleccionar...',
  value,
  onChange,
  onCreateNew,
  createLabel = 'Añadir',
  emptyMessage = 'No hay opciones disponibles',
  emptyAction,
  emptyActionLabel = 'Crear categoría',
  name,
  className = '',
  containerClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateOption =
    search.trim() &&
    !options.some((o) => o.label.toLowerCase() === search.trim().toLowerCase()) &&
    onCreateNew;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    setIsOpen(false);
    setSearch('');
  };

  const handleCreate = async () => {
    if (!search.trim() || !onCreateNew) return;
    setCreating(true);
    try {
      const newValue = await onCreateNew(search.trim());
      if (newValue) {
        handleSelect(newValue);
      }
    } catch (err) {
      console.error('Error creating:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className={clsx('space-y-2', containerClassName)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-dark-200">{label}</label>
      )}

      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={handleOpen}
          className={clsx(
            'w-full px-4 py-3 bg-dark-900 border rounded-lg text-left',
            'focus:outline-none focus:ring-2 transition-all duration-300',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-dark-700 focus:border-gold-400 focus:ring-gold-400/20',
            className
          )}
        >
          <span className={selectedOption ? 'text-white' : 'text-dark-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={clsx(
              'absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-dark-900 border border-dark-700 rounded-lg shadow-xl overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-dark-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar o escribir nueva..."
                  className="w-full pl-9 pr-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder:text-dark-500 focus:outline-none focus:border-gold-400/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showCreateOption) {
                        handleCreate();
                      } else if (filtered.length === 1) {
                        handleSelect(filtered[0].value);
                      }
                    }
                    if (e.key === 'Escape') {
                      setIsOpen(false);
                      setSearch('');
                    }
                  }}
                />
              </div>
            </div>

            {/* Options list */}
            <div className="max-h-48 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 transition-colors',
                      option.value === value
                        ? 'bg-gold-400/10 text-gold-400'
                        : 'text-white hover:bg-dark-800'
                    )}
                  >
                    <Tag className="h-3.5 w-3.5 flex-shrink-0 text-dark-500" />
                    {option.label}
                  </button>
                ))
              ) : !showCreateOption ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-dark-500 text-sm mb-3">{emptyMessage}</p>
                  {emptyAction && (
                    <button
                      type="button"
                      onClick={emptyAction}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gold-400 bg-gold-400/10 rounded-lg hover:bg-gold-400/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {emptyActionLabel}
                    </button>
                  )}
                </div>
              ) : null}

              {/* Create new option */}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-gold-400 hover:bg-gold-400/10 transition-colors border-t border-dark-800"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {createLabel}
                  <span className="text-dark-400">( {search.trim()} )</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
          {error}
        </p>
      )}
    </div>
  );
}
