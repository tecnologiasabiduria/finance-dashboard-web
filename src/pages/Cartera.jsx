import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';
import { Card, Button, Input, Modal, ConfirmModal, Spinner } from '../components/ui';
import { formatCurrency, formatDate, parseLocalDate } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';

const EMPTY_FORM = {
  client_name: '',
  client_document: '',
  invoice_number: '',
  issue_date: '',
  due_date: '',
  amount: '',
  amount_paid: '',
  notes: '',
};

function getStatus(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(item.due_date);
  const amount = parseFloat(item.amount) || 0;
  const paid = parseFloat(item.amount_paid) || 0;

  if (paid >= amount) return 'paid';
  if (due < today) return 'overdue';
  if (paid > 0) return 'partial';
  return 'pending';
}

const STATUS_CONFIG = {
  paid: {
    label: 'Pagada',
    icon: CheckCircle,
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dotClass: 'bg-emerald-400',
  },
  overdue: {
    label: 'Vencida',
    icon: AlertCircle,
    className: 'bg-red-500/10 text-red-400 border border-red-500/20',
    dotClass: 'bg-red-400',
  },
  partial: {
    label: 'Parcial',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    dotClass: 'bg-amber-400',
  },
  pending: {
    label: 'Pendiente',
    icon: AlertTriangle,
    className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    dotClass: 'bg-blue-400',
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function daysOverdue(item) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(item.due_date);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export default function Cartera() {
  const { currency } = useSettings();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Modal states
  const [formModal, setFormModal] = useState({ open: false, item: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load data
  useEffect(() => {
    loadCartera();
  }, []);

  const loadCartera = async () => {
    try {
      setLoading(true);
      const res = await api.getCartera();
      setItems(res.data?.cartera || []);
    } catch (err) {
      console.error('Error loading cartera:', err);
      setError('No se pudo cargar la cartera. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Computed items with status
  const itemsWithStatus = useMemo(
    () => items.map((i) => ({ ...i, _status: getStatus(i) })),
    [items]
  );

  // Summary stats
  const stats = useMemo(() => {
    const total = itemsWithStatus.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
    const paid = itemsWithStatus.reduce((s, i) => s + (parseFloat(i.amount_paid) || 0), 0);
    const pending = total - paid;
    const overdue = itemsWithStatus
      .filter((i) => i._status === 'overdue')
      .reduce((s, i) => s + ((parseFloat(i.amount) || 0) - (parseFloat(i.amount_paid) || 0)), 0);
    return { total, paid, pending, overdue };
  }, [itemsWithStatus]);

  // Filter + search
  const filtered = useMemo(() => {
    let list = [...itemsWithStatus];

    if (statusFilter !== 'all') {
      list = list.filter((i) => i._status === statusFilter);
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (i) =>
          (i.client_name || '').toLowerCase().includes(q) ||
          (i.client_document || '').toLowerCase().includes(q) ||
          (i.invoice_number || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      // Sort overdue first, then by due_date asc
      const statusOrder = { overdue: 0, partial: 1, pending: 2, paid: 3 };
      const diff = (statusOrder[a._status] ?? 4) - (statusOrder[b._status] ?? 4);
      if (diff !== 0) return diff;
      return a.due_date < b.due_date ? -1 : 1;
    });

    return list;
  }, [itemsWithStatus, statusFilter, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Open add/edit modal
  const openForm = (item = null) => {
    setFormErrors({});
    if (item) {
      setForm({
        client_name: item.client_name || '',
        client_document: item.client_document || '',
        invoice_number: item.invoice_number || '',
        issue_date: item.issue_date || '',
        due_date: item.due_date || '',
        amount: item.amount?.toString() || '',
        amount_paid: item.amount_paid?.toString() || '',
        notes: item.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setFormModal({ open: true, item });
  };

  const closeForm = () => {
    setFormModal({ open: false, item: null });
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  // Validate form
  const validate = () => {
    const errs = {};
    if (!form.client_name.trim()) errs.client_name = 'El nombre del cliente es requerido';
    if (!form.issue_date) errs.issue_date = 'La fecha de emisión es requerida';
    if (!form.due_date) errs.due_date = 'La fecha de vencimiento es requerida';
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = 'El valor de la factura debe ser mayor a cero';
    if (form.amount_paid && parseFloat(form.amount_paid) < 0) errs.amount_paid = 'El valor pagado no puede ser negativo';
    if (
      form.amount_paid &&
      form.amount &&
      parseFloat(form.amount_paid) > parseFloat(form.amount)
    ) {
      errs.amount_paid = 'El valor pagado no puede superar el valor de la factura';
    }
    if (form.due_date && form.issue_date && form.due_date < form.issue_date) {
      errs.due_date = 'La fecha de vencimiento no puede ser anterior a la fecha de emisión';
    }
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client_name: form.client_name.trim(),
        client_document: form.client_document.trim() || null,
        invoice_number: form.invoice_number.trim() || null,
        issue_date: form.issue_date,
        due_date: form.due_date,
        amount: parseFloat(form.amount),
        amount_paid: parseFloat(form.amount_paid) || 0,
        notes: form.notes.trim() || null,
      };

      if (formModal.item) {
        const res = await api.updateCarteraItem(formModal.item.id, payload);
        const updated = res.data?.item;
        setItems((prev) => prev.map((i) => (i.id === formModal.item.id ? updated : i)));
        showSuccess('Registro actualizado correctamente');
      } else {
        const res = await api.createCarteraItem(payload);
        const created = res.data?.item;
        setItems((prev) => [created, ...prev]);
        showSuccess('Registro creado correctamente');
      }
      closeForm();
    } catch (err) {
      console.error('Error saving cartera item:', err);
      setFormErrors({ general: err.message || 'Error al guardar el registro' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item) return;
    setDeleting(true);
    try {
      await api.deleteCarteraItem(deleteModal.item.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteModal.item.id));
      setDeleteModal({ open: false, item: null });
      showSuccess('Registro eliminado');
    } catch (err) {
      console.error('Error deleting cartera item:', err);
    } finally {
      setDeleting(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cartera</h1>
          <p className="text-sm text-dark-400 mt-1">Gestión de cuentas por cobrar</p>
        </div>
        <Button icon={Plus} onClick={() => openForm()}>
          Nueva Factura
        </Button>
      </div>

      {/* Success Message */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gold-400/10">
              <DollarSign className="h-5 w-5 text-gold-400" />
            </div>
            <div>
              <p className="text-xs text-dark-400">Total facturado</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.total, currency)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-dark-400">Recaudado</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(stats.paid, currency)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-dark-400">Por cobrar</p>
              <p className="text-lg font-bold text-blue-400">{formatCurrency(stats.pending, currency)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-dark-400">Vencido</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(stats.overdue, currency)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por cliente, documento, factura..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'partial', 'overdue', 'paid'].map((s) => {
              const labels = { all: 'Todas', pending: 'Pendiente', partial: 'Parcial', overdue: 'Vencida', paid: 'Pagada' };
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === s
                      ? 'bg-gold-400/20 text-gold-300 border border-gold-400/30'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                  }`}
                >
                  {labels[s]}
                  {s !== 'all' && (
                    <span className="ml-1.5 text-xs opacity-70">
                      ({itemsWithStatus.filter((i) => i._status === s).length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-dark-400">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">
              {items.length === 0 ? 'No hay registros en cartera' : 'No hay resultados para los filtros aplicados'}
            </p>
            {items.length === 0 && (
              <p className="text-sm mt-1 mb-4">Agrega tu primera factura pendiente de cobro</p>
            )}
            {items.length === 0 && (
              <Button size="sm" icon={Plus} onClick={() => openForm()}>
                Nueva Factura
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dark-800/30">
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400">Cliente</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400">Factura</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-dark-400">Vencimiento</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Valor</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Pagado</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Pendiente</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-dark-400">Estado</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 w-20">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((item) => {
                    const pending = (parseFloat(item.amount) || 0) - (parseFloat(item.amount_paid) || 0);
                    const overdueDays = item._status === 'overdue' ? daysOverdue(item) : 0;
                    return (
                      <tr key={item.id} className="border-t border-dark-800/50 hover:bg-dark-800/20 transition-colors">
                        <td className="py-3 px-4">
                          <p className="text-white font-medium">{item.client_name}</p>
                          {item.client_document && (
                            <p className="text-xs text-dark-400">{item.client_document}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {item.invoice_number ? (
                            <span className="text-gold-400 font-mono text-xs">{item.invoice_number}</span>
                          ) : (
                            <span className="text-dark-500">—</span>
                          )}
                          <p className="text-xs text-dark-400 mt-0.5">
                            Emitida: {formatDate(item.issue_date)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className={`font-medium ${item._status === 'overdue' ? 'text-red-400' : 'text-white'}`}>
                            {formatDate(item.due_date)}
                          </p>
                          {overdueDays > 0 && (
                            <p className="text-xs text-red-400 mt-0.5">{overdueDays} días vencida</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-white font-medium">
                          {formatCurrency(item.amount, currency)}
                        </td>
                        <td className="py-3 px-4 text-right text-emerald-400">
                          {formatCurrency(item.amount_paid, currency)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          <span className={pending > 0 ? 'text-amber-400' : 'text-dark-400'}>
                            {formatCurrency(pending, currency)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={item._status} />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openForm(item)}
                              className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-gold-400/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ open: true, item })}
                              className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-dark-800">
                <p className="text-xs text-dark-400">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                    .map((p, idx, arr) => (
                      <span key={p}>
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-dark-500">…</span>
                        )}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            p === currentPage
                              ? 'bg-gold-400/20 text-gold-300'
                              : 'text-dark-400 hover:text-white hover:bg-dark-800'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={formModal.open}
        onClose={closeForm}
        title={formModal.item ? 'Editar Factura' : 'Nueva Factura'}
        size="lg"
      >
        <div className="space-y-4">
          {formErrors.general && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {formErrors.general}
            </div>
          )}

          {/* Client info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-200">
                Cliente <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                className={`w-full px-4 py-2.5 bg-dark-900 border rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/20 transition-all ${
                  formErrors.client_name ? 'border-red-500' : 'border-dark-700 focus:border-gold-400'
                }`}
              />
              {formErrors.client_name && (
                <p className="text-xs text-red-400">{formErrors.client_name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-200">NIT / Documento</label>
              <input
                type="text"
                placeholder="900.123.456-7"
                value={form.client_document}
                onChange={(e) => setForm({ ...form, client_document: e.target.value })}
                className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
              />
            </div>
          </div>

          {/* Invoice number */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-dark-200">No. Factura</label>
            <input
              type="text"
              placeholder="FV-0001"
              value={form.invoice_number}
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-200">
                Fecha de emisión <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className={`w-full px-4 py-2.5 bg-dark-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/20 transition-all ${
                  formErrors.issue_date ? 'border-red-500' : 'border-dark-700 focus:border-gold-400'
                }`}
              />
              {formErrors.issue_date && (
                <p className="text-xs text-red-400">{formErrors.issue_date}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-200">
                Fecha de vencimiento <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className={`w-full px-4 py-2.5 bg-dark-900 border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/20 transition-all ${
                  formErrors.due_date ? 'border-red-500' : 'border-dark-700 focus:border-gold-400'
                }`}
              />
              {formErrors.due_date && (
                <p className="text-xs text-red-400">{formErrors.due_date}</p>
              )}
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-200">
                Valor factura <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className={`w-full px-4 py-2.5 bg-dark-900 border rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/20 transition-all ${
                  formErrors.amount ? 'border-red-500' : 'border-dark-700 focus:border-gold-400'
                }`}
              />
              {formErrors.amount && (
                <p className="text-xs text-red-400">{formErrors.amount}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-dark-200">Valor pagado</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                className={`w-full px-4 py-2.5 bg-dark-900 border rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400/20 transition-all ${
                  formErrors.amount_paid ? 'border-red-500' : 'border-dark-700 focus:border-gold-400'
                }`}
              />
              {formErrors.amount_paid && (
                <p className="text-xs text-red-400">{formErrors.amount_paid}</p>
              )}
            </div>
          </div>

          {/* Amount pending preview */}
          {form.amount && (
            <div className="px-4 py-3 bg-dark-800/50 rounded-lg flex items-center justify-between">
              <span className="text-sm text-dark-400">Pendiente por cobrar</span>
              <span className="font-semibold text-amber-400">
                {formatCurrency(
                  Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.amount_paid) || 0)),
                  currency
                )}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-dark-200">Notas</label>
            <textarea
              placeholder="Observaciones adicionales..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2.5 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-400 text-sm focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button className="flex-1" icon={Save} onClick={handleSave} loading={saving}>
              {formModal.item ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null })}
        onConfirm={handleDelete}
        title="Eliminar Factura"
        message={`¿Estás seguro de eliminar la factura de "${deleteModal.item?.client_name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
