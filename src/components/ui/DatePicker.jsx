import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  label,
  error,
  className = '',
  name,
}) {
  const today = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const containerRef = useRef(null);

  // Parse selected date
  const selected = value ? new Date(value + 'T00:00:00') : null;

  // Sync view to selected date when opening
  useEffect(() => {
    if (isOpen && selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth - 1);
  const trailingDays = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    trailingDays.push(prevMonthDays - i);
  }

  // Current month days
  const currentDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentDays.push(i);
  }

  // Next month leading days
  const totalCells = trailingDays.length + currentDays.length;
  const nextDays = [];
  const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let i = 1; i <= remaining; i++) {
    nextDays.push(i);
  }

  const handleSelectDay = (day) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    onChange({ target: { name, value: dateStr } });
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange({ target: { name, value: '' } });
  };

  const handleToday = () => {
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    onChange({ target: { name, value: `${today.getFullYear()}-${mm}-${dd}` } });
    setIsOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day) =>
    selected &&
    day === selected.getDate() &&
    viewMonth === selected.getMonth() &&
    viewYear === selected.getFullYear();

  const displayValue = selected
    ? `${selected.getDate()} ${MONTHS[selected.getMonth()].substring(0, 3)} ${selected.getFullYear()}`
    : '';

  return (
    <div className="space-y-2" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-dark-200">{label}</label>
      )}

      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'w-full pl-10 pr-8 py-2.5 bg-dark-800 border rounded-lg text-left text-sm',
            'focus:outline-none focus:ring-2 transition-all duration-300',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-dark-700 focus:border-gold-400 focus:ring-gold-400/20',
            className
          )}
        >
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
          <span className={displayValue ? 'text-white' : 'text-dark-500'}>
            {displayValue || placeholder}
          </span>
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </button>

        {/* Calendar Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-72 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl p-3 animate-fade-in">
            {/* Month/Year nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-white">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-dark-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0">
              {/* Trailing days from prev month */}
              {trailingDays.map((d, i) => (
                <button
                  key={`prev-${i}`}
                  type="button"
                  onClick={() => {
                    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
                    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
                    const mm = String(prevM + 1).padStart(2, '0');
                    const dd = String(d).padStart(2, '0');
                    onChange({ target: { name, value: `${prevY}-${mm}-${dd}` } });
                    setIsOpen(false);
                  }}
                  className="h-8 text-xs text-dark-600 hover:text-dark-400 rounded-lg transition-colors"
                >
                  {d}
                </button>
              ))}

              {/* Current month days */}
              {currentDays.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleSelectDay(d)}
                  className={clsx(
                    'h-8 text-xs rounded-lg transition-all duration-150',
                    isSelected(d)
                      ? 'bg-gold-400 text-white font-bold'
                      : isToday(d)
                      ? 'bg-dark-800 text-gold-300 font-semibold ring-1 ring-gold-400/50'
                      : 'text-white hover:bg-dark-800'
                  )}
                >
                  {d}
                </button>
              ))}

              {/* Leading days from next month */}
              {nextDays.map((d, i) => (
                <button
                  key={`next-${i}`}
                  type="button"
                  onClick={() => {
                    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
                    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
                    const mm = String(nextM + 1).padStart(2, '0');
                    const dd = String(d).padStart(2, '0');
                    onChange({ target: { name, value: `${nextY}-${mm}-${dd}` } });
                    setIsOpen(false);
                  }}
                  className="h-8 text-xs text-dark-600 hover:text-dark-400 rounded-lg transition-colors"
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-dark-800">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-dark-400 hover:text-red-400 transition-colors"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="text-xs text-gold-300 hover:text-gold-200 font-medium transition-colors"
              >
                Hoy
              </button>
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
