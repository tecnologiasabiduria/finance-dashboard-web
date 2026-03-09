import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Search,
  Calendar,
} from 'lucide-react';
import { Card, StatCard, Button, Input, Modal, ConfirmModal, Spinner } from '../components/ui';
import { formatCurrency, parseLocalDate } from '../utils/formatters';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

const EMPTY_RECORD = {
  plataforma: '',
  fuente: '',
  producto: '',
  nombre: '',
  fecha_venta: new Date().toISOString().slice(0, 10),
  valor_venta: '',
  cash: '',
  notas: '',
};

const EMPTY_PAGO = {
  fecha: new Date().toISOString().slice(0, 10),
  monto: '',
  notas: '',
};

export default function Cartera() {
  const { currency } = useSettings();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [pagosMap, setPagosMap] = useState({});
  const [loadingPagos, setLoadingPagos] = useState({});

  // Record modal
  const [recordModal, setRecordModal] = useState({ open: false, record: null });
  const [recordForm, setRecordForm] = useState(EMPTY_RECORD);
  const [savingRecord, setSavingRecord] = useState(false);
  const [recordError, setRecordError] = useState('');

  // Delete record modal
  const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
  const [deleting, setDeleting] = useState(false);

  // Pago modal
  const [pagoModal, setPagoModal] = useState({ open: false, carteraId: null });
  const [pagoForm, setPagoForm] = useState(EMPTY_PAGO);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoError, setPagoError] = useState('');

  // Delete pago modal
  const [deletePagoModal, setDeletePagoModal] = useState({ open: false, carteraId: null, pagoId: null });

  const [successMsg, setSuccessMsg] = useState('');

  // ─── Load cartera records ───────────────────────────────────────────────────
  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      setLoading(true);
      const res = await api.getCartera();
      setRecords(res.data?.records || res.data || []);
    } catch (err) {
      console.error('Error loading cartera:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPagos(carteraId) {
    if (pagosMap[carteraId]) return;
    setLoadingPagos((prev) => ({ ...prev, [carteraId]: true }));
    try {
      const res = await api.getCarteraPagos(carteraId);
      setPagosMap((prev) => ({ ...prev, [carteraId]: res.data?.pagos || res.data || [] }));
    } catch (err) {
      console.error('Error loading pagos:', err);
      setPagosMap((prev) => ({ ...prev, [carteraId]: [] }));
    } finally {
      setLoadingPagos((prev) => ({ ...prev, [carteraId]: false }));
    }
  }

  function handleExpand(id) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadPagos(id);
    }
  }

  // ─── Summary stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalCartera = records.reduce((s, r) => s + Number(r.valor_venta || 0), 0);
    const totalCash = records.reduce((s, r) => s + Number(r.cash || 0), 0);
    const totalSaldo = totalCartera - totalCash;
    const pctCobrado = totalCartera > 0 ? (totalCash / totalCartera) * 100 : 0;
    return { totalCartera, totalCash, totalSaldo, pctCobrado };
  }, [records]);

  // ─── Filtered records ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.nombre?.toLowerCase().includes(q) ||
        r.producto?.toLowerCase().includes(q) ||
        r.plataforma?.toLowerCase().includes(q) ||
        r.fuente?.toLowerCase().includes(q)
    );
  }, [records, search]);

  // ─── Record CRUD ────────────────────────────────────────────────────────────
  function openNewRecord() {
    setRecordForm(EMPTY_RECORD);
    setRecordError('');
    setRecordModal({ open: true, record: null });
  }

  function openEditRecord(record) {
    setRecordForm({
      plataforma: record.plataforma || '',
      fuente: record.fuente || '',
      producto: record.producto || '',
      nombre: record.nombre || '',
      fecha_venta: record.fecha_venta?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      valor_venta: record.valor_venta?.toString() || '',
      cash: record.cash?.toString() || '',
      notas: record.notas || '',
    });
    setRecordError('');
    setRecordModal({ open: true, record });
  }

  async function saveRecord() {
    if (!recordForm.nombre.trim()) {
      setRecordError('El nombre del cliente es requerido.');
      return;
    }
    if (!recordForm.fecha_venta) {
      setRecordError('La fecha de venta es requerida.');
      return;
    }
    const valorVenta = parseFloat(recordForm.valor_venta);
    if (!recordForm.valor_venta || isNaN(valorVenta) || valorVenta <= 0) {
      setRecordError('El valor de venta debe ser un número positivo.');
      return;
    }
    const cash = parseFloat(recordForm.cash || 0);
    if (isNaN(cash) || cash < 0) {
      setRecordError('El cash cobrado debe ser un número positivo.');
      return;
    }

    setSavingRecord(true);
    setRecordError('');
    try {
      const payload = {
        ...recordForm,
        valor_venta: valorVenta,
        cash,
      };

      if (recordModal.record) {
        const res = await api.updateCarteraRecord(recordModal.record.id, payload);
        const updated = res.data?.record || res.data;
        setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showSuccess('Registro actualizado exitosamente.');
      } else {
        const res = await api.createCarteraRecord(payload);
        const created = res.data?.record || res.data;
        setRecords((prev) => [created, ...prev]);
        showSuccess('Registro creado exitosamente.');
      }
      setRecordModal({ open: false, record: null });
    } catch (err) {
      setRecordError(err.message || 'Error al guardar el registro.');
    } finally {
      setSavingRecord(false);
    }
  }

  async function confirmDeleteRecord() {
    if (!deleteModal.record) return;
    setDeleting(true);
    try {
      await api.deleteCarteraRecord(deleteModal.record.id);
      setRecords((prev) => prev.filter((r) => r.id !== deleteModal.record.id));
      setPagosMap((prev) => {
        const next = { ...prev };
        delete next[deleteModal.record.id];
        return next;
      });
      showSuccess('Registro eliminado.');
    } catch (err) {
      console.error('Error deleting record:', err);
    } finally {
      setDeleting(false);
      setDeleteModal({ open: false, record: null });
    }
  }

  // ─── Pago CRUD ──────────────────────────────────────────────────────────────
  function openAddPago(carteraId) {
    setPagoForm(EMPTY_PAGO);
    setPagoError('');
    setPagoModal({ open: true, carteraId });
  }

  async function savePago() {
    const monto = parseFloat(pagoForm.monto);
    if (!pagoForm.monto || isNaN(monto) || monto <= 0) {
      setPagoError('El monto debe ser un número positivo.');
      return;
    }
    if (!pagoForm.fecha) {
      setPagoError('La fecha del abono es requerida.');
      return;
    }

    setSavingPago(true);
    setPagoError('');
    try {
      const res = await api.addCarteraPago(pagoModal.carteraId, { ...pagoForm, monto });
      const created = res.data?.pago || res.data;

      // Update pagos list
      setPagosMap((prev) => ({
        ...prev,
        [pagoModal.carteraId]: [created, ...(prev[pagoModal.carteraId] || [])],
      }));

      // Update cash field in the parent record
      // Note: pagosMap already includes the newly added pago (added on line above)
      const totalPagos = [created, ...(pagosMap[pagoModal.carteraId] || [])].reduce(
        (s, p) => s + Number(p.monto || 0),
        0
      );
      setRecords((prev) =>
        prev.map((r) =>
          r.id === pagoModal.carteraId ? { ...r, cash: totalPagos } : r
        )
      );

      setPagoModal({ open: false, carteraId: null });
      showSuccess('Abono registrado exitosamente.');
    } catch (err) {
      setPagoError(err.message || 'Error al registrar el abono.');
    } finally {
      setSavingPago(false);
    }
  }

  async function confirmDeletePago() {
    const { carteraId, pagoId } = deletePagoModal;
    if (!carteraId || !pagoId) return;
    try {
      await api.deleteCarteraPago(carteraId, pagoId);
      const pago = (pagosMap[carteraId] || []).find((p) => p.id === pagoId);
      const montoEliminado = pago ? Number(pago.monto || 0) : 0;

      setPagosMap((prev) => ({
        ...prev,
        [carteraId]: (prev[carteraId] || []).filter((p) => p.id !== pagoId),
      }));

      setRecords((prev) =>
        prev.map((r) =>
          r.id === carteraId
            ? { ...r, cash: Math.max(0, Number(r.cash || 0) - montoEliminado) }
            : r
        )
      );
      showSuccess('Abono eliminado.');
    } catch (err) {
      console.error('Error deleting pago:', err);
    } finally {
      setDeletePagoModal({ open: false, carteraId: null, pagoId: null });
    }
  }

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function getSaldo(record) {
    return Math.max(0, Number(record.valor_venta || 0) - Number(record.cash || 0));
  }

  function getPctCobrado(record) {
    const venta = Number(record.valor_venta || 0);
    const cash = Number(record.cash || 0);
    return venta > 0 ? Math.min(100, (cash / venta) * 100) : 0;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
      return parseLocalDate(dateStr).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Cartera</h1>
          <p className="text-dark-400 text-sm mt-1">Cuentas por cobrar — gestión de pagos y saldos pendientes</p>
        </div>
        <Button onClick={openNewRecord} className="flex items-center gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </Button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cartera"
          value={formatCurrency(stats.totalCartera, currency)}
          icon={DollarSign}
          variant="gold"
        />
        <StatCard
          title="Cash Cobrado"
          value={formatCurrency(stats.totalCash, currency)}
          icon={TrendingUp}
          variant="success"
        />
        <StatCard
          title="Saldo Pendiente"
          value={formatCurrency(stats.totalSaldo, currency)}
          icon={AlertCircle}
          variant={stats.totalSaldo > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="% Cobrado"
          value={`${stats.pctCobrado.toFixed(1)}%`}
          icon={CreditCard}
          variant="default"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
        <input
          type="text"
          placeholder="Buscar por cliente, producto, plataforma…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-dark-400 focus:outline-none focus:border-gold-400/50 text-sm"
        />
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">
              {search ? 'No se encontraron registros con esa búsqueda.' : 'No hay registros en cartera. Crea el primero.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const saldo = getSaldo(record);
            const pct = getPctCobrado(record);
            const isExpanded = expandedId === record.id;
            const pagos = pagosMap[record.id] || [];
            const isPagosLoading = loadingPagos[record.id];

            return (
              <Card key={record.id} className="p-0 overflow-hidden">
                {/* Record header row */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    {/* Left: client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white truncate">{record.nombre}</span>
                        {record.producto && (
                          <span className="text-xs bg-gold-400/10 text-gold-300 px-2 py-0.5 rounded-full border border-gold-400/20 shrink-0">
                            {record.producto}
                          </span>
                        )}
                        {record.plataforma && (
                          <span className="text-xs bg-dark-800 text-dark-300 px-2 py-0.5 rounded-full shrink-0">
                            {record.plataforma}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-dark-400 flex-wrap">
                        {record.fuente && <span>Fuente: {record.fuente}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(record.fecha_venta)}
                        </span>
                      </div>
                    </div>

                    {/* Right: amounts + actions */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-dark-400">Venta</p>
                        <p className="text-sm font-medium text-white">
                          {formatCurrency(Number(record.valor_venta || 0), currency)}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-dark-400">Cash</p>
                        <p className="text-sm font-medium text-emerald-400">
                          {formatCurrency(Number(record.cash || 0), currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-dark-400">Saldo</p>
                        <p
                          className={`text-sm font-semibold ${
                            saldo > 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatCurrency(saldo, currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditRecord(record)}
                          className="p-2 text-dark-400 hover:text-gold-300 hover:bg-dark-800 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, record })}
                          className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleExpand(record.id)}
                          className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                          title={isExpanded ? 'Colapsar' : 'Ver abonos'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-dark-400 mb-1">
                      <span>Progreso de cobro</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-500 to-gold-300 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded: Pagos section */}
                {isExpanded && (
                  <div className="border-t border-dark-800 bg-dark-950/50 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-dark-300">Abonos registrados</h4>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openAddPago(record.id)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        Agregar abono
                      </Button>
                    </div>

                    {isPagosLoading ? (
                      <div className="flex justify-center py-4">
                        <Spinner size="sm" />
                      </div>
                    ) : pagos.length === 0 ? (
                      <p className="text-xs text-dark-500 text-center py-3">
                        No hay abonos registrados para este registro.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pagos.map((pago) => (
                          <div
                            key={pago.id}
                            className="flex items-center justify-between bg-dark-900 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-dark-400">{formatDate(pago.fecha)}</span>
                              <span className="text-sm font-medium text-emerald-400">
                                +{formatCurrency(Number(pago.monto || 0), currency)}
                              </span>
                              {pago.notas && (
                                <span className="text-xs text-dark-500 truncate max-w-[160px]">
                                  {pago.notas}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                setDeletePagoModal({ open: true, carteraId: record.id, pagoId: pago.id })
                              }
                              className="p-1.5 text-dark-500 hover:text-red-400 hover:bg-dark-800 rounded transition-colors"
                              title="Eliminar abono"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Record Modal (create / edit) ─────────────────────────────────────── */}
      <Modal
        isOpen={recordModal.open}
        onClose={() => setRecordModal({ open: false, record: null })}
        title={recordModal.record ? 'Editar Registro de Cartera' : 'Nuevo Registro de Cartera'}
        size="lg"
      >
        <div className="p-6 space-y-4">
          {recordError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {recordError}
            </div>
          )}

          {/* Client + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm text-dark-300 mb-1.5">
                Nombre del cliente <span className="text-red-400">*</span>
              </label>
              <Input
                value={recordForm.nombre}
                onChange={(e) => setRecordForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Juan García"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                Fecha de venta <span className="text-red-400">*</span>
              </label>
              <Input
                type="date"
                value={recordForm.fecha_venta}
                onChange={(e) => setRecordForm((f) => ({ ...f, fecha_venta: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Producto / Servicio</label>
              <Input
                value={recordForm.producto}
                onChange={(e) => setRecordForm((f) => ({ ...f, producto: e.target.value }))}
                placeholder="Ej. Consultoría"
              />
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">
                Valor total de venta <span className="text-red-400">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="any"
                value={recordForm.valor_venta}
                onChange={(e) => setRecordForm((f) => ({ ...f, valor_venta: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Cash cobrado</label>
              <Input
                type="number"
                min="0"
                step="any"
                value={recordForm.cash}
                onChange={(e) => setRecordForm((f) => ({ ...f, cash: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Platform + Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Plataforma</label>
              <Input
                value={recordForm.plataforma}
                onChange={(e) => setRecordForm((f) => ({ ...f, plataforma: e.target.value }))}
                placeholder="Ej. GoHighLevel"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Fuente</label>
              <Input
                value={recordForm.fuente}
                onChange={(e) => setRecordForm((f) => ({ ...f, fuente: e.target.value }))}
                placeholder="Ej. Referido"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Notas</label>
            <textarea
              value={recordForm.notas}
              onChange={(e) => setRecordForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Observaciones adicionales…"
              rows={3}
              className="w-full bg-dark-800 border border-dark-700 rounded-xl px-4 py-3 text-white placeholder-dark-500 focus:outline-none focus:border-gold-400/50 text-sm resize-none"
            />
          </div>

          {/* Derived saldo preview */}
          {(recordForm.valor_venta || recordForm.cash) && (
            <div className="flex items-center justify-between bg-dark-800 rounded-xl px-4 py-3">
              <span className="text-sm text-dark-300">Saldo estimado</span>
              <span className="text-sm font-semibold text-white">
                {formatCurrency(
                  Math.max(
                    0,
                    parseFloat(recordForm.valor_venta || 0) - parseFloat(recordForm.cash || 0)
                  ),
                  currency
                )}
              </span>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setRecordModal({ open: false, record: null })}
          >
            Cancelar
          </Button>
          <Button onClick={saveRecord} disabled={savingRecord}>
            {savingRecord ? <Spinner size="sm" /> : recordModal.record ? 'Guardar cambios' : 'Crear registro'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Record Modal ──────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, record: null })}
        onConfirm={confirmDeleteRecord}
        title="Eliminar registro"
        message={`¿Estás seguro de que deseas eliminar el registro de "${deleteModal.record?.nombre}"? Esta acción no se puede deshacer y se eliminarán todos los abonos asociados.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />

      {/* ── Pago Modal ───────────────────────────────────────────────────────── */}
      <Modal
        isOpen={pagoModal.open}
        onClose={() => setPagoModal({ open: false, carteraId: null })}
        title="Registrar Abono"
        size="sm"
      >
        <div className="p-6 space-y-4">
          {pagoError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {pagoError}
            </div>
          )}
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              Fecha del abono <span className="text-red-400">*</span>
            </label>
            <Input
              type="date"
              value={pagoForm.fecha}
              onChange={(e) => setPagoForm((f) => ({ ...f, fecha: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">
              Monto <span className="text-red-400">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={pagoForm.monto}
              onChange={(e) => setPagoForm((f) => ({ ...f, monto: e.target.value }))}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1.5">Notas</label>
            <Input
              value={pagoForm.notas}
              onChange={(e) => setPagoForm((f) => ({ ...f, notas: e.target.value }))}
              placeholder="Ej. Transferencia Bancolombia"
            />
          </div>
        </div>
        <div className="px-6 pb-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setPagoModal({ open: false, carteraId: null })}
          >
            Cancelar
          </Button>
          <Button onClick={savePago} disabled={savingPago}>
            {savingPago ? <Spinner size="sm" /> : 'Registrar abono'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Pago Modal ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deletePagoModal.open}
        onClose={() => setDeletePagoModal({ open: false, carteraId: null, pagoId: null })}
        onConfirm={confirmDeletePago}
        title="Eliminar abono"
        message="¿Estás seguro de que deseas eliminar este abono? El saldo del registro se actualizará."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
