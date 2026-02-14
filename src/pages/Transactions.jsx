import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Edit2,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';
import { Button, Card, Select, ConfirmModal, Spinner } from '../components/ui';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const CATEGORIES = {
  income: ['Todos', 'Salario', 'Freelance', 'Inversiones', 'Otros'],
  expense: ['Todos', 'Alimentación', 'Transporte', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Otros'],
};

export default function Transactions() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Delete modal
  const [deleteModal, setDeleteModal] = useState({ open: false, transaction: null });
  const [deleting, setDeleting] = useState(false);

  // Active dropdown
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Cargar transacciones
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const response = await api.getTransactions({ limit: 100 });
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
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((t) =>
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'Todos') {
      filtered = filtered.filter((t) => t.category === categoryFilter);
    }

    // Date filters
    if (dateFrom) {
      filtered = filtered.filter((t) => t.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((t) => t.date <= dateTo);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    setFilteredTransactions(filtered);
    setCurrentPage(1);
  }, [transactions, searchTerm, typeFilter, categoryFilter, dateFrom, dateTo]);

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
      console.error('Error deleting transaction:', err);
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

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Transacciones</h1>
          <p className="text-dark-400 mt-1">
            Gestiona todos tus movimientos financieros
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={Download}>
            Exportar
          </Button>
          <Link to="/transactions/new">
            <Button size="sm" icon={Plus}>
              Nueva transacción
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-900/50 border border-dark-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Total Transacciones</p>
            <p className="text-2xl font-bold text-white">{filteredTransactions.length}</p>
          </div>
          <div className="p-3 bg-gold-400/10 rounded-lg">
            <Filter className="h-5 w-5 text-gold-400" />
          </div>
        </div>
        <div className="bg-dark-900/50 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Ingresos</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <ArrowUpRight className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <div className="bg-dark-900/50 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-dark-400">Gastos</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg">
            <ArrowDownRight className="h-5 w-5 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
            <input
              type="text"
              placeholder="Buscar por descripción o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-lg
                       text-white placeholder-dark-500 text-sm
                       focus:outline-none focus:border-gold-400/50
                       transition-all duration-300"
            />
          </div>

          {/* Type Filter */}
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'income', label: 'Ingresos' },
              { value: 'expense', label: 'Gastos' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTypeFilter(option.value)}
                className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  typeFilter === option.value
                    ? 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                    : 'bg-dark-800 text-dark-400 border border-dark-700 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Date Filters */}
          <div className="flex gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10 pr-3 py-2.5 bg-dark-800 border border-dark-700 rounded-lg
                         text-white text-sm focus:outline-none focus:border-gold-400/50"
              />
            </div>
            <span className="flex items-center text-dark-500">a</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 bg-dark-800 border border-dark-700 rounded-lg
                       text-white text-sm focus:outline-none focus:border-gold-400/50"
            />
          </div>
        </div>
      </Card>

      {/* Transactions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="text-left py-4 px-6 text-sm font-medium text-dark-400">
                  Descripción
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-dark-400">
                  Categoría
                </th>
                <th className="text-left py-4 px-6 text-sm font-medium text-dark-400">
                  Fecha
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-dark-400">
                  Monto
                </th>
                <th className="text-center py-4 px-6 text-sm font-medium text-dark-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-dark-400">
                    No se encontraron transacciones
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-dark-800/50 hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            transaction.type === 'income'
                              ? 'bg-emerald-500/20'
                              : 'bg-red-500/20'
                          }`}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-400" />
                          )}
                        </div>
                        <span className="text-white font-medium">
                          {transaction.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 bg-dark-800 text-dark-300 text-xs rounded-lg">
                        {transaction.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-dark-400 text-sm">
                      {formatDate(transaction.date, 'medium')}
                    </td>
                    <td className="py-4 px-6 text-right">
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
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/transactions/${transaction.id}`}
                          className="p-2 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, transaction })}
                          className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
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
              Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de{' '}
              {filteredTransactions.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, transaction: null })}
        onConfirm={handleDelete}
        title="Eliminar transacción"
        message={`¿Estás seguro de que deseas eliminar "${deleteModal.transaction?.description}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
