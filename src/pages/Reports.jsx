import { useState, useEffect } from 'react';
import {
  Calendar, BarChart3, TrendingUp, PieChart, Zap,
  AlertCircle, AlertTriangle, ArrowUpRight, ArrowDownRight,
  TrendingDown, CheckCircle, Target, Wallet, ChevronLeft, ChevronRight,
  Activity, Landmark,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from 'recharts';
import Dashboard from './Dashboard';
import AnnualReport from './AnnualReport';
import { Card, Spinner } from '../components/ui';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmtK(v) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-950 border border-dark-600 rounded-xl p-3 shadow-2xl min-w-[160px]">
      <p className="text-xs text-dark-400 mb-2 font-medium uppercase tracking-wider">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-sm text-dark-300">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="text-sm font-semibold text-white">{formatCurrency(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── FLUJO DE CAJA ────────────────────────────────────────────────────────────
function FlujoDeCaja({ currency }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getDashboardStats()
      .then((r) => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-28 bg-dark-800 rounded" />
              <div className="h-8 w-8 bg-dark-800 rounded-lg" />
            </div>
            <div className="h-7 w-36 bg-dark-800 rounded mb-2" />
            <div className="h-3 w-24 bg-dark-800 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="h-5 w-40 bg-dark-800 rounded mb-6" />
        <div className="h-64 bg-dark-800 rounded-xl" />
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="h-5 w-44 bg-dark-800 rounded mb-6" />
        <div className="h-48 bg-dark-800 rounded-xl" />
      </div>
    </div>
  );
  if (!stats) return (
    <Card className="p-12 text-center">
      <Activity className="h-10 w-10 text-dark-600 mx-auto mb-3" />
      <p className="text-dark-300 font-medium">Sin datos disponibles</p>
    </Card>
  );

  const chartData = (stats.monthlyData || []).map((m) => ({
    name: m.month || '—',
    Ingresos: m.income || 0,
    Gastos: m.expense || 0,
    Flujo: (m.income || 0) - (m.expense || 0),
  }));

  const totalIncome = chartData.reduce((s, d) => s + d.Ingresos, 0);
  const totalExpenses = chartData.reduce((s, d) => s + d.Gastos, 0);
  const netFlow = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? ((netFlow / totalIncome) * 100).toFixed(1) : 0;
  const bestMonth = chartData.reduce((best, m) => m.Flujo > (best?.Flujo ?? -Infinity) ? m : best, null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Ingresos (6 meses)</span>
            <div className="p-2 bg-emerald-500/15 rounded-lg">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalIncome, currency)}</p>
          <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Promedio {formatCurrency(totalIncome / 6, currency)}/mes
          </p>
        </Card>

        <Card className="p-5 border-red-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Gastos (6 meses)</span>
            <div className="p-2 bg-red-500/15 rounded-lg">
              <ArrowDownRight className="h-4 w-4 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalExpenses, currency)}</p>
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Promedio {formatCurrency(totalExpenses / 6, currency)}/mes
          </p>
        </Card>

        <Card className={`p-5 ${netFlow >= 0 ? 'border-gold-400/30 bg-gold-400/5' : 'border-red-500/20'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Flujo Neto</span>
            <div className={`p-2 rounded-lg ${netFlow >= 0 ? 'bg-gold-400/15' : 'bg-red-500/15'}`}>
              <Wallet className={`h-4 w-4 ${netFlow >= 0 ? 'text-gold-400' : 'text-red-400'}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${netFlow >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
            {formatCurrency(netFlow, currency)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              Number(savingsRate) >= 20 ? 'bg-emerald-500/20 text-emerald-400' :
              Number(savingsRate) >= 0 ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {savingsRate}% tasa de ahorro
            </span>
          </div>
        </Card>
      </div>

      {/* Area chart — Ingresos vs Gastos */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Ingresos vs Gastos</h3>
            <p className="text-xs text-dark-400 mt-0.5">Últimos 6 meses</p>
          </div>
          {bestMonth && (
            <div className="text-right">
              <p className="text-xs text-dark-500 mb-0.5">Mejor mes</p>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                {bestMonth.name} · {formatCurrency(bestMonth.Flujo, currency)}
              </span>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={48} />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend
              formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>}
            />
            <Area type="monotone" dataKey="Ingresos" stroke="#34d399" strokeWidth={2} fill="url(#gradIncome)" dot={{ fill: '#34d399', r: 3, strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Gastos" stroke="#f87171" strokeWidth={2} fill="url(#gradExpense)" dot={{ fill: '#f87171', r: 3, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Flujo neto line */}
      <Card className="p-6">
        <div className="mb-5">
          <h3 className="text-base font-semibold text-white">Flujo Neto Mensual</h3>
          <p className="text-xs text-dark-400 mt-0.5">Ingresos menos gastos por mes</p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={48} />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Bar dataKey="Flujo" name="Flujo neto" radius={[4, 4, 0, 0]}
              fill="#eaad74"
              label={false}
            >
              {chartData.map((entry, i) => (
                <rect key={i} fill={entry.Flujo >= 0 ? '#eaad74' : '#f87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Breakdown table */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-white mb-4">Detalle mensual</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-dark-400 text-xs uppercase tracking-wider">
                <th className="text-left pb-3 font-medium">Mes</th>
                <th className="text-right pb-3 font-medium">Ingresos</th>
                <th className="text-right pb-3 font-medium">Gastos</th>
                <th className="text-right pb-3 font-medium">Flujo neto</th>
                <th className="text-right pb-3 font-medium">Ahorro %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {[...chartData].reverse().map((m, i) => {
                const net = m.Ingresos - m.Gastos;
                const rate = m.Ingresos > 0 ? ((net / m.Ingresos) * 100).toFixed(0) : 0;
                return (
                  <tr key={i} className="hover:bg-dark-900/50 transition-colors">
                    <td className="py-3 font-medium text-white capitalize">{m.name}</td>
                    <td className="py-3 text-right text-emerald-400">{formatCurrency(m.Ingresos, currency)}</td>
                    <td className="py-3 text-right text-red-400">{formatCurrency(m.Gastos, currency)}</td>
                    <td className={`py-3 text-right font-semibold ${net >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
                      {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        Number(rate) >= 20 ? 'bg-emerald-500/15 text-emerald-400' :
                        Number(rate) >= 0 ? 'bg-amber-500/15 text-amber-400' :
                        'bg-red-500/15 text-red-400'
                      }`}>{rate}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── PRESUPUESTO VS EJECUTADO ─────────────────────────────────────────────────
function PresupuestoVsEjecutado({ currency }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getBudgetOverview(year, month)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Period selector */}
      <div className="flex items-center gap-2 bg-dark-900 border border-dark-700 rounded-xl w-fit px-1 py-1">
        <button onClick={prevMonth} className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 min-w-[150px] justify-center">
          <Calendar className="h-3.5 w-3.5 text-gold-400" />
          <span className="text-sm font-medium text-white">{MONTH_LABELS[month - 1]} {year}</span>
        </div>
        <button onClick={nextMonth} className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i}>
                  <div className="h-3 w-20 bg-dark-800 rounded mb-2" />
                  <div className="h-6 w-28 bg-dark-800 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
            <div className="h-3 w-32 bg-dark-800 rounded mb-4" />
            <div className="h-3 bg-dark-800 rounded-full mb-2" />
            <div className="flex justify-between">
              <div className="h-3 w-20 bg-dark-800 rounded" />
              <div className="h-3 w-28 bg-dark-800 rounded" />
            </div>
          </div>
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
            <div className="h-5 w-48 bg-dark-800 rounded mb-5" />
            {[1,2,3].map(i => (
              <div key={i} className="pl-3 border-l-2 border-dark-700 mb-5">
                <div className="flex justify-between mb-2">
                  <div className="h-4 w-24 bg-dark-800 rounded" />
                  <div className="h-4 w-32 bg-dark-800 rounded" />
                </div>
                <div className="h-2.5 bg-dark-800 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !(data?.monthly_estimate > 0) && (
        <Card className="p-12 text-center">
          <div className="w-14 h-14 bg-dark-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="h-7 w-7 text-dark-500" />
          </div>
          <p className="text-white font-semibold text-lg">Sin presupuesto configurado</p>
          <p className="text-dark-400 text-sm mt-2 max-w-sm mx-auto">
            Ve a <strong className="text-gold-400">Presupuesto</strong> en el menú lateral, configura tu meta de facturación anual y crea tus bolsillos para ver este informe.
          </p>
        </Card>
      )}

      {!loading && data?.monthly_estimate > 0 && (() => {
        const utilidad = data.actual_sales - data.total_actual_expenses;
        const salesPct = data.monthly_estimate > 0
          ? ((data.actual_sales / data.monthly_estimate) * 100).toFixed(0)
          : 0;
        const isOnTarget = data.actual_sales >= data.monthly_estimate;
        const isUnderBudget = data.total_actual_expenses <= data.total_budget;

        return (
          <>
            {/* Alerts */}
            {data.alerts?.length > 0 && (
              <div className="space-y-2">
                {data.alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
                    a.type === 'danger'
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {a.message}
                  </div>
                ))}
              </div>
            )}

            {/* Summary strip */}
            <Card className={`p-5 ${utilidad >= 0 ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-red-500/25 bg-red-500/[0.04]'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-dark-800">
                <div>
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Meta ventas</p>
                  <p className="text-xl font-bold text-gold-400">{formatCurrency(data.monthly_estimate, currency)}</p>
                </div>
                <div className="pl-6">
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Ventas reales</p>
                  <p className={`text-xl font-bold ${isOnTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {formatCurrency(data.actual_sales, currency)}
                  </p>
                  <span className={`text-xs ${isOnTarget ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {salesPct}% de la meta
                  </span>
                </div>
                <div className="pl-6">
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Gastos reales</p>
                  <p className={`text-xl font-bold ${isUnderBudget ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(data.total_actual_expenses, currency)}
                  </p>
                  <span className="text-xs text-dark-500">de {formatCurrency(data.total_budget, currency)} ppto.</span>
                </div>
                <div className="pl-6">
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Utilidad del mes</p>
                  <p className={`text-xl font-bold ${utilidad >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {utilidad >= 0 ? '+' : ''}{formatCurrency(utilidad, currency)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Sales progress bar */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gold-400" />
                  <span className="text-sm font-medium text-white">Avance de Facturación</span>
                </div>
                <span className={`text-sm font-bold ${isOnTarget ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {salesPct}%
                </span>
              </div>
              <div className="h-3 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${isOnTarget ? 'bg-emerald-500' : 'bg-gold-400'}`}
                  style={{ width: `${Math.min(Number(salesPct), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-dark-500">
                <span>{formatCurrency(data.actual_sales, currency)}</span>
                <span>Meta: {formatCurrency(data.monthly_estimate, currency)}</span>
              </div>
            </Card>

            {/* Pockets */}
            {data.pockets?.length > 0 && (
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-5">Bolsillos — Presupuesto vs Ejecutado</h3>
                <div className="space-y-5">
                  {data.pockets.map((p) => {
                    const pct = p.budget_value > 0
                      ? Math.min(Math.round((p.actual_value / p.budget_value) * 100), 999)
                      : 0;
                    const barPct = Math.min(pct, 100);
                    const statusColor = p.status === 'over'
                      ? { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/15 text-red-400', border: 'border-red-500/30' }
                      : p.status === 'on_track'
                      ? { bar: 'bg-gold-400', text: 'text-gold-400', badge: 'bg-gold-400/15 text-gold-400', border: 'border-gold-400/20' }
                      : { bar: 'bg-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400', border: 'border-emerald-500/20' };

                    return (
                      <div key={p.id} className={`pl-3 border-l-2 ${statusColor.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-dark-400">
                              {formatCurrency(p.actual_value, currency)} / {formatCurrency(p.budget_value, currency)}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor.badge}`}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${statusColor.bar}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        {p.status === 'over' && (
                          <p className="text-xs text-red-400 mt-1.5">
                            Excedido en {formatCurrency(p.deviation_amount, currency)} ({p.deviation_percent > 0 ? '+' : ''}{p.deviation_percent}%)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Annual trend */}
            {data.annual_data?.length > 0 && (
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-5">Tendencia Anual {year}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.annual_data.map((d) => ({
                    name: MONTH_LABELS[d.month - 1],
                    Ventas: d.actual_sales,
                    Estimado: d.estimated_sales,
                    Gastos: d.actual_expenses,
                  }))} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={44} />
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                    <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
                    <Bar dataKey="Ventas" fill="#34d399" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Estimado" fill="rgba(234,173,116,0.35)" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Gastos" fill="#f87171" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        );
      })()}
    </div>
  );
}

// ─── PROYECCIÓN DE LIQUIDEZ ───────────────────────────────────────────────────
function ProyeccionLiquidez({ currency }) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([api.getAccounts(), api.getDashboardStats()])
      .then(([accRes, statsRes]) => {
        setAccounts(accRes.data?.accounts || []);
        setStats(statsRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-28 bg-dark-800 rounded" />
              <div className="h-8 w-8 bg-dark-800 rounded-lg" />
            </div>
            <div className="h-8 w-32 bg-dark-800 rounded mb-2" />
            <div className="h-3 w-20 bg-dark-800 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2].map(i => (
          <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
            <div className="h-3 w-32 bg-dark-800 rounded mb-2" />
            <div className="h-6 w-28 bg-dark-800 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
        <div className="h-5 w-40 bg-dark-800 rounded mb-5" />
        <div className="h-56 bg-dark-800 rounded-xl" />
      </div>
    </div>
  );

  const liquidAccounts = (accounts || []).filter((a) => (a.type || a.account_type) !== 'credit_card');
  const liquidBalance = liquidAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);

  const monthly = stats?.monthlyData || [];
  const avgIncome = monthly.length > 0
    ? monthly.reduce((s, m) => s + (m.income || 0), 0) / monthly.length
    : 0;
  const avgExpense = monthly.length > 0
    ? monthly.reduce((s, m) => s + (m.expense || 0), 0) / monthly.length
    : 0;
  const avgNet = monthly.length > 0 ? avgIncome - avgExpense : null;

  const monthsLeft = avgNet !== null && avgNet < 0 && liquidBalance > 0
    ? liquidBalance / Math.abs(avgNet)
    : null;

  const now = new Date();
  const projectionData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = i === 0 ? 'Hoy' : MONTH_LABELS[d.getMonth()];
    return {
      name: label,
      Saldo: Math.max(0, liquidBalance + (avgNet || 0) * i),
    };
  });

  const alarm = monthsLeft !== null && monthsLeft <= 2;
  const warning = monthsLeft !== null && monthsLeft > 2 && monthsLeft <= 4;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alarm banner */}
      {alarm && (
        <div className="flex items-start gap-4 p-5 bg-red-500/10 border border-red-500/40 rounded-2xl">
          <div className="p-2.5 bg-red-500/20 rounded-xl shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-red-300">Alerta de liquidez crítica</p>
            <p className="text-sm text-red-400/80 mt-0.5">
              Al ritmo actual, la liquidez se agota en ~{monthsLeft.toFixed(1)} meses. Revisa tus gastos o activa cobros pendientes de cartera.
            </p>
          </div>
        </div>
      )}
      {warning && !alarm && (
        <div className="flex items-start gap-4 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <div className="p-2.5 bg-amber-500/20 rounded-xl shrink-0">
            <AlertCircle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-amber-300">Liquidez moderada</p>
            <p className="text-sm text-amber-400/80 mt-0.5">
              La liquidez cubre ~{monthsLeft.toFixed(1)} meses al ritmo actual. Considera aumentar ingresos o reducir gastos.
            </p>
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-dark-600">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Liquidez disponible</span>
            <div className="p-2 bg-dark-800 rounded-lg">
              <Landmark className="h-4 w-4 text-gold-400" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${liquidBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatCurrency(liquidBalance, currency)}
          </p>
          <p className="text-xs text-dark-500 mt-1">{liquidAccounts.length} cuenta{liquidAccounts.length !== 1 ? 's' : ''} (sin tarjetas)</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Flujo neto prom./mes</span>
            <div className={`p-2 rounded-lg ${avgNet >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
              {avgNet >= 0
                ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                : <TrendingDown className="h-4 w-4 text-red-400" />
              }
            </div>
          </div>
          {avgNet !== null ? (
            <p className={`text-2xl font-bold ${avgNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgNet >= 0 ? '+' : ''}{formatCurrency(avgNet, currency)}
            </p>
          ) : (
            <p className="text-dark-500 text-lg">Sin historial</p>
          )}
          <p className="text-xs text-dark-500 mt-1">Promedio últimos 6 meses</p>
        </Card>

        <Card className={`p-5 ${alarm ? 'border-red-500/40 bg-red-500/[0.04]' : warning ? 'border-amber-500/30 bg-amber-500/[0.03]' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-dark-400 uppercase tracking-wider">¿Para cuánto alcanza?</span>
            <div className={`p-2 rounded-lg ${alarm ? 'bg-red-500/20' : warning ? 'bg-amber-500/20' : 'bg-dark-800'}`}>
              <Zap className={`h-4 w-4 ${alarm ? 'text-red-400' : warning ? 'text-amber-400' : 'text-gold-400'}`} />
            </div>
          </div>
          {avgNet === null ? (
            <p className="text-dark-500 text-lg">Sin historial</p>
          ) : avgNet >= 0 ? (
            <>
              <p className="text-emerald-400 text-xl font-bold flex items-center gap-1">
                <CheckCircle className="h-5 w-5" /> Flujo positivo
              </p>
              <p className="text-xs text-emerald-500 mt-1">Tus ingresos superan tus gastos</p>
            </>
          ) : monthsLeft !== null ? (
            <>
              <p className={`text-3xl font-bold ${alarm ? 'text-red-400' : warning ? 'text-amber-400' : 'text-gold-400'}`}>
                ~{monthsLeft.toFixed(1)}
                <span className="text-lg font-medium ml-1">meses</span>
              </p>
              <p className="text-xs text-dark-500 mt-1">Al ritmo actual de gastos</p>
            </>
          ) : null}
        </Card>
      </div>

      {/* Averages */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-emerald-500/15">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-dark-400 uppercase tracking-wider">Ingreso promedio/mes</span>
          </div>
          <p className="text-xl font-bold text-emerald-400">{formatCurrency(avgIncome, currency)}</p>
        </Card>
        <Card className="p-4 border-red-500/15">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="h-4 w-4 text-red-400" />
            <span className="text-xs text-dark-400 uppercase tracking-wider">Gasto promedio/mes</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatCurrency(avgExpense, currency)}</p>
        </Card>
      </div>

      {/* Projection chart */}
      {avgNet !== null && (
        <Card className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-white">Proyección de saldo</h3>
              <p className="text-xs text-dark-400 mt-0.5">Próximos 6 meses al ritmo actual</p>
            </div>
            <span className="text-xs text-dark-500 bg-dark-800 px-2 py-1 rounded-lg">Estimativo</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={projectionData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={alarm ? '#f87171' : '#eaad74'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={alarm ? '#f87171' : '#eaad74'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtK} width={48} />
              <Tooltip content={<CustomTooltip currency={currency} />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="Saldo"
                stroke={alarm ? '#f87171' : '#eaad74'}
                strokeWidth={2.5}
                fill="url(#gradBalance)"
                dot={{ fill: alarm ? '#f87171' : '#eaad74', r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Account breakdown */}
      {liquidAccounts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-white mb-4">Cuentas incluidas en la proyección</h3>
          <div className="space-y-2">
            {liquidAccounts.map((a) => {
              const bal = Number(a.balance || 0);
              const share = liquidBalance > 0 ? (bal / liquidBalance) * 100 : 0;
              return (
                <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-dark-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-dark-800 rounded-lg">
                      <Landmark className="h-4 w-4 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{a.name}</p>
                      <p className="text-xs text-dark-500 capitalize">{(a.type || a.account_type)?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${bal >= 0 ? 'text-white' : 'text-red-400'}`}>
                      {formatCurrency(bal, currency)}
                    </p>
                    <p className="text-xs text-dark-500">{share.toFixed(0)}% del total</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── REPORTS (container) ──────────────────────────────────────────────────────
export default function Reports() {
  const { currency } = useSettings();
  const [activeView, setActiveView] = useState('monthly');

  const tabs = [
    { id: 'monthly', label: 'Mensual', icon: Calendar },
    { id: 'annual', label: 'Anual', icon: BarChart3 },
    { id: 'cashflow', label: 'Flujo de Caja', icon: TrendingUp },
    { id: 'budget', label: 'Ppto. vs Ejecutado', icon: PieChart },
    { id: 'projection', label: 'Proyección', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div data-tour="reports-tabs" className="flex flex-wrap gap-1.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeView === id;
          return (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm border ${
                isActive
                  ? 'bg-gold-400/10 text-gold-300 border-gold-400/30 shadow-[0_0_16px_rgba(218,125,65,0.12)]'
                  : 'text-dark-400 border-transparent hover:text-white hover:bg-dark-800/60 hover:border-dark-700'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-gold-400' : ''}`} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'monthly' && <Dashboard onSwitchToAnnual={() => setActiveView('annual')} />}
      {activeView === 'annual' && <AnnualReport />}
      {activeView === 'cashflow' && <FlujoDeCaja currency={currency} />}
      {activeView === 'budget' && <PresupuestoVsEjecutado currency={currency} />}
      {activeView === 'projection' && <ProyeccionLiquidez currency={currency} />}
    </div>
  );
}
