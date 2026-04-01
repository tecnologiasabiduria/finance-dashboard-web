import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  ArrowUpRight,
  Download,
  User,
  Hash,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, StatCard, Button, Input, Modal, ConfirmModal, Spinner, DatePicker } from '../components/ui';
import { formatCurrency, parseLocalDate } from '../utils/formatters';
import { api } from '../services/api';
import { getCachedCartera, invalidateCarteraCache } from '../services/cache';
import { useSettings } from '../context/SettingsContext';

const EMPTY_RECORD = {
  plataforma: '',
  fuente: '',
  producto: '',
  nombre: '',
  documento: '',
  email: '',
  telefono: '',
  direccion: '',
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

  // Pago modal (supports create + edit)
  const [pagoModal, setPagoModal] = useState({ open: false, carteraId: null, pago: null });
  const [pagoForm, setPagoForm] = useState(EMPTY_PAGO);
  const [savingPago, setSavingPago] = useState(false);
  const [pagoError, setPagoError] = useState('');

  // Delete pago modal
  const [deletePagoModal, setDeletePagoModal] = useState({ open: false, carteraId: null, pagoId: null });

  const [successMsg, setSuccessMsg] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Date range filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ─── Load cartera records ───────────────────────────────────────────────────
  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    try {
      setLoading(true);
      const res = await getCachedCartera();
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
    const totalCobrado = records.reduce((s, r) => s + Number(r.cash || 0) + Number(r.total_abonos || 0), 0);
    const totalSaldo = records.reduce(
      (s, r) =>
        s +
        (r.saldo !== undefined
          ? Number(r.saldo)
          : Math.max(0, Number(r.valor_venta || 0) - Number(r.cash || 0) - Number(r.total_abonos || 0))),
      0
    );
    const pctCobrado = totalCartera > 0 ? (totalCobrado / totalCartera) * 100 : 0;
    return { totalCartera, totalCobrado, totalSaldo, pctCobrado };
  }, [records]);

  // ─── Filtered records ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = records;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.nombre?.toLowerCase().includes(q) ||
          r.documento?.toLowerCase().includes(q) ||
          r.producto?.toLowerCase().includes(q) ||
          r.plataforma?.toLowerCase().includes(q) ||
          r.fuente?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      result = result.filter((r) => r.fecha_venta >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((r) => r.fecha_venta <= dateTo);
    }
    return result;
  }, [records, search, dateFrom, dateTo]);

  // Pagination derived values
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedRecords = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      documento: record.documento || '',
      email: record.email || '',
      telefono: record.telefono || '',
      direccion: record.direccion || '',
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
    if (!recordForm.documento.trim()) {
      setRecordError('El documento del cliente es requerido.');
      return;
    }
    if (!recordForm.fecha_venta) {
      setRecordError('La fecha de venta es requerida.');
      return;
    }
    const valorVenta = parseFloat(recordForm.valor_venta);
    if (!recordForm.valor_venta || isNaN(valorVenta) || valorVenta <= 0) {
      setRecordError('El valor de venta debe ser un numero positivo.');
      return;
    }
    const cash = parseFloat(recordForm.cash || 0);
    if (isNaN(cash) || cash < 0) {
      setRecordError('El cash cobrado debe ser un numero positivo.');
      return;
    }
    if (cash > valorVenta) {
      setRecordError('El cash cobrado no puede ser mayor al valor de venta.');
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
      invalidateCarteraCache();
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
      invalidateCarteraCache();
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
    setPagoModal({ open: true, carteraId, pago: null });
  }

  function openEditPago(carteraId, pago) {
    setPagoForm({
      fecha: pago.fecha?.slice(0, 10) || '',
      monto: pago.monto?.toString() || '',
      notas: pago.notas || '',
    });
    setPagoError('');
    setPagoModal({ open: true, carteraId, pago });
  }

  async function savePago() {
    const monto = parseFloat(pagoForm.monto);
    if (!pagoForm.monto || isNaN(monto) || monto <= 0) {
      setPagoError('El monto debe ser un numero positivo.');
      return;
    }
    if (!pagoForm.fecha) {
      setPagoError('La fecha del abono es requerida.');
      return;
    }

    // Validate monto does not exceed saldo
    const parentRecord = records.find((r) => r.id === pagoModal.carteraId);
    if (parentRecord) {
      const currentSaldo =
        parentRecord.saldo !== undefined
          ? Number(parentRecord.saldo)
          : Math.max(
              0,
              Number(parentRecord.valor_venta || 0) -
                Number(parentRecord.cash || 0) -
                Number(parentRecord.total_abonos || 0)
            );
      let availableSaldo;
      if (pagoModal.pago) {
        // Editing: available saldo = current saldo + this pago's current monto
        availableSaldo = currentSaldo + Number(pagoModal.pago.monto || 0);
      } else {
        availableSaldo = currentSaldo;
      }
      if (monto > availableSaldo) {
        setPagoError(
          `El monto ($${monto}) excede el saldo pendiente ($${availableSaldo.toFixed(2)}).`
        );
        return;
      }
    }

    setSavingPago(true);
    setPagoError('');
    try {
      if (pagoModal.pago) {
        // ── Edit existing pago ──
        const res = await api.updateCarteraPago(pagoModal.carteraId, pagoModal.pago.id, {
          ...pagoForm,
          monto,
        });
        const updated = res.data?.pago || res.data;

        // Update pagos list
        setPagosMap((prev) => ({
          ...prev,
          [pagoModal.carteraId]: (prev[pagoModal.carteraId] || []).map((p) =>
            p.id === pagoModal.pago.id ? updated : p
          ),
        }));

        // Recalculate total_abonos and saldo on the parent record
        const montoDiff = monto - Number(pagoModal.pago.monto || 0);
        setRecords((prev) =>
          prev.map((r) => {
            if (r.id !== pagoModal.carteraId) return r;
            const newTotalAbonos = Number(r.total_abonos || 0) + montoDiff;
            const newSaldo = Math.max(
              0,
              Number(r.valor_venta || 0) - Number(r.cash || 0) - newTotalAbonos
            );
            return { ...r, total_abonos: newTotalAbonos, saldo: newSaldo };
          })
        );

        showSuccess('Abono actualizado exitosamente.');
      } else {
        // ── Create new pago ──
        const res = await api.addCarteraPago(pagoModal.carteraId, { ...pagoForm, monto });
        const created = res.data?.pago || res.data;

        // Update pagos list
        setPagosMap((prev) => ({
          ...prev,
          [pagoModal.carteraId]: [created, ...(prev[pagoModal.carteraId] || [])],
        }));

        // Update the parent record's computed fields
        setRecords((prev) =>
          prev.map((r) => {
            if (r.id !== pagoModal.carteraId) return r;
            const newTotalAbonos = Number(r.total_abonos || 0) + monto;
            const newSaldo = Math.max(
              0,
              Number(r.valor_venta || 0) - Number(r.cash || 0) - newTotalAbonos
            );
            return { ...r, total_abonos: newTotalAbonos, saldo: newSaldo };
          })
        );

        showSuccess('Abono registrado exitosamente.');
      }

      invalidateCarteraCache();
      setPagoModal({ open: false, carteraId: null, pago: null });
    } catch (err) {
      setPagoError(err.message || 'Error al guardar el abono.');
    } finally {
      setSavingPago(false);
    }
  }

  async function confirmDeletePago() {
    const { carteraId, pagoId } = deletePagoModal;
    if (!carteraId || !pagoId) return;
    try {
      await api.deleteCarteraPago(carteraId, pagoId);
      invalidateCarteraCache();
      const pago = (pagosMap[carteraId] || []).find((p) => p.id === pagoId);
      const montoEliminado = pago ? Number(pago.monto || 0) : 0;

      setPagosMap((prev) => ({
        ...prev,
        [carteraId]: (prev[carteraId] || []).filter((p) => p.id !== pagoId),
      }));

      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== carteraId) return r;
          const newTotalAbonos = Math.max(0, Number(r.total_abonos || 0) - montoEliminado);
          const newSaldo = Math.max(
            0,
            Number(r.valor_venta || 0) - Number(r.cash || 0) - newTotalAbonos
          );
          return { ...r, total_abonos: newTotalAbonos, saldo: newSaldo };
        })
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

  // Excel export
  const exportCarteraExcel = () => {
    const data = filtered.map((r) => ({
      Nombre: r.nombre || '',
      Documento: r.documento || '',
      Email: r.email || '',
      Teléfono: r.telefono || '',
      Dirección: r.direccion || '',
      Plataforma: r.plataforma || '',
      Fuente: r.fuente || '',
      Producto: r.producto || '',
      'Fecha Venta': r.fecha_venta || '',
      'Valor Venta': parseFloat(r.valor_venta) || 0,
      Contado: parseFloat(r.cash) || 0,
      Saldo: parseFloat(r.saldo) || 0,
      Notas: r.notas || '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cartera');
    XLSX.writeFile(wb, 'Cartera.xlsx');
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function getSaldo(record) {
    return record.saldo !== undefined
      ? Number(record.saldo)
      : Math.max(
          0,
          Number(record.valor_venta || 0) - Number(record.cash || 0) - Number(record.total_abonos || 0)
        );
  }

  function getPctCobrado(record) {
    const venta = Number(record.valor_venta || 0);
    const cobrado = Number(record.cash || 0) + Number(record.total_abonos || 0);
    return venta > 0 ? Math.min(100, (cobrado / venta) * 100) : 0;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '\u2014';
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
  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-dark-800 rounded-lg ${className}`} />
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-36 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-7 w-36" />
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>

        {/* Table skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="bg-dark-800/50 px-4 py-4">
            <div className="flex gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
          </div>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-4 border-t border-dark-800/50">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Cartera</h1>
          <p className="text-dark-400 text-sm mt-1">Cuentas por cobrar — gestión de pagos y saldos pendientes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filtered.length > 0 && (
            <Button onClick={exportCarteraExcel} variant="secondary" size="sm" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
          )}
          <Button onClick={openNewRecord} size="sm" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuevo Registro</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 text-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-dark-400">Total Cartera</span>
            <div className="p-2 rounded-lg bg-gold-400/10">
              <DollarSign className="h-4 w-4 text-gold-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-white truncate" title={formatCurrency(stats.totalCartera, currency)}>
            {formatCurrency(stats.totalCartera, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-dark-400">Total Cobrado</span>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-emerald-400 truncate" title={formatCurrency(stats.totalCobrado, currency)}>
            {formatCurrency(stats.totalCobrado, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-dark-400">Saldo Pendiente</span>
            <div className={`p-2 rounded-lg ${stats.totalSaldo > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
              <AlertCircle className={`h-4 w-4 ${stats.totalSaldo > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
            </div>
          </div>
          <p className={`text-lg sm:text-2xl font-bold truncate ${stats.totalSaldo > 0 ? 'text-red-400' : 'text-emerald-400'}`} title={formatCurrency(stats.totalSaldo, currency)}>
            {formatCurrency(stats.totalSaldo, currency)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm text-dark-400">% Cobrado</span>
            <div className="p-2 rounded-lg bg-dark-800">
              <CreditCard className="h-4 w-4 text-dark-400" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-white">
            {stats.pctCobrado.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Search + Date filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, documento, producto, plataforma..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-dark-400 focus:outline-none focus:border-gold-400/50 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-dark-400 mb-1.5 ml-1">Desde</p>
            <DatePicker
              name="dateFrom"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
              placeholder="Fecha inicio"
            />
          </div>
          <div>
            <p className="text-xs text-dark-400 mb-1.5 ml-1">Hasta</p>
            <DatePicker
              name="dateTo"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
              placeholder="Fecha fin"
            />
          </div>
        </div>
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-dark-600 mx-auto mb-4" />
            <p className="text-dark-400">
              {search || dateFrom || dateTo
                ? 'No se encontraron registros con esa busqueda.'
                : 'No hay registros en cartera. Crea el primero.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedRecords.map((record) => {
            const saldo = getSaldo(record);
            const pct = getPctCobrado(record);
            const isExpanded = expandedId === record.id;
            const pagos = pagosMap[record.id] || [];
            const isPagosLoading = loadingPagos[record.id];

            return (
              <Card key={record.id} className="p-0 overflow-hidden">
                {/* Record header row */}
                <div className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Top row: client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-base sm:text-lg">{record.nombre}</span>
                        {record.documento && (
                          <span className="text-xs bg-dark-800 text-dark-300 px-2 py-0.5 rounded-full shrink-0">
                            {record.documento}
                          </span>
                        )}
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

                    {/* Amounts row - mobile friendly grid */}
                    <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-between">
                      <div className="text-center sm:text-right">
                        <p className="text-xs text-dark-400">Venta</p>
                        <p className="text-sm font-medium text-white">
                          {formatCurrency(Number(record.valor_venta || 0), currency)}
                        </p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-xs text-dark-400">Cash</p>
                        <p className="text-sm font-medium text-emerald-400">
                          {formatCurrency(Number(record.cash || 0), currency)}
                        </p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-xs text-dark-400">Saldo</p>
                        <p
                          className={`text-sm font-semibold ${
                            saldo > 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatCurrency(saldo, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs text-dark-400 mb-1.5">
                        <span>Progreso de cobro</span>
                        <span className="font-medium">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-gold-500 to-gold-300 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center justify-end gap-1 pt-1">
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

                {/* Expanded: Pagos section */}
                {isExpanded && (
                  <div className="border-t border-dark-800 bg-dark-950/50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <h4 className="text-sm font-medium text-dark-300">Abonos registrados</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/transactions/new?type=income&carteraId=${record.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gold-400/35 bg-dark-900 px-3 py-2 text-xs font-medium text-gold-300 hover:bg-gold-400/10 transition-colors"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Registrar ingreso</span>
                          <span className="sm:hidden">Ingreso</span>
                        </Link>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openAddPago(record.id)}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Agregar abono</span>
                          <span className="sm:hidden">Abono</span>
                        </Button>
                      </div>
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
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-dark-900 rounded-lg px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                              <span className="text-xs text-dark-400 shrink-0">{formatDate(pago.fecha)}</span>
                              <span className="text-sm font-medium text-emerald-400 shrink-0">
                                +{formatCurrency(Number(pago.monto || 0), currency)}
                              </span>
                              {pago.transaction_id && (
                                <span className="text-[10px] uppercase tracking-wide text-gold-400/90 border border-gold-500/35 rounded px-1.5 py-0.5 shrink-0">
                                  Con transacción
                                </span>
                              )}
                              {pago.notas && (
                                <span className="text-xs text-dark-500 truncate max-w-[200px]">
                                  {pago.notas}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 justify-end sm:justify-start">
                              <button
                                onClick={() => openEditPago(record.id, pago)}
                                className="p-1.5 text-dark-500 hover:text-gold-300 hover:bg-dark-800 rounded transition-colors"
                                title="Editar abono"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
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
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm rounded-lg bg-dark-800 text-dark-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
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
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-gold-400/20 text-gold-300 border border-gold-400/30'
                        : 'bg-dark-800 text-dark-300 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm rounded-lg bg-dark-800 text-dark-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Record Modal (create / edit) ─────────────────────────────────────── */}
      <Modal
        isOpen={recordModal.open}
        onClose={() => setRecordModal({ open: false, record: null })}
        title={recordModal.record ? 'Editar Registro de Cartera' : 'Nuevo Registro de Cartera'}
        size="lg"
      >
        <div className="p-6 space-y-5">
          {recordError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {recordError}
            </div>
          )}

          {/* Datos del Cliente */}
          <div className="border-b border-dark-800 pb-4">
            <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Datos del Cliente
            </h3>
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
                  Documento <span className="text-red-400">*</span>
                </label>
                <Input
                  value={recordForm.documento}
                  onChange={(e) => setRecordForm((f) => ({ ...f, documento: e.target.value }))}
                  placeholder="NIT o CC"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Teléfono</label>
                <Input
                  value={recordForm.telefono}
                  onChange={(e) => setRecordForm((f) => ({ ...f, telefono: e.target.value }))}
                  placeholder="+57 300 123 4567"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Correo</label>
                <Input
                  value={recordForm.email}
                  onChange={(e) => setRecordForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">Dirección</label>
                <Input
                  value={recordForm.direccion}
                  onChange={(e) => setRecordForm((f) => ({ ...f, direccion: e.target.value }))}
                  placeholder="Dirección del cliente"
                />
              </div>
            </div>
          </div>

          {/* Datos de la Venta */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Datos de la Venta
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">
                  Fecha de venta <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  name="fecha_venta"
                  value={recordForm.fecha_venta}
                  onChange={(e) => setRecordForm((f) => ({ ...f, fecha_venta: e.target.value }))}
                  placeholder="Seleccionar fecha"
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
                placeholder="Observaciones adicionales..."
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
                      parseFloat(recordForm.valor_venta || 0) -
                        parseFloat(recordForm.cash || 0) -
                        Number(recordModal.record?.total_abonos || 0)
                    ),
                    currency
                  )}
                </span>
              </div>
            )}
          </div>
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
        message={`Estas seguro de que deseas eliminar el registro de "${deleteModal.record?.nombre}"? Esta accion no se puede deshacer y se eliminaran todos los abonos asociados.`}
        confirmText="Eliminar"
        variant="danger"
        loading={deleting}
      />

      {/* ── Pago Modal (create / edit) ───────────────────────────────────────── */}
      <Modal
        isOpen={pagoModal.open}
        onClose={() => setPagoModal({ open: false, carteraId: null, pago: null })}
        title={pagoModal.pago ? 'Editar Abono' : 'Registrar Abono'}
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
            <DatePicker
              name="fecha_pago"
              value={pagoForm.fecha}
              onChange={(e) => setPagoForm((f) => ({ ...f, fecha: e.target.value }))}
              placeholder="Seleccionar fecha"
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
            onClick={() => setPagoModal({ open: false, carteraId: null, pago: null })}
          >
            Cancelar
          </Button>
          <Button onClick={savePago} disabled={savingPago}>
            {savingPago ? <Spinner size="sm" /> : pagoModal.pago ? 'Guardar cambios' : 'Registrar abono'}
          </Button>
        </div>
      </Modal>

      {/* ── Delete Pago Modal ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deletePagoModal.open}
        onClose={() => setDeletePagoModal({ open: false, carteraId: null, pagoId: null })}
        onConfirm={confirmDeletePago}
        title="Eliminar abono"
        message="Estas seguro de que deseas eliminar este abono? El saldo del registro se actualizara."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
