import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Plus,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  PieChart,
} from 'lucide-react';
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, Button, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate, calculatePercentage } from '../utils/formatters';
import { api } from '../services/api';
import { getCachedCategories, getDashboardMonthCache, setDashboardMonthCache } from '../services/cache';
import { getCategoryIcon } from '../utils/categoryIcons';

const INCOME_TYPE_COLORS = {
  'VENTA': '#10B981',
  'CARTERA': '#3B82F6',
  'OTRO': '#F59E0B',
};

const EXPENSE_CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#8B5CF6', '#EC4899', '#3B82F6',
  '#F59E0B', '#14B8A6', '#6366F1', '#D4AF37', '#6B7280',
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
export default function Dashboard() {
  const { user } = useAuth();
  const { currency } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected month/year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Data
  const [summaryData, setSummaryData] = useState(null);
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});
  const [incomeCategoryColors, setIncomeCategoryColors] = useState({});
  const [categoryIconMap, setCategoryIconMap] = useState({});

  // Budget data
  const [budgetOverview, setBudgetOverview] = useState(null);

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Load data
  useEffect(() => {
    const cacheKey = `${selectedYear}-${selectedMonth}`;

    const loadData = async () => {
      try {
        setError(null);

        // ── 1. Categories: shared cache (1 request per session) ──
        let catColors = {};
        let catIncomeColors = {};
        let catIconMap = {};
        try {
          const catRes = await getCachedCategories();
          if (catRes.data.grouped?.expense) {
            catRes.data.grouped.expense.forEach((cat) => {
              catColors[cat.name] = cat.color;
              catIconMap[cat.name] = { icon: cat.icon, color: cat.color };
            });
          }
          if (catRes.data.grouped?.income) {
            catRes.data.grouped.income.forEach((cat) => {
              catIncomeColors[cat.name] = cat.color;
              catIconMap[cat.name] = { icon: cat.icon, color: cat.color };
            });
          }
        } catch {
          // Ignore — use fallbacks
        }
        setCategoryColors(catColors);
        setIncomeCategoryColors(catIncomeColors);
        setCategoryIconMap(catIconMap);

        // ── 2. Check month cache ──
        const cached = getDashboardMonthCache(cacheKey);
        if (cached) {
          setSummaryData(cached.summary);
          setMonthTransactions(cached.transactions);
          setBudgetOverview(cached.budget);
          setLoading(false);
          return;
        }

        // ── 3. Fetch month data — ALL in parallel ──
        setLoading(true);

        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        const fromStr = startDate.toISOString().split('T')[0];
        const toStr = endDate.toISOString().split('T')[0];

        const [summaryRes, txRes, budgetConfigRes] = await Promise.all([
          api.getDashboardSummary({ month: selectedMonth + 1, year: selectedYear }),
          api.getTransactions({ from: fromStr, to: toStr, limit: 100 }),
          api.getBudgetConfig(selectedYear).catch(() => ({ data: { config: null } })),
        ]);

        const summary = summaryRes.data;
        const transactions = txRes.data.transactions || [];

        // Budget overview — only if config exists (1 extra call, but parallel wasn't possible)
        let budget = null;
        if (budgetConfigRes.data.config) {
          try {
            const overviewRes = await api.getBudgetOverview(selectedYear, selectedMonth + 1);
            budget = overviewRes.data;
          } catch {
            budget = null;
          }
        }

        // Save to cache
        setDashboardMonthCache(cacheKey, { summary, transactions, budget });

        setSummaryData(summary);
        setMonthTransactions(transactions);
        setBudgetOverview(budget);

      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear]);

  // Computed data
  const incomes = useMemo(() => monthTransactions.filter((t) => t.type === 'income'), [monthTransactions]);
  const expenses = useMemo(() => monthTransactions.filter((t) => t.type === 'expense'), [monthTransactions]);

  const totalIncome = useMemo(() => incomes.reduce((s, t) => s + parseFloat(t.amount), 0), [incomes]);
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + parseFloat(t.amount), 0), [expenses]);
  const resultado = totalIncome - totalExpense;

  // Income grouped by type (VENTA, CARTERA, OTRO)
  const incomeByType = useMemo(() => {
    const grouped = {};
    incomes.forEach((t) => {
      const type = t.category || 'OTRO';
      grouped[type] = (grouped[type] || 0) + parseFloat(t.amount);
    });
    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: incomeCategoryColors[name] || INCOME_TYPE_COLORS[name] || '#D4AF37',
        percentage: totalIncome > 0 ? ((value / totalIncome) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [incomes, totalIncome, incomeCategoryColors]);

  // Expenses grouped by category
  const expenseByCategory = useMemo(() => {
    const grouped = {};
    expenses.forEach((t) => {
      const cat = t.category || 'Sin categoría';
      grouped[cat] = (grouped[cat] || 0) + parseFloat(t.amount);
    });
    return Object.entries(grouped)
      .map(([name, value], i) => ({
        name,
        value: Math.round(value * 100) / 100,
        color: categoryColors[name] || EXPENSE_CATEGORY_COLORS[i % EXPENSE_CATEGORY_COLORS.length],
        percentage: totalExpense > 0 ? ((value / totalExpense) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, totalExpense, categoryColors]);

  // Skeleton pulse helper
  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-dark-800 rounded-lg ${className}`} />
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-52 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-56 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-dark-900/50 border border-dark-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
              <Skeleton className="h-48 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-medium">{d.name}</p>
          <p className="text-gold-400">{formatCurrency(d.value, currency)}</p>
          <p className="text-dark-400 text-sm">{d.percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Month Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Informe Mensual
          </h1>
          <p className="text-dark-400 mt-1">
            ¡Hola, {user?.name?.split(' ')[0] || 'Usuario'}! Aquí tienes tu resumen financiero
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div data-tour="month-navigator" className="flex items-center gap-2 bg-dark-900 border border-dark-800 rounded-xl">
            <button
              onClick={goToPrevMonth}
              className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-l-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2">
              <Calendar className="h-4 w-4 text-gold-400" />
              <span className="text-sm font-medium text-white min-w-[130px] text-center">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </span>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-r-xl transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Link to="/transactions/new?type=income">
            <Button size="sm" icon={Plus}>
              Nuevo
            </Button>
          </Link>
        </div>
      </div>

      {/* Budget Summary Cards — arriba */}
      {budgetOverview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-5 border-gold-400/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dark-400 uppercase tracking-wider">Meta del Mes</span>
              <Target className="h-4 w-4 text-gold-400" />
            </div>
            <p className="text-xl font-bold text-gold-400">{formatCurrency(budgetOverview.monthly_estimate)}</p>
            <p className="text-xs text-dark-500 mt-1">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
          </Card>

          {(() => {
            const salesDev = budgetOverview.sales_deviation;
            const salesDevPct = budgetOverview.monthly_estimate > 0
              ? ((budgetOverview.actual_sales - budgetOverview.monthly_estimate) / budgetOverview.monthly_estimate * 100).toFixed(1)
              : 0;
            return (
              <Card className={`p-5 ${salesDev >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-400 uppercase tracking-wider">Ingreso Real</span>
                  {salesDev >= 0
                    ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                    : <ArrowDownRight className="h-4 w-4 text-red-400" />
                  }
                </div>
                <p className={`text-xl font-bold ${salesDev >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(budgetOverview.actual_sales)}
                </p>
                <p className={`text-xs mt-1 ${salesDev >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {salesDev >= 0 ? '+' : ''}{salesDevPct}% vs estimado
                </p>
              </Card>
            );
          })()}

          {(() => {
            const missing = Math.max(0, budgetOverview.monthly_estimate - budgetOverview.actual_sales);
            const missingPct = budgetOverview.monthly_estimate > 0
              ? Math.max(0, ((1 - budgetOverview.actual_sales / budgetOverview.monthly_estimate) * 100)).toFixed(1)
              : 0;
            const reached = Number(missingPct) === 0;
            return (
              <Card className={`p-5 ${reached ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-dark-400 uppercase tracking-wider">Falta para la Meta</span>
                  <Target className="h-4 w-4 text-red-400" />
                </div>
                <p className={`text-xl font-bold ${reached ? 'text-emerald-400' : 'text-red-400'}`}>
                  {reached ? '¡Meta alcanzada!' : formatCurrency(missing)}
                </p>
                <p className={`text-xs mt-1 ${reached ? 'text-emerald-500' : 'text-red-500'}`}>
                  {reached ? '100% completado' : `${missingPct}% pendiente`}
                </p>
              </Card>
            );
          })()}

          <Card className={`p-5 ${budgetOverview.total_actual_expenses > budgetOverview.total_budget ? 'border-red-500/20' : 'border-emerald-500/20'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dark-400 uppercase tracking-wider">Gastos Reales</span>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className={`text-xl font-bold ${budgetOverview.total_actual_expenses > budgetOverview.total_budget ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatCurrency(budgetOverview.total_actual_expenses)}
            </p>
            <p className="text-xs text-dark-500 mt-1">De transacciones registradas</p>
          </Card>
        </div>
      )}

      {/* Breakdown: Income by Type + Expenses by Category */}
      <div data-tour="charts-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INGRESOS por Tipo */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Ingresos por Tipo</h3>
              <p className="text-sm text-dark-400">Distribución {MONTH_NAMES[selectedMonth]}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
          </div>

          {incomeByType.length > 0 ? (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={incomeByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {incomeByType.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {incomeByType.map((item) => {
                  const catInfo = categoryIconMap[item.name];
                  const Icon = catInfo ? getCategoryIcon(catInfo.icon) : null;
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {Icon ? (
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                          </div>
                        ) : (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        )}
                        <span className="text-sm text-dark-300">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-white">{formatCurrency(item.value, currency)}</span>
                        <span className="text-xs text-dark-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 border-t border-dark-800">
                  <span className="text-sm font-semibold text-white">TOTAL</span>
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalIncome, currency)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-dark-400">
              <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay ingresos en este mes</p>
            </div>
          )}
        </Card>

        {/* GASTOS por Categoría */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Gastos por Categoría</h3>
              <p className="text-sm text-dark-400">Distribución {MONTH_NAMES[selectedMonth]}</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
          </div>

          {expenseByCategory.length > 0 ? (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expenseByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {expenseByCategory.map((item) => {
                  const catInfo = categoryIconMap[item.name];
                  const Icon = catInfo ? getCategoryIcon(catInfo.icon) : null;
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {Icon ? (
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                            <Icon className="h-3.5 w-3.5" style={{ color: item.color }} />
                          </div>
                        ) : (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        )}
                        <span className="text-sm text-dark-300">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-white">{formatCurrency(item.value, currency)}</span>
                        <span className="text-xs text-dark-500 ml-2">({item.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-3 border-t border-dark-800">
                  <span className="text-sm font-semibold text-white">TOTAL</span>
                  <span className="text-sm font-bold text-red-400">{formatCurrency(totalExpense, currency)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-dark-400">
              <ArrowDownRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay gastos en este mes</p>
            </div>
          )}
        </Card>
      </div>

      {/* Detail Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Detail Table */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-dark-800">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Detalle Ingresos ({incomes.length})
            </h3>
            <Link to="/transactions" className="text-xs text-gold-400 hover:text-gold-300">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dark-900">
                <tr>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Fecha</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Nº Fac</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Tipo</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Nombre</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-dark-500">Monto</th>
                  <th className="text-center py-3 px-3 text-xs font-medium text-dark-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-dark-400 text-sm">
                      Sin ingresos registrados
                    </td>
                  </tr>
                ) : (
                  [...incomes]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((t) => (
                      <tr key={t.id} className="border-t border-dark-800/50 hover:bg-dark-800/30">
                        <td className="py-2.5 px-3 text-dark-400">{formatDate(t.date, 'short')}</td>
                        <td className="py-2.5 px-3 text-dark-300">{t.invoice_number || '—'}</td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const catInfo = categoryIconMap[t.category];
                            const Icon = catInfo ? getCategoryIcon(catInfo.icon) : null;
                            const color = catInfo?.color || '#F59E0B';
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded font-medium"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                {Icon && <Icon className="h-3 w-3" />}
                                {t.category || 'OTRO'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3 text-white font-medium">{t.client_name || '—'}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">{formatCurrency(t.amount, currency)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {t.invoice_status ? (
                            <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                              t.invoice_status === 'FACTURADO'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {t.invoice_status === 'FACTURADO' ? 'FAC' : 'NO FAC'}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          {incomes.length > 0 && (
            <div className="px-4 py-3 border-t border-dark-800 bg-dark-900/50 flex justify-between items-center">
              <span className="text-xs text-dark-400">Total Ingresos</span>
              <span className="text-sm font-bold text-emerald-400">{formatCurrency(totalIncome, currency)}</span>
            </div>
          )}
        </Card>

        {/* Expense Detail Table */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-dark-800">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              Detalle Gastos ({expenses.length})
            </h3>
            <Link to="/transactions" className="text-xs text-gold-400 hover:text-gold-300">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-dark-900">
                <tr>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Fecha</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Proveedor</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Categoría</th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-dark-500">Método</th>
                  <th className="text-right py-3 px-3 text-xs font-medium text-dark-500">Monto</th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-dark-400 text-sm">
                      Sin gastos registrados
                    </td>
                  </tr>
                ) : (
                  [...expenses]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((t) => (
                      <tr key={t.id} className="border-t border-dark-800/50 hover:bg-dark-800/30">
                        <td className="py-2.5 px-3 text-dark-400">{formatDate(t.date, 'short')}</td>
                        <td className="py-2.5 px-3 text-white font-medium">{t.provider_name || '—'}</td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const catInfo = categoryIconMap[t.category];
                            const Icon = catInfo ? getCategoryIcon(catInfo.icon) : null;
                            const color = catInfo?.color || '#6B7280';
                            return (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded font-medium"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                {Icon && <Icon className="h-3 w-3" />}
                                {t.category || '—'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3 text-dark-400">{t.payment_method || '—'}</td>
                        <td className="py-2.5 px-3 text-right text-red-400 font-medium">{formatCurrency(t.amount, currency)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          {expenses.length > 0 && (
            <div className="px-4 py-3 border-t border-dark-800 bg-dark-900/50 flex justify-between items-center">
              <span className="text-xs text-dark-400">Total Gastos</span>
              <span className="text-sm font-bold text-red-400">{formatCurrency(totalExpense, currency)}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/transactions/new?type=income" className="block">
          <Card className="p-4 border-emerald-500/10 hover:border-emerald-500/30 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Registrar Ingreso</p>
                <p className="text-xs text-dark-400">Añadir nuevo ingreso</p>
              </div>
              <ArrowRight className="h-5 w-5 text-dark-600 group-hover:text-emerald-400 transition-colors" />
            </div>
          </Card>
        </Link>

        <Link to="/transactions/new?type=expense" className="block">
          <Card className="p-4 border-red-500/10 hover:border-red-500/30 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <ArrowDownRight className="h-5 w-5 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Registrar Gasto</p>
                <p className="text-xs text-dark-400">Añadir nuevo gasto</p>
              </div>
              <ArrowRight className="h-5 w-5 text-dark-600 group-hover:text-red-400 transition-colors" />
            </div>
          </Card>
        </Link>

        <Link to="/annual-report" className="block">
          <Card className="p-4 border-gold-400/10 hover:border-gold-400/30 transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gold-400/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-gold-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white">Informe Anual</p>
                <p className="text-xs text-dark-400">Ver resumen del año</p>
              </div>
              <ArrowRight className="h-5 w-5 text-dark-600 group-hover:text-gold-400 transition-colors" />
            </div>
          </Card>
        </Link>
      </div>

      {/* ============================================================ */}
      {/* BUDGET OVERVIEW — Rendimiento del Presupuesto */}
      {/* ============================================================ */}
      {budgetOverview && (
        <>
          {/* Section divider */}
          <div className="border-t border-dark-800 pt-6">
            <h2 className="text-xl font-bold text-white mb-1">Rendimiento del Presupuesto</h2>
            <p className="text-sm text-dark-400 mb-4">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
          </div>

          {/* Budget Alerts */}
          {budgetOverview.alerts && budgetOverview.alerts.length > 0 && (
            <div className="space-y-2">
              {budgetOverview.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${
                    alert.type === 'danger'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 ${alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
                  <p className={`text-sm font-medium ${alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Pockets Detail Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-dark-800">
              <h3 className="text-lg font-semibold text-white">Detalle por Bolsillo</h3>
              <p className="text-sm text-dark-400">{MONTH_NAMES[selectedMonth]} {selectedYear}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-800/50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400">Bolsillo</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">% Presup.</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Presup. Anual</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Presup. Mensual</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Valor Real</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">% Real</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Desviación ($)</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Desviación (%)</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-dark-400">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetOverview.pockets.map((p) => {
                    const isOver = p.status === 'over';
                    const hasData = p.actual_value > 0;
                    return (
                      <tr key={p.id} className="border-t border-dark-800/50 hover:bg-dark-800/20">
                        <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                        <td className="py-3 px-4 text-right text-gold-400">{p.percentage}%</td>
                        <td className="py-3 px-4 text-right text-dark-400">{formatCurrency(p.budget_value * 12)}</td>
                        <td className="py-3 px-4 text-right text-dark-300">{formatCurrency(p.budget_value)}</td>
                        <td className={`py-3 px-4 text-right font-medium ${hasData ? (isOver ? 'text-red-400' : 'text-emerald-400') : 'text-dark-500'}`}>
                          {hasData ? formatCurrency(p.actual_value) : '—'}
                        </td>
                        <td className={`py-3 px-4 text-right ${hasData ? (isOver ? 'text-red-400' : 'text-dark-300') : 'text-dark-500'}`}>
                          {hasData ? `${p.percentage_real}%` : '—'}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          p.deviation_amount > 0 ? 'text-red-400' : p.deviation_amount < 0 ? 'text-emerald-400' : 'text-dark-500'
                        }`}>
                          {hasData ? (
                            <>
                              {p.deviation_amount > 0 ? '+' : ''}
                              {formatCurrency(p.deviation_amount)}
                            </>
                          ) : '—'}
                        </td>
                        <td className={`py-3 px-4 text-right ${
                          p.deviation_percent > 0 ? 'text-red-400' : p.deviation_percent < 0 ? 'text-emerald-400' : 'text-dark-500'
                        }`}>
                          {hasData ? `${p.deviation_percent > 0 ? '+' : ''}${p.deviation_percent}%` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOver ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg">
                              <AlertTriangle className="h-3 w-3" />
                              Excedido
                            </span>
                          ) : hasData ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg">
                              <CheckCircle className="h-3 w-3" />
                              OK
                            </span>
                          ) : (
                            <span className="text-dark-500 text-xs">Sin datos</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                    <td className="py-3 px-4 font-bold text-white">TOTAL</td>
                    <td className="py-3 px-4 text-right font-bold text-gold-400">100%</td>
                    <td className="py-3 px-4 text-right font-bold text-dark-400">{formatCurrency(budgetOverview.total_budget * 12)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(budgetOverview.total_budget)}</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(budgetOverview.total_actual_expenses)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Progress Bars */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Ejecución del Presupuesto</h3>
            <div className="space-y-4">
              {budgetOverview.pockets.map((p) => {
                const pct = p.budget_value > 0 ? Math.min((p.actual_value / p.budget_value) * 100, 150) : 0;
                const isOver = p.status === 'over';
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-dark-300">{p.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-dark-400">
                          {formatCurrency(p.actual_value)} / {formatCurrency(p.budget_value)}
                        </span>
                        <span className={`text-xs font-medium ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Annual Sales Tracking */}
          {budgetOverview.annual_data && (
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-dark-800">
                <h3 className="text-lg font-semibold text-white">Ventas: Estimado vs Real — {selectedYear}</h3>
                <p className="text-sm text-dark-400">Seguimiento mes a mes de la facturación</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-800/50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400">Concepto</th>
                      {MONTH_NAMES.map((m, i) => (
                        <th key={i} className={`text-right py-3 px-3 text-xs font-medium min-w-[85px] ${
                          i === selectedMonth ? 'text-gold-400' : 'text-dark-400'
                        }`}>
                          {m.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-dark-800/50">
                      <td className="py-3 px-4 font-medium text-dark-300">Ventas Estimadas</td>
                      {budgetOverview.annual_data.map((d, i) => (
                        <td key={i} className="py-3 px-3 text-right text-dark-400">{formatCurrency(d.estimated_sales)}</td>
                      ))}
                    </tr>
                    <tr className="border-t border-dark-800/50">
                      <td className="py-3 px-4 font-medium text-emerald-400">Ventas Reales</td>
                      {budgetOverview.annual_data.map((d, i) => (
                        <td key={i} className={`py-3 px-3 text-right font-medium ${
                          d.actual_sales > 0
                            ? (d.actual_sales >= d.estimated_sales ? 'text-emerald-400' : 'text-red-400')
                            : 'text-dark-600'
                        }`}>
                          {d.actual_sales > 0 ? formatCurrency(d.actual_sales) : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                      <td className="py-3 px-4 font-bold text-white">Desviación</td>
                      {budgetOverview.annual_data.map((d, i) => {
                        const dev = d.actual_sales - d.estimated_sales;
                        return (
                          <td key={i} className={`py-3 px-3 text-right font-medium ${
                            d.actual_sales > 0
                              ? (dev >= 0 ? 'text-emerald-400' : 'text-red-400')
                              : 'text-dark-600'
                          }`}>
                            {d.actual_sales > 0 ? formatCurrency(dev) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
