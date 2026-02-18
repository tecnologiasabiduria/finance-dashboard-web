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
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';

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
  '#F59E0B', '#14B8A6', '#6366F1', '#D4AF37', '#6B7280',
];

export default function AnnualReport() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [transactions, setTransactions] = useState([]);
  const [categoryColors, setCategoryColors] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load categories for colors
        let userCatColors = {};
        try {
          const catRes = await api.getCategories();
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
      const year = new Date(t.date).getFullYear();
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
      const month = new Date(t.date).getMonth();
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
      const month = new Date(t.date).getMonth();
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
      const month = new Date(t.date).getMonth();
      totals[month] += parseFloat(t.amount);
    });
    return totals;
  }, [incomes]);

  const monthlyExpenseTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    expenses.forEach((t) => {
      const month = new Date(t.date).getMonth();
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
              {entry.name}: {formatCurrency(entry.value)}
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
          <div className="flex items-center gap-2 bg-dark-900 border border-dark-800 rounded-xl">
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
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
        </Card>
        <Card className="p-5 border-red-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">Total Gastos {selectedYear}</span>
            <ArrowDownRight className="h-4 w-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpense)}</p>
        </Card>
        <Card className="p-5 border-gold-400/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">Resultado Anual</span>
            <BarChart3 className="h-4 w-4 text-gold-400" />
          </div>
          <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(totalIncome - totalExpense)}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="month" stroke="#666" tick={{ fill: '#666', fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fill: '#666', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
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

      {/* INGRESOS Grid: Type × Month */}
      <Card className="overflow-hidden">
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
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: INCOME_TYPE_COLORS[type] || '#D4AF37' }} />
                          {type}
                        </div>
                      </td>
                      {incomeGrid[type]?.map((val, i) => (
                        <td key={i} className={`py-3 px-3 text-right ${val > 0 ? 'text-emerald-400' : 'text-dark-600'}`}>
                          {val > 0 ? formatCurrency(val) : '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        {formatCurrency(getRowTotal(incomeGrid, type))}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                    <td className="py-3 px-4 font-bold text-white sticky left-0 bg-dark-800/30">TOTAL</td>
                    {monthlyIncomeTotals.map((val, i) => (
                      <td key={i} className={`py-3 px-3 text-right font-semibold ${val > 0 ? 'text-emerald-400' : 'text-dark-600'}`}>
                        {val > 0 ? formatCurrency(val) : '—'}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(grandIncomeTotal)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* GASTOS Grid: Category × Month */}
      <Card className="overflow-hidden">
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
                          {val > 0 ? formatCurrency(val) : '—'}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-right font-semibold text-red-400">
                        {formatCurrency(getRowTotal(expenseGrid, cat))}
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                    <td className="py-3 px-4 font-bold text-white sticky left-0 bg-dark-800/30">TOTAL</td>
                    {monthlyExpenseTotals.map((val, i) => (
                      <td key={i} className={`py-3 px-3 text-right font-semibold ${val > 0 ? 'text-red-400' : 'text-dark-600'}`}>
                        {val > 0 ? formatCurrency(val) : '—'}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right font-bold text-red-400">
                      {formatCurrency(grandExpenseTotal)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Result Row (Income - Expenses per month) */}
      <Card className="overflow-hidden">
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
                    {val > 0 ? formatCurrency(val) : '—'}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-semibold text-emerald-400">{formatCurrency(totalIncome)}</td>
              </tr>
              <tr className="border-t border-dark-800/50">
                <td className="py-3 px-4 font-medium text-red-400 sticky left-0 bg-dark-950">Gastos</td>
                {monthlyExpenseTotals.map((val, i) => (
                  <td key={i} className="py-3 px-3 text-right text-red-400">
                    {val > 0 ? formatCurrency(val) : '—'}
                  </td>
                ))}
                <td className="py-3 px-4 text-right font-semibold text-red-400">{formatCurrency(totalExpense)}</td>
              </tr>
              <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                <td className="py-3 px-4 font-bold text-white sticky left-0 bg-dark-800/30">RESULTADO</td>
                {monthlyIncomeTotals.map((inc, i) => {
                  const result = inc - monthlyExpenseTotals[i];
                  return (
                    <td key={i} className={`py-3 px-3 text-right font-semibold ${result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {inc > 0 || monthlyExpenseTotals[i] > 0 ? formatCurrency(result) : '—'}
                    </td>
                  );
                })}
                <td className={`py-3 px-4 text-right font-bold ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(totalIncome - totalExpense)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
