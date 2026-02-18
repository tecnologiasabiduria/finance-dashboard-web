import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
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
} from 'lucide-react';
import { Button, Card, ConfirmModal, Spinner, DatePicker } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Transactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active tab: 'income' or 'expense'
  const [activeTab, setActiveTab] = useState('income');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, transaction: null });
  const [deleting, setDeleting] = useState(false);

  // Cargar transacciones
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.getTransactions({ limit: 500 });
        setTransactions(response.data.transactions || []);
      } catch (err) {
        console.error('Error loading transactions:', err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, [token]);

  useEffect(() => {
    let filtered = transactions.filter((t) => t.type === activeTab);

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((t) => {
        if (activeTab === 'income') {
          return (
            (t.client_name || '').toLowerCase().includes(search) ||
            (t.invoice_number || '').toLowerCase().includes(search) ||
            (t.category || '').toLowerCase().includes(search) ||
            (t.description || '').toLowerCase().includes(search)
          );
        } else {
          return (
            (t.provider_name || '').toLowerCase().includes(search) ||
            (t.category || '').toLowerCase().includes(search) ||
            (t.description || '').toLowerCase().includes(search) ||
            (t.payment_method || '').toLowerCase().includes(search)
          );
        }
      });
    }

    if (dateFrom) filtered = filtered.filter((t) => t.date >= dateFrom);
    if (dateTo) filtered = filtered.filter((t) => t.date <= dateTo);

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [transactions, activeTab, searchTerm, dateFrom, dateTo]);

  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

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
  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Transacciones</h1>
          <p className="text-dark-400 mt-1">
            Gestiona tus ingresos y gastos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={Download}>
            Exportar
          </Button>
          <Link to={`/transactions/new?type=${activeTab}`}>
            <Button size="sm" icon={Plus}>
              {activeTab === 'income' ? 'Nuevo Ingreso' : 'Nuevo Gasto'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-900/50 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Total Ingresos</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(incomeTotal)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-dark-900/50 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Total Gastos</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(expenseTotal)}</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg">
            <ArrowDownRight className="h-5 w-5 text-red-400" />
          </div>
        </div>
        <div className="bg-dark-900/50 border border-gold-400/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Resultado</p>
            <p className={`text-2xl font-bold ${incomeTotal - expenseTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(incomeTotal - expenseTotal)}
            </p>
          </div>
          <div className="p-3 bg-gold-400/10 rounded-lg">
            <Filter className="h-5 w-5 text-gold-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-dark-900/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'income'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Ingresos ({transactions.filter((t) => t.type === 'income').length})
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'expense'
              ? 'bg-red-500/20 text-red-400'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <ArrowDownRight className="h-4 w-4" />
          Gastos ({transactions.filter((t) => t.type === 'expense').length})
        </button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
            <input
              type="text"
              placeholder={activeTab === 'income' ? 'Buscar por cliente, factura, tipo...' : 'Buscar por proveedor, categoría, método...'}
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
          {filteredTransactions.length} resultados — Total: <span className={`font-semibold ${activeTab === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(filteredTotal)}</span>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50">
                {activeTab === 'income' ? (
                  <>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Fecha</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Factura Nº</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Tipo</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Nombre</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Documento</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Ingreso COP</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Status</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Acciones</th>
                  </>
                ) : (
                  <>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Fecha</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Documento</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Proveedor</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Categoría</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Método de Pago</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-dark-400">Gasto COP</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-dark-400">Notas</th>
                    <th className="text-center py-4 px-4 text-sm font-medium text-dark-400">Acciones</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-dark-400">
                    No se encontraron {activeTab === 'income' ? 'ingresos' : 'gastos'}
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="border-t border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    {activeTab === 'income' ? (
                      <>
                        <td className="py-3 px-4 text-dark-300 text-sm">{formatDate(t.date, 'medium')}</td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.invoice_number || '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs rounded-lg font-medium ${
                            t.category === 'VENTA' ? 'bg-emerald-500/20 text-emerald-400' :
                            t.category === 'CARTERA' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t.category || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{t.client_name || '—'}</td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.client_document || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-emerald-400">{formatCurrency(t.amount)}</span>
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
                    ) : (
                      <>
                        <td className="py-3 px-4 text-dark-300 text-sm">{formatDate(t.date, 'medium')}</td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.provider_document || '—'}</td>
                        <td className="py-3 px-4 text-white font-medium text-sm">{t.provider_name || '—'}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 bg-dark-800 text-dark-300 text-xs rounded-lg">
                            {t.category || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-dark-300 text-sm">{t.payment_method || '—'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-red-400">{formatCurrency(t.amount)}</span>
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
