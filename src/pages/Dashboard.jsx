import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  PieChart,
  Plus,
  ArrowRight,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { StatCard, Card, Button, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';

// Colores por defecto para categorías (fallback)
const DEFAULT_CATEGORY_COLORS = {
  'alimentación': '#EF4444',
  'transporte': '#F97316',
  'servicios': '#F59E0B',
  'entretenimiento': '#8B5CF6',
  'salud': '#EC4899',
  'educación': '#3B82F6',
  'otros gastos': '#6B7280',
  'otros': '#6B7280',
};

const FALLBACK_COLORS = ['#D4AF37', '#F4E4BC', '#9A7B1A', '#7C6315', '#5E4A10', '#B8860B'];

// Datos de demostración
const DEMO_DATA = {
  balance: 24850.0,
  totalIncome: 35420.0,
  totalExpenses: 10570.0,
  transactionsCount: 47,
  savingsRate: 70.2,
  monthlyData: [
    { month: 'Ago', ingresos: 28000, gastos: 9500 },
    { month: 'Sep', ingresos: 32000, gastos: 11200 },
    { month: 'Oct', ingresos: 29500, gastos: 8900 },
    { month: 'Nov', ingresos: 35000, gastos: 12100 },
    { month: 'Dic', ingresos: 42000, gastos: 15400 },
    { month: 'Ene', ingresos: 35420, gastos: 10570 },
  ],
  weeklyData: [
    { day: 'Lun', value: 4200 },
    { day: 'Mar', value: 3800 },
    { day: 'Mié', value: 5100 },
    { day: 'Jue', value: 4600 },
    { day: 'Vie', value: 6200 },
    { day: 'Sáb', value: 3200 },
    { day: 'Dom', value: 2100 },
  ],
  expensesByCategory: [
    { name: 'Servicios', value: 3200, color: '#F59E0B' },
    { name: 'Transporte', value: 2100, color: '#F97316' },
    { name: 'Alimentación', value: 1800, color: '#EF4444' },
    { name: 'Entretenimiento', value: 1500, color: '#8B5CF6' },
    { name: 'Otros Gastos', value: 1970, color: '#6B7280' },
  ],
  recentTransactions: [
    {
      id: '1',
      type: 'income',
      description: 'Pago cliente - Proyecto Web',
      amount: 5500.0,
      category: 'Freelance',
      date: '2026-01-28',
    },
    {
      id: '2',
      type: 'expense',
      description: 'Factura electricidad',
      amount: 185.0,
      category: 'Servicios',
      date: '2026-01-27',
    },
    {
      id: '3',
      type: 'income',
      description: 'Transferencia - Inversiones',
      amount: 1200.0,
      category: 'Inversiones',
      date: '2026-01-26',
    },
    {
      id: '4',
      type: 'expense',
      description: 'Suscripción software',
      amount: 49.99,
      category: 'Servicios',
      date: '2026-01-25',
    },
    {
      id: '5',
      type: 'expense',
      description: 'Combustible',
      amount: 120.0,
      category: 'Transporte',
      date: '2026-01-24',
    },
  ],
  targets: [
    { name: 'Meta de ahorro', current: 15000, target: 20000, color: '#D4AF37' },
    { name: 'Fondo emergencia', current: 8500, target: 10000, color: '#10B981' },
    { name: 'Inversión mensual', current: 3200, target: 5000, color: '#3B82F6' },
  ],
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [error, setError] = useState(null);
  const [categoryColors, setCategoryColors] = useState({});

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        
        // Cargar categorías personalizadas para obtener los colores
        let userCategoryColors = { ...DEFAULT_CATEGORY_COLORS };
        
        // En modo demo, cargar de localStorage
        if (token?.startsWith('demo-')) {
          const savedCategories = localStorage.getItem('demo_categories');
          if (savedCategories) {
            const parsed = JSON.parse(savedCategories);
            parsed.expense?.forEach(cat => {
              userCategoryColors[cat.name.toLowerCase()] = cat.color;
            });
          }
        } else {
          // Cargar categorías del backend
          try {
            const categoriesRes = await api.getCategories();
            if (categoriesRes.data.grouped?.expense) {
              categoriesRes.data.grouped.expense.forEach(cat => {
                userCategoryColors[cat.name.toLowerCase()] = cat.color;
              });
            }
          } catch (catErr) {
            console.log('Using default category colors');
          }
        }
        
        setCategoryColors(userCategoryColors);
        
        // Cargar datos del dashboard, estadísticas y metas en paralelo
        const [summaryRes, statsRes, goalsRes] = await Promise.all([
          api.getDashboardSummary(),
          api.getDashboardStats(),
          api.getGoals(),
        ]);
        
        const apiData = summaryRes.data;
        const statsData = statsRes.data;
        const goalsData = goalsRes.data.goals || [];

        // Transformar datos mensuales para el gráfico
        const monthlyData = statsData.monthlyData?.map((m) => ({
          month: m.month,
          ingresos: m.income,
          gastos: m.expense,
        })) || DEMO_DATA.monthlyData;

        // Calcular actividad semanal desde dailyData
        const dailyData = apiData.dailyData || [];
        const weeklyData = calculateWeeklyData(dailyData);

        setData({
          balance: apiData.balance,
          totalIncome: apiData.totalIncome,
          totalExpenses: apiData.totalExpenses,
          transactionsCount: apiData.transactionsCount,
          savingsRate: apiData.savingsRate,
          monthlyData: monthlyData,
          weeklyData: weeklyData.length > 0 ? weeklyData : DEMO_DATA.weeklyData,
          expensesByCategory: apiData.expensesByCategory?.map((cat, i) => ({
            ...cat,
            // Usar el color de la categoría personalizada o fallback
            color: userCategoryColors[cat.name.toLowerCase()] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
          })) || [],
          recentTransactions: apiData.recentTransactions || [],
          targets: goalsData,
        });
        setError(null);
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Error al cargar datos. Usando datos de demostración.');
        
        // En modo demo, calcular datos desde localStorage
        const demoDataWithColors = { ...DEMO_DATA };
        
        // Cargar colores de categorías del localStorage (modo demo)
        const savedCategories = localStorage.getItem('demo_categories');
        const categoryColorMap = { ...DEFAULT_CATEGORY_COLORS };
        
        if (savedCategories) {
          const parsed = JSON.parse(savedCategories);
          parsed.expense?.forEach(cat => {
            categoryColorMap[cat.name.toLowerCase()] = cat.color;
          });
        }
        
        // Cargar transacciones demo y calcular gastos por categoría
        const savedTransactions = JSON.parse(localStorage.getItem('demo_transactions') || '[]');
        
        if (savedTransactions.length > 0) {
          // Calcular gastos por categoría desde transacciones reales
          const expensesByCategory = {};
          let totalExpenses = 0;
          let totalIncome = 0;
          
          savedTransactions.forEach(t => {
            if (t.type === 'expense') {
              const catName = t.category;
              if (!expensesByCategory[catName]) {
                expensesByCategory[catName] = {
                  name: catName,
                  value: 0,
                  color: categoryColorMap[catName.toLowerCase()] || FALLBACK_COLORS[Object.keys(expensesByCategory).length % FALLBACK_COLORS.length],
                };
              }
              expensesByCategory[catName].value += t.amount;
              totalExpenses += t.amount;
            } else {
              totalIncome += t.amount;
            }
          });
          
          // Convertir a array y ordenar por valor
          demoDataWithColors.expensesByCategory = Object.values(expensesByCategory)
            .sort((a, b) => b.value - a.value);
          
          // Actualizar totales
          demoDataWithColors.totalExpenses = totalExpenses;
          demoDataWithColors.totalIncome = DEMO_DATA.totalIncome + totalIncome;
          demoDataWithColors.balance = demoDataWithColors.totalIncome - totalExpenses;
          
          // Últimas transacciones
          demoDataWithColors.recentTransactions = savedTransactions.slice(0, 5);
        } else {
          // Si no hay transacciones, usar datos demo con colores
          demoDataWithColors.expensesByCategory = DEMO_DATA.expensesByCategory.map((cat, i) => ({
            ...cat,
            color: categoryColorMap[cat.name.toLowerCase()] || cat.color,
          }));
        }
        
        setData(demoDataWithColors);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

  // Función para calcular datos semanales
  const calculateWeeklyData = (dailyData) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const weekData = {};
    
    // Inicializar días de la semana
    days.forEach((day) => {
      weekData[day] = { day, value: 0 };
    });

    // Sumar transacciones por día de la semana
    dailyData.forEach((d) => {
      const date = new Date(d.date);
      const dayName = days[date.getDay()];
      weekData[dayName].value += d.income + d.expense;
    });

    // Retornar en orden Lun-Dom
    return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => weekData[d]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            ¡Bienvenido, {user?.name?.split(' ')[0] || 'Usuario'}!
          </h1>
          <p className="text-dark-400 mt-1">
            Aquí tienes un resumen de tu situación financiera
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-900 border border-dark-800 rounded-xl">
            <Calendar className="h-4 w-4 text-dark-400" />
            <span className="text-sm text-dark-300">Enero 2026</span>
          </div>
          <Link to="/transactions/new?type=income">
            <Button size="sm" icon={Plus}>
              Nuevo ingreso
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Balance Total"
          value={formatCurrency(data.balance)}
          icon={Wallet}
          variant="gold"
          trend="up"
          trendValue="12.5%"
        />
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(data.totalIncome)}
          icon={TrendingUp}
          variant="success"
          trend="up"
          trendValue="8.2%"
        />
        <StatCard
          title="Gastos del Mes"
          value={formatCurrency(data.totalExpenses)}
          icon={TrendingDown}
          variant="danger"
          trend="down"
          trendValue="3.1%"
        />
        <StatCard
          title="Tasa de Ahorro"
          value={`${data.savingsRate}%`}
          subtitle={`${data.transactionsCount} transacciones`}
          icon={Target}
          variant="default"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Rendimiento Financiero
              </h3>
              <p className="text-sm text-dark-400">
                Ingresos vs Gastos - Últimos 6 meses
              </p>
            </div>
            <div className="flex gap-2">
              {['week', 'month', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedPeriod === period
                      ? 'bg-gold-400/20 text-gold-400'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="month"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 12 }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 12 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ingresos"
                  name="Ingresos"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  fill="url(#colorIngresos)"
                />
                <Area
                  type="monotone"
                  dataKey="gastos"
                  name="Gastos"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#colorGastos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie Chart */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">
              Gastos por Categoría
            </h3>
            <p className="text-sm text-dark-400">Distribución este mes</p>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={data.expensesByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-dark-900 border border-dark-700 rounded-lg p-3 shadow-xl">
                          <p className="text-white font-medium">{data.name}</p>
                          <p className="text-gold-400">{formatCurrency(data.value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 mt-4">
            {data.expensesByCategory.map((category) => (
              <div key={category.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-dark-300">{category.name}</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {formatCurrency(category.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">
              Actividad Semanal
            </h3>
            <p className="text-sm text-dark-400">Transacciones por día</p>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="day"
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#666', fontSize: 11 }}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Monto" fill="#D4AF37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Targets Progress */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Metas</h3>
              <p className="text-sm text-dark-400">Progreso mensual</p>
            </div>
            <Link to="/goals" className="p-2 hover:bg-dark-800 rounded-lg transition-colors" title="Configurar metas">
              <Target className="h-5 w-5 text-gold-400" />
            </Link>
          </div>

          <div className="space-y-5">
            {data.targets && data.targets.length > 0 ? (
              data.targets.map((target) => {
                const percentage = Math.min(
                  (target.current / target.target) * 100,
                  100
                );
                return (
                  <div key={target.name || target.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-dark-300">{target.name}</span>
                      <span className="text-sm font-medium text-white">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: target.color,
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-xs text-dark-500">
                      <span>{formatCurrency(target.current)}</span>
                      <span>{formatCurrency(target.target)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <p className="text-dark-400 text-sm mb-3">No hay metas configuradas</p>
                <Link to="/goals" className="text-gold-400 text-sm hover:text-gold-300 font-medium">
                  + Agregar primera meta
                </Link>
              </div>
            )}
          </div>
          
          {data.targets && data.targets.length > 0 && (
            <Link 
              to="/goals" 
              className="mt-4 flex items-center justify-center gap-2 text-gold-400 text-sm hover:text-gold-300 font-medium pt-4 border-t border-dark-800"
            >
              Administrar metas
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Acciones Rápidas</h3>
            <p className="text-sm text-dark-400">Operaciones frecuentes</p>
          </div>

          <div className="space-y-3">
            <Link to="/transactions/new?type=income" className="block">
              <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors group">
                <div className="p-3 bg-emerald-500/20 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Registrar Ingreso</p>
                  <p className="text-sm text-dark-400">Añadir nuevo ingreso</p>
                </div>
                <ArrowRight className="h-5 w-5 text-dark-500 group-hover:text-emerald-400 transition-colors" />
              </div>
            </Link>

            <Link to="/transactions/new?type=expense" className="block">
              <div className="flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors group">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <ArrowDownRight className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Registrar Gasto</p>
                  <p className="text-sm text-dark-400">Añadir nuevo gasto</p>
                </div>
                <ArrowRight className="h-5 w-5 text-dark-500 group-hover:text-red-400 transition-colors" />
              </div>
            </Link>

            <Link to="/transactions" className="block">
              <div className="flex items-center gap-4 p-4 bg-gold-400/10 border border-gold-400/20 rounded-xl hover:bg-gold-400/20 transition-colors group">
                <div className="p-3 bg-gold-400/20 rounded-lg">
                  <Activity className="h-5 w-5 text-gold-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Ver Transacciones</p>
                  <p className="text-sm text-dark-400">Historial completo</p>
                </div>
                <ArrowRight className="h-5 w-5 text-dark-500 group-hover:text-gold-400 transition-colors" />
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Transacciones Recientes
            </h3>
            <p className="text-sm text-dark-400">Últimos movimientos</p>
          </div>
          <Link to="/transactions">
            <Button variant="ghost" size="sm" icon={ArrowRight} iconPosition="right">
              Ver todas
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                  Descripción
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                  Categoría
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">
                  Fecha
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-400">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          transaction.type === 'income'
                            ? 'bg-emerald-500/20'
                            : 'bg-red-500/20'
                        }`}
                      >
                        {transaction.type === 'income' ? (
                          <ArrowUpRight
                            className={`h-4 w-4 ${
                              transaction.type === 'income'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                      <span className="text-white font-medium">
                        {transaction.description}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 bg-dark-800 text-dark-300 text-xs rounded-lg">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-dark-400 text-sm">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span
                      className={`font-semibold ${
                        transaction.type === 'income'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
