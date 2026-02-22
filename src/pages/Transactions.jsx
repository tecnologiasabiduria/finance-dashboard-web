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
  Download,
  Filter,
  Receipt,
  Building,
  CreditCard,
  FileCheck,
  Layers,
  Tag,
} from 'lucide-react';
import { Button, Card, ConfirmModal, Spinner, DatePicker } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { getCategoryIcon } from '../utils/categoryIcons';

const TAB_LABELS = {
  income: 'Nuevo Ingreso',
  expense: 'Nuevo Gasto',
  transfer: 'Nueva Transferencia',
  all: 'Nuevo Registro',
};

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

  const [activeTab, setActiveTab] = useState('income');

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
        const [txRes, catRes] = await Promise.all([
          api.getTransactions({ limit: 500 }),
          api.getCategories(),
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
  }, [token]);

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
      setTransactions((prev) => prev.filter((t) => t.id !== deleteModal.transaction.id));
    } catch (err) {
      console.error('Error deleting:', err);
    }
    setDeleting(false);
    setDeleteModal({ open: false, transaction: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const incomeTotal = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const expenseTotal = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const filteredTotal = filteredTransactions.reduce((sum, t) => {
    if (t.type === 'transfer') return sum;
    return sum + (t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount));
  }, 0);

  const incomeCount = transactions.filter((t) => t.type === 'income').length;
  const expenseCount = transactions.filter((t) => t.type === 'expense').length;
  const transferCount = transactions.filter((t) => t.type === 'transfer').length;

  const newLinkType = activeTab === 'all' ? 'income' : activeTab;

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
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={Download}>
            Exportar
          </Button>
          <Link to={`/transactions/new?type=${newLinkType}`}>
            <Button size="sm" icon={Plus}>
              {TAB_LABELS[activeTab]}
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

      {/* Table */}
      <Card className="overflow-hidden">
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
                  <td colSpan={activeTab === 'transfer' ? 6 : 8} className="py-12 text-center text-dark-400">
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
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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
                            <Link to={`/transactions/${t.id}`} className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </Link>
                            <button onClick={() => setDeleteModal({ open: true, transaction: t })} className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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

        {/* Pagination */}
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
                        ? 'bg-gold-400 text-dark-950'
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
