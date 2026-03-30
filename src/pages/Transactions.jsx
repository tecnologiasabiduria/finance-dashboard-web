import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Receipt,
  Building,
  CreditCard,
  FileCheck,
  Layers,
  Tag,
  Download,
  Copy,
  Printer,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button, Card, ConfirmModal, Spinner, DatePicker } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { getCachedCategories, invalidateDashboardCache, invalidateCarteraCache } from '../services/cache';
import { getCategoryIcon } from '../utils/categoryIcons';

const TAB_LABELS = {
  income: 'Nuevo Ingreso',
  expense: 'Nuevo Gasto',
  transfer: 'Nueva Transferencia',
  all: 'Nuevo Registro',
};

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const SEARCH_PLACEHOLDERS = {
  income: 'Buscar por cliente, factura, tipo...',
  expense: 'Buscar por proveedor, categoría, método...',
  transfer: 'Buscar por cuenta, notas...',
  all: 'Buscar por nombre, proveedor, cuenta...',
};

const EMPTY_LABELS = {
  income: 'ingresos',
  expense: 'gastos',
  transfer: 'transferencias',
  all: 'transacciones',
};

function getTransactionDetail(t) {
  if (t.type === 'income') return t.client_name || t.category || '—';
  if (t.type === 'expense') return t.provider_name || t.category || '—';
  if (t.type === 'transfer') {
    const src = t.source_account || '?';
    const dst = t.destination_account || '?';
    return `${src} → ${dst}`;
  }
  return '—';
}

export default function Transactions() {
  const { token } = useAuth();
  const { currency } = useSettings();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all');

  // Month navigator
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [showAllMonths, setShowAllMonths] = useState(false);

  const goToPrevMonth = () => {
    setShowAllMonths(false);
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    setShowAllMonths(false);
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [deleteModal, setDeleteModal] = useState({ open: false, transaction: null });
  const [deleting, setDeleting] = useState(false);
  const [categoryMap, setCategoryMap] = useState({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const txParams = { limit: 500 };
        if (!showAllMonths) {
          const startDate = new Date(selectedYear, selectedMonth, 1);
          const endDate = new Date(selectedYear, selectedMonth + 1, 0);
          txParams.from = startDate.toISOString().split('T')[0];
          txParams.to = endDate.toISOString().split('T')[0];
        }

        const [txRes, catRes] = await Promise.all([
          api.getTransactions(txParams),
          getCachedCategories(),
        ]);
        setTransactions(txRes.data.transactions || []);
        const cats = catRes.data.categories || [];
        const map = {};
        for (const c of cats) {
          map[c.name] = { icon: c.icon, color: c.color };
        }
        setCategoryMap(map);
      } catch (err) {
        console.error('Error loading data:', err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token, selectedMonth, selectedYear, showAllMonths]);

  useEffect(() => {
    let filtered = activeTab === 'all'
      ? [...transactions]
      : transactions.filter((t) => t.type === activeTab);

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((t) => {
        if (t.type === 'income') {
          return (
            (t.client_name || '').toLowerCase().includes(search) ||
            (t.invoice_number || '').toLowerCase().includes(search) ||
            (t.category || '').toLowerCase().includes(search) ||
            (t.description || '').toLowerCase().includes(search)
          );
        } else if (t.type === 'expense') {
          return (
            (t.provider_name || '').toLowerCase().includes(search) ||
            (t.category || '').toLowerCase().includes(search) ||
            (t.description || '').toLowerCase().includes(search) ||
            (t.payment_method || '').toLowerCase().includes(search)
          );
        } else {
          return (
            (t.source_account || '').toLowerCase().includes(search) ||
            (t.destination_account || '').toLowerCase().includes(search) ||
            (t.description || '').toLowerCase().includes(search)
          );
        }
      });
    }

    if (dateFrom) filtered = filtered.filter((t) => t.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((t) => t.date <= dateTo);

    // Siempre ordenar de más reciente a más antiguo (descendente)
    filtered.sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [transactions, activeTab, searchTerm, dateFrom, dateTo]);

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  // Running balance: ordenado de más antiguo a más nuevo, acumulando saldo
  const runningBalanceMap = useMemo(() => {
    if (activeTab !== 'all') return {};
    const sorted = [...filteredTransactions].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    const map = {};
    let balance = 0;
    for (const t of sorted) {
      if (t.type === 'income') balance += parseFloat(t.amount);
      else if (t.type === 'expense') balance -= parseFloat(t.amount);
      map[t.id] = balance;
    }
    return map;
  }, [filteredTransactions, activeTab]);

  const handleDelete = async () => {
    if (!deleteModal.transaction) return;
    setDeleting(true);
    try {
      await api.deleteTransaction(deleteModal.transaction.id);
      invalidateDashboardCache();
      invalidateCarteraCache();
      setTransactions((prev) => prev.filter((t) => t.id !== deleteModal.transaction.id));
    } catch (err) {
      console.error('Error deleting:', err);
    }
    setDeleting(false);
    setDeleteModal({ open: false, transaction: null });
  };

  // Memoized totals — solo se recalculan cuando transactions/filteredTransactions cambian
  const { incomeTotal, expenseTotal, incomeCount, expenseCount, transferCount } = useMemo(() => {
    let incTotal = 0, expTotal = 0, incCount = 0, expCount = 0, transCount = 0;
    for (const t of transactions) {
      if (t.type === 'income') {
        incTotal += parseFloat(t.amount);
        incCount++;
      } else if (t.type === 'expense') {
        expTotal += parseFloat(t.amount);
        expCount++;
      } else if (t.type === 'transfer') {
        transCount++;
      }
    }
    return { incomeTotal: incTotal, expenseTotal: expTotal, incomeCount: incCount, expenseCount: expCount, transferCount: transCount };
  }, [transactions]);

  const filteredTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => {
      if (t.type === 'transfer') return sum;
      return sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
    }, 0);
  }, [filteredTransactions]);

  // Excel export
  const exportToExcel = () => {
    const data = filteredTransactions.map((t) => {
      const row = {
        Fecha: formatDate(t.date, 'medium'),
        Tipo: t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia',
        Detalle: getTransactionDetail(t),
      };
      if (activeTab === 'all' || activeTab === 'income') {
        row['Factura Nº'] = t.invoice_number || '';
        row['Cliente'] = t.client_name || '';
        row['Documento'] = t.client_document || '';
        row['Estado'] = t.invoice_status || '';
      }
      if (activeTab === 'all' || activeTab === 'expense') {
        row['Categoría'] = t.category || '';
        row['Proveedor'] = t.provider_name || '';
        row['Doc. Proveedor'] = t.provider_document || '';
        row['Método de Pago'] = t.payment_method || '';
      }
      if (activeTab === 'all' || activeTab === 'transfer') {
        row['Cuenta Origen'] = t.source_account || '';
        row['Cuenta Destino'] = t.destination_account || '';
      }
      row['Monto'] = parseFloat(t.amount);
      if (activeTab === 'all') {
        row['Saldo'] = runningBalanceMap[t.id] ?? 0;
      }
      row['Notas'] = t.description || '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...data.map((r) => String(r[key] || '').length).slice(0, 50)) + 2,
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

    const period = showAllMonths ? 'Todos' : `${MONTH_NAMES[selectedMonth]}_${selectedYear}`;
    const tabLabel = activeTab === 'all' ? '' : `_${EMPTY_LABELS[activeTab]}`;
    XLSX.writeFile(wb, `Transacciones_${period}${tabLabel}.xlsx`);
  };

  // Duplicate a transaction
  const handleDuplicate = (t) => {
    const params = new URLSearchParams({ type: t.type });
    // Pre-fill via sessionStorage so TransactionForm can pick it up
    sessionStorage.setItem('duplicateTransaction', JSON.stringify({
      amount: String(t.amount),
      category: t.category || '',
      description: t.description || '',
      invoice_number: '',
      client_document: t.client_document || '',
      client_name: t.client_name || '',
      client_address: t.client_address || '',
      client_email: t.client_email || '',
      client_phone: t.client_phone || '',
      invoice_status: t.invoice_status || '',
      provider_document: t.provider_document || '',
      provider_name: t.provider_name || '',
      payment_method: t.payment_method || '',
      source_account: t.source_account || '',
      destination_account: t.destination_account || '',
    }));
    window.location.href = `/transactions/new?${params.toString()}`;
  };

  // Print current view
  const handlePrint = () => {
    window.print();
  };

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
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-56 rounded-xl" />
            <Skeleton className="h-10 w-16 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
        </div>

        {/* Summary cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-36" />
              </div>
              <Skeleton className="h-11 w-11 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <Skeleton className="h-11 w-full max-w-lg rounded-xl" />

        {/* Filters skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <div className="flex gap-2 items-center">
              <Skeleton className="h-10 w-36 rounded-lg" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="bg-dark-800/50 px-4 py-4">
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4 border-t border-dark-800/50">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const newLinkType = activeTab === 'all' ? 'income' : activeTab;
  const newLinkDate = !showAllMonths
    ? `&date=${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
    : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Transacciones</h1>
          <p className="text-dark-400 mt-1">
            Gestiona tus ingresos, gastos y transferencias
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1 sm:gap-2 bg-dark-900 border border-dark-700 rounded-xl">
            <button
              onClick={goToPrevMonth}
              className="p-2 sm:p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-l-xl transition-colors"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold-400" />
              <span className="text-xs sm:text-sm font-medium text-white min-w-[100px] sm:min-w-[130px] text-center">
                {showAllMonths ? 'Todos los meses' : `${MONTH_NAMES[selectedMonth]} ${selectedYear}`}
              </span>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 sm:p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-r-xl transition-colors"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
          <button
            onClick={() => setShowAllMonths(!showAllMonths)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-xl border transition-all ${
              showAllMonths
                ? 'bg-gold-400/20 text-gold-400 border-gold-400/30'
                : 'bg-dark-900 text-dark-400 border-dark-700 hover:text-white hover:bg-dark-800'
            }`}
          >
            Todos
          </button>
          {filteredTransactions.length > 0 && (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={Printer}
                onClick={handlePrint}
                className="print:hidden"
              >
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={exportToExcel}
              >
                <span className="hidden sm:inline">Excel</span>
              </Button>
            </>
          )}
          <Link to={`/transactions/new?type=${newLinkType}${newLinkDate}`}>
            <Button size="sm" icon={Plus}>
              <span className="hidden sm:inline">{TAB_LABELS[activeTab]}</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-900/50 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Total Ingresos</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(incomeTotal, currency)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-dark-900/50 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Total Gastos</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(expenseTotal, currency)}</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg">
            <ArrowDownRight className="h-5 w-5 text-red-400" />
          </div>
        </div>
        <div className="bg-dark-900/50 border border-gold-400/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Resultado</p>
            <p className={`text-2xl font-bold ${incomeTotal - expenseTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(incomeTotal - expenseTotal, currency)}
            </p>
          </div>
          <div className="p-3 bg-gold-400/10 rounded-lg">
            <Filter className="h-5 w-5 text-gold-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 sm:gap-2 p-1 bg-dark-900/50 rounded-xl w-max sm:w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-gold-400/20 text-gold-400'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            Todos ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap ${
              activeTab === 'income'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">Ingresos ({incomeCount})</span>
            <span className="sm:hidden">Ing. ({incomeCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('expense')}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap ${
              activeTab === 'expense'
                ? 'bg-red-500/20 text-red-400'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            <ArrowDownRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">Gastos ({expenseCount})</span>
            <span className="sm:hidden">Gast. ({expenseCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-base transition-all whitespace-nowrap ${
              activeTab === 'transfer'
                ? 'bg-white/10 text-white'
                : 'text-dark-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden sm:inline">Transferencias ({transferCount})</span>
            <span className="sm:hidden">Transf. ({transferCount})</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
            <input
              type="text"
              placeholder={SEARCH_PLACEHOLDERS[activeTab]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg
                       text-white placeholder-dark-500 text-sm
                       focus:outline-none focus:border-gold-400/50 transition-all duration-300"
            />
          </div>
          <div className="flex gap-2 items-center">
            <DatePicker
              name="dateFrom"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Desde"
            />
            <span className="text-dark-500">a</span>
            <DatePicker
              name="dateTo"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Hasta"
            />
          </div>
        </div>
      </Card>

      {/* Total filtrado */}
      {(searchTerm || dateFrom || dateTo) && (
        <div className="text-sm text-dark-400">
          {filteredTransactions.length} resultados — Total: <span className={`font-semibold ${
            activeTab === 'income' ? 'text-emerald-400' :
            activeTab === 'expense' ? 'text-red-400' :
            activeTab === 'transfer' ? 'text-white' :
            'text-gold-400'
          }`}>{formatCurrency(activeTab === 'transfer' ? filteredTransactions.reduce((s, t) => s + parseFloat(t.amount), 0) : Math.abs(filteredTotal), currency)}</span>
        </div>
      )}

      {/* Table - Desktop */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50">
                {activeTab === 'income' && (
                  <>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Fecha</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Factura Nº</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Tipo</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Nombre</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Documento</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Ingreso {currency}</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Status</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Acciones</th>
                  </>
                )}
                {activeTab === 'expense' && (
                  <>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Fecha</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Documento</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Proveedor</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Categoría</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Método de Pago</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Gasto {currency}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Notas</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Acciones</th>
                  </>
                )}
                {activeTab === 'transfer' && (
                  <>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Fecha</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Cuenta Origen</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Cuenta Destino</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Monto {currency}</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Notas</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Acciones</th>
                  </>
                )}
                {activeTab === 'all' && (
                  <>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Fecha</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Detalle</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Tipo</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Monto {currency}</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Saldo {currency}</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'transfer' || activeTab === 'all' ? 6 : 8} className="py-12 text-center text-dark-400">
                    No se encontraron {EMPTY_LABELS[activeTab]}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="border-t border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    {activeTab === 'income' && (
                      <>
                        <td className="py-3 px-4 text-dark-300 text-sm">{formatDate(t.date, 'medium')}</td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.invoice_number || '—'}</td>
                        <td className="py-3 px-4">
                          {(() => {
                            const catInfo = categoryMap[t.category];
                            const Icon = catInfo ? getCategoryIcon(catInfo.icon) : Tag;
                            const color = catInfo?.color || '#F59E0B';
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {t.category || '—'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{t.client_name || '—'}</td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.client_document || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-emerald-400">{formatCurrency(t.amount, currency)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.invoice_status ? (
                            <span className={`inline-flex items-center px-2.5 py-1 text-xs rounded-lg font-medium ${
                              t.invoice_status === 'FACTURADO'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {t.invoice_status}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleDuplicate(t)} className="p-1.5 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </button>
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'expense' && (
                      <>
                        <td className="py-3 px-4 text-dark-300 text-sm">{formatDate(t.date, 'medium')}</td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.provider_document || '—'}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{t.provider_name || '—'}</td>
                        <td className="py-3 px-4">
                          {(() => {
                            const catInfo = categoryMap[t.category];
                            const Icon = catInfo ? getCategoryIcon(catInfo.icon) : Tag;
                            const color = catInfo?.color || '#6B7280';
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium"
                                style={{ backgroundColor: `${color}20`, color }}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {t.category || '—'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.payment_method || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-red-400">{formatCurrency(t.amount, currency)}</span>
                        </td>
                        <td className="py-3 px-4 text-dark-400 text-sm max-w-[200px] truncate">{t.description || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleDuplicate(t)} className="p-1.5 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </button>
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'transfer' && (
                      <>
                        <td className="py-3 px-4 text-dark-300 text-sm">{formatDate(t.date, 'medium')}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{t.source_account || '—'}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{t.destination_account || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-white">{formatCurrency(t.amount, currency)}</span>
                        </td>
                        <td className="py-3 px-4 text-dark-400 text-sm max-w-[200px] truncate">{t.description || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleDuplicate(t)} className="p-1.5 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </button>
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    {activeTab === 'all' && (
                      <>
                        <td className="py-3 px-4 text-dark-300 text-sm">{formatDate(t.date, 'medium')}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{getTransactionDetail(t)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg font-medium ${
                            t.type === 'income' ? 'bg-emerald-500/20 text-emerald-400' :
                            t.type === 'expense' ? 'bg-red-500/20 text-red-400' :
                            'bg-white/10 text-white'
                          }`}>
                            {t.type === 'income' && <ArrowUpRight className="h-3 w-3" />}
                            {t.type === 'expense' && <ArrowDownRight className="h-3 w-3" />}
                            {t.type === 'transfer' && <ArrowLeftRight className="h-3 w-3" />}
                            {t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${
                            t.type === 'income' ? 'text-emerald-400' :
                            t.type === 'expense' ? 'text-red-400' :
                            'text-white'
                          }`}>
                            {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{formatCurrency(t.amount, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${
                            (runningBalanceMap[t.id] ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(runningBalanceMap[t.id] ?? 0, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleDuplicate(t)} className="p-1.5 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Duplicar">
                              <Copy className="h-4 w-4" />
                            </button>
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Desktop */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-dark-800">
            <p className="text-sm text-dark-400">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-gold-400 text-white'
                        : 'text-dark-400 hover:text-white hover:bg-dark-800'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Mobile Cards View */}
      <div className="block md:hidden space-y-3">
        {paginatedTransactions.length === 0 ? (
          <Card className="p-8 text-center text-dark-400">
            No se encontraron {EMPTY_LABELS[activeTab]}
          </Card>
        ) : (
          <>
            {paginatedTransactions.map((t) => {
              const catInfo = categoryMap[t.category];
              const Icon = catInfo ? getCategoryIcon(catInfo.icon) : Tag;
              const color = catInfo?.color || (t.type === 'income' ? '#F59E0B' : '#6B7280');

              return (
                <Card key={t.id} className="p-4">
                  {/* Header: Date & Type Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-dark-400">{formatDate(t.date, 'medium')}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${
                        t.type === 'income'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : t.type === 'expense'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      {t.type === 'income' && <ArrowUpRight className="h-3 w-3" />}
                      {t.type === 'expense' && <ArrowDownRight className="h-3 w-3" />}
                      {t.type === 'transfer' && <ArrowLeftRight className="h-3 w-3" />}
                      {t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia'}
                    </span>
                  </div>

                  {/* Main Info */}
                  {t.type === 'income' && (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{t.client_name || '—'}</p>
                          {t.invoice_number && (
                            <p className="text-xs text-dark-400">Factura: {t.invoice_number}</p>
                          )}
                          {t.client_document && (
                            <p className="text-xs text-dark-400">{t.client_document}</p>
                          )}
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-lg font-bold text-emerald-400">{formatCurrency(t.amount, currency)}</p>
                          {t.invoice_status && (
                            <span
                              className={`inline-flex px-2 py-0.5 text-[10px] rounded mt-1 ${
                                t.invoice_status === 'FACTURADO'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {t.invoice_status}
                            </span>
                          )}
                        </div>
                      </div>
                      {t.category && (
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          <Icon className="h-3 w-3" />
                          {t.category}
                        </div>
                      )}
                    </div>
                  )}

                  {t.type === 'expense' && (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{t.provider_name || '—'}</p>
                          {t.provider_document && (
                            <p className="text-xs text-dark-400">{t.provider_document}</p>
                          )}
                          {t.payment_method && (
                            <p className="text-xs text-dark-400">{t.payment_method}</p>
                          )}
                          {t.description && (
                            <p className="text-xs text-dark-500 mt-1 line-clamp-2">{t.description}</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-red-400 ml-3">{formatCurrency(t.amount, currency)}</p>
                      </div>
                      {t.category && (
                        <div
                          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg"
                          style={{ backgroundColor: `${color}20`, color }}
                        >
                          <Icon className="h-3 w-3" />
                          {t.category}
                        </div>
                      )}
                    </div>
                  )}

                  {t.type === 'transfer' && (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-400">De: <span className="text-white">{t.source_account || '—'}</span></p>
                          <p className="text-sm text-dark-400">A: <span className="text-white">{t.destination_account || '—'}</span></p>
                          {t.description && (
                            <p className="text-xs text-dark-500 mt-1 line-clamp-2">{t.description}</p>
                          )}
                        </div>
                        <p className="text-lg font-bold text-white ml-3">{formatCurrency(t.amount, currency)}</p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'all' && (
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{getTransactionDetail(t)}</p>
                        {t.category && (
                          <div
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg mt-1"
                            style={{ backgroundColor: `${color}20`, color }}
                          >
                            <Icon className="h-3 w-3" />
                            {t.category}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-3">
                        <p
                          className={`text-lg font-bold ${
                            t.type === 'income' ? 'text-emerald-400' : t.type === 'expense' ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                          {formatCurrency(t.amount, currency)}
                        </p>
                        <p className="text-xs text-dark-400 mt-0.5">
                          Saldo:{' '}
                          <span
                            className={`font-medium ${
                              (runningBalanceMap[t.id] ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {formatCurrency(runningBalanceMap[t.id] ?? 0, currency)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 pt-3 mt-3 border-t border-dark-800">
                    <button
                      onClick={() => handleDuplicate(t)}
                      className="p-2 text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/transactions/${t.id}`}
                      className="p-2 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => setDeleteModal({ open: true, transaction: t })}
                      className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              );
            })}

            {/* Pagination - Mobile */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm text-dark-400">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, transaction: null })}
        onConfirm={handleDelete}
        title="Eliminar registro"
        message={`¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
