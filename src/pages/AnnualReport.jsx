import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, Button, Spinner } from '../components/ui';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, parseLocalDate } from '../utils/formatters';
import { api } from '../services/api';
import { getCachedCategories } from '../services/cache';

const MONTH_NAMES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const INCOME_TYPE_COLORS = {
  'VENTA': '#10B981',
  'CARTERA': '#3B82F6',
  'OTRO': '#F59E0B',
};

const EXPENSE_CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#8B5CF6', '#EC4899', '#3B82F6',
  '#F59E0B', '#14B8A6', '#6366F1', '#da7d41', '#6B7280',
];

export default function AnnualReport() {
  const { currency, theme } = useSettings();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load categories for colors (shared cache)
        let userCatColors = {};
        try {
          const catRes = await getCachedCategories();
          if (catRes.data.grouped?.expense) {
            catRes.data.grouped.expense.forEach((cat) => {
              userCatColors[cat.name] = cat.color;
            });
          }
        } catch (e) { /* ignore */ }
        setCategoryColors(userCatColors);

        // Load all transactions (we need the full year)
        const txRes = await api.getTransactions({ limit: 5000 });
        setTransactions(txRes.data.transactions || []);
      } catch (err) {
        console.error('Annual report error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Filter transactions for selected year
  const yearTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const year = parseLocalDate(t.date).getFullYear();
      return year === selectedYear;
    });
  }, [transactions, selectedYear]);

  const incomes = useMemo(() => yearTransactions.filter((t) => t.type === 'income'), [yearTransactions]);
  const expenses = useMemo(() => yearTransactions.filter((t) => t.type === 'expense'), [yearTransactions]);

  const totalIncome = useMemo(() => incomes.reduce((s, t) => s + parseFloat(t.amount), 0), [incomes]);
  const totalExpense = useMemo(() => expenses.reduce((s, t) => s + parseFloat(t.amount), 0), [expenses]);

  // Get unique income types
  const incomeTypes = useMemo(() => {
    const types = new Set();
    incomes.forEach((t) => types.add(t.category || 'OTRO'));
    return [...types].sort();
  }, [incomes]);

  // Get unique expense categories
  const expenseCategories = useMemo(() => {
    const cats = new Set();
    expenses.forEach((t) => cats.add(t.category || 'Sin categoría'));
    return [...cats].sort();
  }, [expenses]);

  // Build income grid: type × month
  const incomeGrid = useMemo(() => {
    const grid = {};
    incomeTypes.forEach((type) => {
      grid[type] = new Array(12).fill(0);
    });

    incomes.forEach((t) => {
      const month = parseLocalDate(t.date).getMonth();
      const type = t.category || 'OTRO';
      if (!grid[type]) grid[type] = new Array(12).fill(0);
      grid[type][month] += parseFloat(t.amount);
    });

    return grid;
  }, [incomes, incomeTypes]);

  // Build expense grid: category × month
  const expenseGrid = useMemo(() => {
    const grid = {};
    expenseCategories.forEach((cat) => {
      grid[cat] = new Array(12).fill(0);
    });

    expenses.forEach((t) => {
      const month = parseLocalDate(t.date).getMonth();
      const cat = t.category || 'Sin categoría';
      if (!grid[cat]) grid[cat] = new Array(12).fill(0);
      grid[cat][month] += parseFloat(t.amount);
    });

    return grid;
  }, [expenses, expenseCategories]);

  // Monthly totals
  const monthlyIncomeTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    incomes.forEach((t) => {
      const month = parseLocalDate(t.date).getMonth();
      totals[month] += parseFloat(t.amount);
    });
    return totals;
  }, [incomes]);

  const monthlyExpenseTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    expenses.forEach((t) => {
      const month = parseLocalDate(t.date).getMonth();
      totals[month] += parseFloat(t.amount);
    });
    return totals;
  }, [expenses]);

  // Chart data: monthly income vs expense
  const chartData = useMemo(() => {
    return MONTH_NAMES_SHORT.map((name, i) => ({
      month: name,
      Ingresos: Math.round(monthlyIncomeTotals[i] * 100) / 100,
      Gastos: Math.round(monthlyExpenseTotals[i] * 100) / 100,
    }));
  }, [monthlyIncomeTotals, monthlyExpenseTotals]);

  // Row totals
  const getRowTotal = (grid, key) => grid[key]?.reduce((s, v) => s + v, 0) || 0;
  const grandIncomeTotal = Object.values(incomeGrid).reduce(
    (sum, row) => sum + row.reduce((s, v) => s + v, 0), 0
  );
  const grandExpenseTotal = Object.values(expenseGrid).reduce(
    (sum, row) => sum + row.reduce((s, v) => s + v, 0), 0
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-xl">
          <p className="text-dark-400 text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value, currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Informe Anual</h1>
          <p className="text-dark-400 mt-1">
            Resumen financiero del año {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-dark-900 border border-dark-700 rounded-xl">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-l-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2">
              <Calendar className="h-4 w-4 text-gold-400" />
              <span className="text-sm font-medium text-white">{selectedYear}</span>
            </div>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-r-xl transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <Button variant="secondary" size="sm" icon={Download}>
            Exportar
          </Button>
        </div>
      </div>

      {/* Year Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">Total Ingresos {selectedYear}</span>
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome, currency)}</p>
        </Card>
        <Card className="p-5 border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">Total Gastos {selectedYear}</span>
            <ArrowDownRight className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense, currency)}</p>
        </Card>
        <Card className="p-5 border-gold-400/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">Resultado Anual</span>
            <BarChart3 className="h-4 w-4 text-gold-400" />
          </div>
          <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalIncome - totalExpense, currency)}
          </p>
        </Card>
      </div>

      {/* Annual Bar Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Ingresos vs Gastos Mensual</h3>
        <p className="text-sm text-dark-400 mb-6">Comparación mes a mes — {selectedYear}</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e8eaef' : '#2a2a2a'} />
              <XAxis dataKey="month" stroke={theme === 'light' ? '#9096a6' : '#666'} tick={{ fill: theme === 'light' ? '#6b7084' : '#666', fontSize: 12 }} />
              <YAxis stroke={theme === 'light' ? '#9096a6' : '#666'} tick={{ fill: theme === 'light' ? '#6b7084' : '#666', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-dark-300 text-sm">{value}</span>}
              />
              <Bar dataKey="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* INGRESOS Grid: Type × Month - Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <div className="p-4 border-b border-dark-800 flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            INGRESOS {selectedYear}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 min-w-[120px] sticky left-0 bg-dark-800/50">
                  Tipo de Ingreso
                </th>
                {MONTH_NAMES_SHORT.map((m) => (
                  <th key={m} className="text-right py-3 px-3 text-xs font-medium text-dark-400 min-w-[90px]">{m}</th>
                ))}
                <th className="text-right py-3 px-4 text-xs font-semibold text-emerald-400 min-w-[100px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {incomeTypes.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-dark-400">Sin ingresos registrados</td>
                </tr>
              ) : (
                <>
                  {incomeTypes.map((type) => (
                    <tr key={type} className="border-t border-dark-800/50 hover:bg-dark-800/20">
                      <td className="py-3 px-4 font-medium text-white sticky left-0 bg-dark-950">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INCOME_TYPE_COLORS[type] || '#da7d41' }} />
                          {type}
                        </div>
                      </td>
                      {incomeGrid[type]?.map((val, i) => (
                        <td key={i} className={`py-3 px-3 text-right ${val > 0 ? 'text-emerald-400' : 'text-dark-600'}`}>
                          {val > 0 ? formatCurrency(val, currency) : '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {formatCurrency(getRowTotal(incomeGrid, type), currency)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                    <td className="py-3 px-4 font-bold text-white sticky left-0 bg-dark-800/30">TOTAL</td>
                    {monthlyIncomeTotals.map((val, i) => (
                      <td key={i} className={`py-3 px-3 text-right font-semibold ${val > 0 ? 'text-emerald-400' : 'text-dark-600'}`}>
                        {val > 0 ? formatCurrency(val, currency) : '—'}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(grandIncomeTotal, currency)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* INGRESOS - Mobile View */}
      <div className="block md:hidden">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-dark-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              INGRESOS {selectedYear}
            </h3>
          </div>
          <div className="p-4">
            {incomeTypes.length === 0 ? (
              <p className="text-center py-8 text-dark-400">Sin ingresos registrados</p>
            ) : (
              <div className="space-y-4">
                {incomeTypes.map((type) => (
                  <div key={type} className="bg-dark-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: INCOME_TYPE_COLORS[type] || '#da7d41' }}
                      />
                      <h4 className="font-medium text-white">{type}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {MONTH_NAMES.map((month, i) => {
                        const val = incomeGrid[type]?.[i] || 0;
                        if (val === 0) return null;
                        return (
                          <div key={i} className="text-center">
                            <p className="text-xs text-dark-500">{month.substring(0, 3)}</p>
                            <p className="text-xs text-emerald-400 font-medium">
                              {formatCurrency(val, currency)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-dark-700 flex justify-between">
                      <span className="text-xs text-dark-400">Total</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {formatCurrency(getRowTotal(incomeGrid, type), currency)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="bg-dark-900 rounded-lg p-3 border border-emerald-500/20">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">TOTAL ANUAL</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {formatCurrency(grandIncomeTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* GASTOS Grid: Category × Month - Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <div className="p-4 border-b border-dark-800 flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg">
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            GASTOS {selectedYear}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 min-w-[120px] sticky left-0 bg-dark-800/50">
                  Categoría
                </th>
                {MONTH_NAMES_SHORT.map((m) => (
                  <th key={m} className="text-right py-3 px-3 text-xs font-medium text-dark-400 min-w-[90px]">{m}</th>
                ))}
                <th className="text-right py-3 px-4 text-xs font-semibold text-red-400 min-w-[100px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {expenseCategories.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-dark-400">Sin gastos registrados</td>
                </tr>
              ) : (
                <>
                  {expenseCategories.map((cat, catIdx) => (
                    <tr key={cat} className="border-t border-dark-800/50 hover:bg-dark-800/20">
                      <td className="py-3 px-4 font-medium text-white sticky left-0 bg-dark-950">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: categoryColors[cat] || EXPENSE_CATEGORY_COLORS[catIdx % EXPENSE_CATEGORY_COLORS.length] }}
                          />
                          {cat}
                        </div>
                      </td>
                      {expenseGrid[cat]?.map((val, i) => (
                        <td key={i} className={`py-3 px-3 text-right ${val > 0 ? 'text-red-400' : 'text-dark-600'}`}>
                          {val > 0 ? formatCurrency(val, currency) : '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-semibold text-red-400">
                        {formatCurrency(getRowTotal(expenseGrid, cat), currency)}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                    <td className="py-3 px-4 font-bold text-white sticky left-0 bg-dark-800/30">TOTAL</td>
                    {monthlyExpenseTotals.map((val, i) => (
                      <td key={i} className={`py-3 px-3 text-right font-semibold ${val > 0 ? 'text-red-400' : 'text-dark-600'}`}>
                        {val > 0 ? formatCurrency(val, currency) : '—'}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold text-red-400">
                      {formatCurrency(grandExpenseTotal, currency)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* GASTOS - Mobile View */}
      <div className="block md:hidden">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-dark-800 flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              GASTOS {selectedYear}
            </h3>
          </div>
          <div className="p-4">
            {expenseCategories.length === 0 ? (
              <p className="text-center py-8 text-dark-400">Sin gastos registrados</p>
            ) : (
              <div className="space-y-4">
                {expenseCategories.map((cat, catIdx) => (
                  <div key={cat} className="bg-dark-800/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            categoryColors[cat] ||
                            EXPENSE_CATEGORY_COLORS[catIdx % EXPENSE_CATEGORY_COLORS.length],
                        }}
                      />
                      <h4 className="font-medium text-white">{cat}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {MONTH_NAMES.map((month, i) => {
                        const val = expenseGrid[cat]?.[i] || 0;
                        if (val === 0) return null;
                        return (
                          <div key={i} className="text-center">
                            <p className="text-xs text-dark-500">{month.substring(0, 3)}</p>
                            <p className="text-xs text-red-400 font-medium">
                              {formatCurrency(val, currency)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-t border-dark-700 flex justify-between">
                      <span className="text-xs text-dark-400">Total</span>
                      <span className="text-sm font-bold text-red-400">
                        {formatCurrency(getRowTotal(expenseGrid, cat), currency)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="bg-dark-900 rounded-lg p-3 border border-red-500/20">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">TOTAL ANUAL</span>
                    <span className="text-lg font-bold text-red-400">
                      {formatCurrency(grandExpenseTotal, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Result Row (Income - Expenses per month) - Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <div className="p-4 border-b border-dark-800 flex items-center gap-3">
          <div className="p-2 bg-gold-400/10 rounded-lg">
            <BarChart3 className="h-4 w-4 text-gold-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            RESULTADO MENSUAL {selectedYear}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 min-w-[120px] sticky left-0 bg-dark-800/50">
                  Concepto
                </th>
                {MONTH_NAMES_SHORT.map((m) => (
                  <th key={m} className="text-right py-3 px-3 text-xs font-medium text-dark-400 min-w-[90px]">{m}</th>
                ))}
                <th className="text-right py-3 px-4 text-xs font-semibold text-gold-400 min-w-[100px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-dark-800/50">
                <td className="py-3 px-4 font-medium text-emerald-400 sticky left-0 bg-dark-950">Ingresos</td>
                {monthlyIncomeTotals.map((val, i) => (
                  <td key={i} className="py-3 px-3 text-right text-emerald-400">
                    {val > 0 ? formatCurrency(val, currency) : '—'}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-semibold text-emerald-400">{formatCurrency(totalIncome, currency)}</td>
              </tr>
              <tr className="border-t border-dark-800/50">
                <td className="py-3 px-4 font-medium text-red-400 sticky left-0 bg-dark-950">Gastos</td>
                {monthlyExpenseTotals.map((val, i) => (
                  <td key={i} className="py-3 px-3 text-right text-red-400">
                    {val > 0 ? formatCurrency(val, currency) : '—'}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-semibold text-red-400">{formatCurrency(totalExpense, currency)}</td>
              </tr>
              <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                <td className="py-3 px-4 font-bold text-white sticky left-0 bg-dark-800/30">RESULTADO</td>
                {monthlyIncomeTotals.map((inc, i) => {
                  const result = inc - monthlyExpenseTotals[i];
                  return (
                    <td key={i} className={`py-3 px-3 text-right font-semibold ${result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {inc > 0 || monthlyExpenseTotals[i] > 0 ? formatCurrency(result, currency) : '—'}
                    </td>
                  );
                })}
                <td className={`py-3 px-4 text-right font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(totalIncome - totalExpense, currency)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* RESULTADO MENSUAL - Mobile View */}
      <div className="block md:hidden">
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-dark-800 flex items-center gap-3">
            <div className="p-2 bg-gold-400/10 rounded-lg">
              <BarChart3 className="h-4 w-4 text-gold-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              RESULTADO MENSUAL {selectedYear}
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {MONTH_NAMES.map((month, i) => {
                const income = monthlyIncomeTotals[i];
                const expense = monthlyExpenseTotals[i];
                const result = income - expense;
                if (income === 0 && expense === 0) return null;

                return (
                  <div key={i} className="bg-dark-800/30 rounded-lg p-3">
                    <p className="text-sm font-medium text-white mb-2">{month}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">Ingresos</span>
                        <span className="text-emerald-400 font-medium">
                          {formatCurrency(income, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">Gastos</span>
                        <span className="text-red-400 font-medium">
                          {formatCurrency(expense, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-dark-700">
                        <span className="text-xs font-semibold text-white">Resultado</span>
                        <span
                          className={`text-sm font-bold ${
                            result >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {formatCurrency(result, currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Total anual */}
              <div className="bg-dark-900 rounded-lg p-4 border border-gold-400/20">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-dark-400">Total Ingresos</span>
                    <span className="text-sm font-semibold text-emerald-400">
                      {formatCurrency(totalIncome, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-dark-400">Total Gastos</span>
                    <span className="text-sm font-semibold text-red-400">
                      {formatCurrency(totalExpense, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-dark-700">
                    <span className="font-bold text-white">RESULTADO ANUAL</span>
                    <span
                      className={`text-lg font-bold ${
                        totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatCurrency(totalIncome - totalExpense, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
