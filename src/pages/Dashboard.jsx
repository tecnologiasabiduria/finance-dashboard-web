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
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load categories for colors
        let userCategoryColors = {};
        try {
          const catRes = await api.getCategories();
          if (catRes.data.grouped?.expense) {
            catRes.data.grouped.expense.forEach((cat) => {
              userCategoryColors[cat.name] = cat.color;
            });
          }
        } catch (e) {
          // Ignore — use fallbacks
        }
        setCategoryColors(userCategoryColors);

        // Load summary for selected month and all transactions
        const [summaryRes, txRes] = await Promise.all([
          api.getDashboardSummary({ month: selectedMonth + 1, year: selectedYear }),
          api.getTransactions({ limit: 1000 }),
        ]);

        setSummaryData(summaryRes.data);

        // Filter transactions for selected month
        const startDate = new Date(selectedYear, selectedMonth, 1);
        const endDate = new Date(selectedYear, selectedMonth + 1, 0);
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const allTx = txRes.data.transactions || [];
        const monthTx = allTx.filter((t) => t.date >= startStr && t.date <= endStr);
        setMonthTransactions(monthTx);

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
        color: INCOME_TYPE_COLORS[name] || '#D4AF37',
        percentage: totalIncome > 0 ? ((value / totalIncome) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [incomes, totalIncome]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
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
          <div className="flex items-center gap-2 bg-dark-900 border border-dark-800 rounded-xl">
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

      {/* RESULTADO Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 md:col-span-1 bg-gradient-to-br from-dark-900 to-dark-950 border-gold-400/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">Resultado</span>
            <Wallet className="h-5 w-5 text-gold-400" />
          </div>
          <p className={`text-3xl font-bold ${resultado >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(resultado, currency)}
          </p>
          <p className="text-xs text-dark-500 mt-2">Ingresos − Gastos</p>
        </Card>

        <Card className="p-6 border-emerald-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">Total Ingresos</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <ArrowUpRight className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{formatCurrency(totalIncome, currency)}</p>
          <p className="text-xs text-dark-500 mt-2">{incomes.length} registros</p>
        </Card>

        <Card className="p-6 border-red-500/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-dark-400 uppercase tracking-wider">Total Gastos</span>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <ArrowDownRight className="h-4 w-4 text-red-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-400">{formatCurrency(totalExpense, currency)}</p>
          <p className="text-xs text-dark-500 mt-2">{expenses.length} registros</p>
        </Card>
      </div>

      {/* Breakdown: Income by Type + Expenses by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                {incomeByType.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-dark-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">{formatCurrency(item.value, currency)}</span>
                      <span className="text-xs text-dark-500 ml-2">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
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
                {expenseByCategory.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-dark-300">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-white">{formatCurrency(item.value, currency)}</span>
                      <span className="text-xs text-dark-500 ml-2">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
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
                          <span className={`inline-flex px-2 py-0.5 text-xs rounded font-medium ${
                            t.category === 'VENTA' ? 'bg-emerald-500/20 text-emerald-400'
                            : t.category === 'CARTERA' ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t.category || 'OTRO'}
                          </span>
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
                          <span className="inline-flex px-2 py-0.5 bg-dark-800 text-dark-300 text-xs rounded">
                            {t.category || '—'}
                          </span>
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
    </div>
  );
}
