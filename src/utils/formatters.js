/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatea una fecha
 */
export function formatDate(dateString, format = 'short') {
  const date = new Date(dateString);
  
  const options = {
    short: { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    full: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return new Intl.DateTimeFormat('es-MX', options[format]).format(date);
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(number) {
  return new Intl.NumberFormat('es-MX').format(number);
}

/**
 * Calcula el porcentaje
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return ((value / total) * 100).toFixed(1);
}

/**
 * Abrevia números grandes (1K, 1M, etc.)
 */
export function abbreviateNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
