import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, X, Settings, Loader2 } from 'lucide-react';
import { api } from '../services/api';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

export function AIAgentPanel() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('insights'); // 'insights' | 'config'
  const [insights, setInsights] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Config state — matches backend shape: { enabled, shared_data: { transactions, goals, budget, cartera } }
  const [config, setConfig] = useState({
    enabled: false,
    shared_data: {
      transactions: true,
      goals: true,
      budget: true,
      cartera: false,
    },
  });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configDirty, setConfigDirty] = useState(false);

  const panelRef = useRef(null);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await api.getAgentInsights();
      const data = res?.data;
      if (Array.isArray(data)) {
        setInsights(data);
        setUnreadCount(data.filter((i) => !i.read).length);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.getAgentConfig();
      const c = res?.data;
      if (c) {
        setConfig({
          enabled: c.enabled ?? false,
          shared_data: c.shared_data ?? { transactions: true, goals: true, budget: true, cartera: false },
        });
      }
    } catch {
      // Silently fail
    }
  }, []);

  // On mount: load insights so the badge reflects unread count even before opening
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // On open: refresh insights (catches anything n8n generated since last fetch) + load config
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([fetchInsights(), fetchConfig()]).finally(() => setLoading(false));
  }, [open, fetchInsights, fetchConfig]);

  // Mark insights as read when viewing
  useEffect(() => {
    if (!open || view !== 'insights' || insights.length === 0) return;

    const unread = insights.filter((i) => !i.read);
    if (unread.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        await Promise.all(unread.map((i) => api.markInsightRead(i.id)));
        setInsights((prev) =>
          prev.map((i) => (i.read ? i : { ...i, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
      } catch {
        // Silently fail
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [open, view, insights]);

  const handleConfigChange = (field, value) => {
    if (field === 'enabled') {
      setConfig((prev) => ({ ...prev, enabled: value }));
    } else {
      // shared_data field (transactions, goals, budget, cartera)
      setConfig((prev) => ({
        ...prev,
        shared_data: { ...prev.shared_data, [field]: value },
      }));
    }
    setConfigDirty(true);
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.updateAgentConfig(config);
      setConfigDirty(false);
    } catch {
      // Could show toast, but keeping it simple
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-white rounded-full shadow-2xl hover:shadow-gold-400/30 hover:scale-110 transition-all duration-300 group"
        title="Asistente IA"
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-dark-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[500px] bg-dark-950 border border-dark-700 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out origin-bottom-right ${
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <span className="text-lg">🧠</span> Tu Asesor Financiero
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView(view === 'config' ? 'insights' : 'config')}
              className={`p-2 rounded-lg transition-colors ${
                view === 'config'
                  ? 'text-gold-400 bg-gold-400/10'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }`}
              title="Configuracion"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 text-gold-400 animate-spin" />
            </div>
          ) : view === 'insights' ? (
            <InsightsView insights={insights} />
          ) : (
            <ConfigView
              config={config}
              onChange={handleConfigChange}
              onSave={handleSaveConfig}
              saving={savingConfig}
              dirty={configDirty}
            />
          )}
        </div>
      </div>
    </>
  );
}

function InsightsView({ insights }) {
  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="text-4xl mb-3">🧠</div>
        <p className="text-dark-300 text-sm leading-relaxed">
          Tu asesor financiero te enviara consejos personalizados 3 veces por
          semana. Activalo en{' '}
          <span className="inline-flex items-center text-gold-400">
            <Settings className="h-3.5 w-3.5 mr-0.5" /> configuracion
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4">
      {insights.map((insight) => (
        <div key={insight.id} className="space-y-2">
          {/* Date header */}
          <p className="text-xs text-dark-400 font-medium uppercase tracking-wide px-1">
            {formatDate(insight.created_at)}
          </p>

          {/* Message bubbles */}
          <div className="space-y-2">
            {(insight.messages || [insight]).map((msg, idx) => (
              <div
                key={idx}
                className={`bg-dark-800/60 border rounded-xl p-3 text-sm transition-colors ${
                  !insight.read_at
                    ? 'border-l-2 border-l-gold-400 border-dark-700/50'
                    : 'border-dark-700/30'
                }`}
              >
                {msg.title && (
                  <p className="text-white font-medium mb-1 flex items-center gap-1.5">
                    {msg.emoji && <span>{msg.emoji}</span>}
                    {msg.title}
                  </p>
                )}
                <p className="text-dark-300 text-sm leading-relaxed">
                  {msg.body || msg.content || msg.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfigView({ config, onChange, onSave, saving, dirty }) {
  const checkboxes = [
    { key: 'transactions', label: 'Transacciones del mes' },
    { key: 'goals', label: 'Progreso de metas' },
    { key: 'budget', label: 'Presupuesto vs gastos' },
    { key: 'cartera', label: 'Cartera (cuentas por cobrar)' },
  ];

  const sharedData = config.shared_data || {};

  return (
    <div className="p-4 space-y-5">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">Activar asesor</span>
        <button
          onClick={() => onChange('enabled', !config.enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
            config.enabled ? 'bg-gold-400' : 'bg-dark-700'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200 ${
              config.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <p className="text-dark-400 text-xs leading-relaxed">
        Recibe consejos financieros personalizados 3 veces por semana basados en
        tus datos.
      </p>

      {/* Data sharing checkboxes */}
      <div className="space-y-3">
        <p className="text-dark-300 text-xs font-medium uppercase tracking-wide">
          Datos a compartir
        </p>
        {checkboxes.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div
              className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                sharedData[key]
                  ? 'bg-gold-400 border-gold-400'
                  : 'border-dark-600 group-hover:border-dark-400'
              }`}
              onClick={() => onChange(key, !sharedData[key])}
            >
              {sharedData[key] && (
                <svg
                  className="h-3 w-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={sharedData[key] || false}
              onChange={() => onChange(key, !sharedData[key])}
            />
            <span className="text-dark-200 text-sm">{label}</span>
          </label>
        ))}
      </div>

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          dirty
            ? 'bg-gold-400 hover:bg-gold-500 text-white'
            : 'bg-dark-800 text-dark-500 cursor-not-allowed'
        }`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        ) : (
          'Guardar'
        )}
      </button>
    </div>
  );
}
