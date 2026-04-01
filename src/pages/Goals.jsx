import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Modal, ConfirmModal, Spinner, CreatableSelect } from '../components/ui';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { getCachedCategories, getCachedBudgetConfig, getCachedBudgetPockets, invalidateBudgetCache, invalidateCategoriesCache, invalidateDashboardCache } from '../services/cache';

export default function Goals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Budget data
  const [config, setConfig] = useState(null);
  const [pockets, setPockets] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // Year navigation
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Config form
  const [annualTarget, setAnnualTarget] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Pocket management
  const [editingPockets, setEditingPockets] = useState(false);
  const [pocketDraft, setPocketDraft] = useState([]);
  const [savingPockets, setSavingPockets] = useState(false);
  const [newPocketModal, setNewPocketModal] = useState(false);
  const [newPocket, setNewPocket] = useState({ name: '', percentage: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, pocket: null });
  const [pocketWarning, setPocketWarning] = useState({ open: false, issues: [] });
  const [successMsg, setSuccessMsg] = useState('');
  const [configError, setConfigError] = useState('');
  const [deleteConfigModal, setDeleteConfigModal] = useState(false);
  const [deletingConfig, setDeletingConfig] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [configRes, pocketsRes, catRes] = await Promise.all([
          getCachedBudgetConfig(selectedYear),
          getCachedBudgetPockets(),
          getCachedCategories(),
        ]);

        const cfg = configRes.data?.config;
        setConfig(cfg);
        setAnnualTarget(cfg ? cfg.annual_revenue_target.toString() : '');

        const pkts = pocketsRes.data?.pockets || [];
        setPockets(pkts);

        setExpenseCategories(catRes.data?.grouped?.expense || []);
      } catch (err) {
        console.error('Error loading budget:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedYear]);

  // Validate pockets before saving
  const validateAndSave = () => {
    const target = parseFloat(annualTarget);
    if (!target || target <= 0) {
      setConfigError('La meta debe ser un valor mayor a cero');
      setTimeout(() => setConfigError(''), 4000);
      return;
    }
    setConfigError('');

    const issues = [];
    if (pockets.length === 0) {
      issues.push('No hay bolsillos configurados. Sin bolsillos, el presupuesto no se distribuirá en categorías de gasto.');
    } else if (totalPercentage > 100) {
      issues.push(`Los bolsillos suman ${totalPercentage}%, lo cual supera el 100% de la facturación. Reduce los porcentajes para dejar margen de utilidad.`);
    }

    if (issues.length > 0) {
      setPocketWarning({ open: true, issues });
    } else {
      doSaveConfig();
    }
  };

  // Save annual target
  const doSaveConfig = async () => {
    const target = parseFloat(annualTarget);
    if (!target || target <= 0) {
      setConfigError('La meta debe ser un valor mayor a cero');
      setTimeout(() => setConfigError(''), 4000);
      return;
    }
    setPocketWarning({ open: false, issues: [] });
    setSavingConfig(true);
    try {
      const res = await api.saveBudgetConfig({ year: selectedYear, annual_revenue_target: target });
      setConfig(res.data.config);
      invalidateBudgetCache();
      invalidateDashboardCache();
      setSuccessMsg('Meta guardada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
    }
    setSavingConfig(false);
  };

  // Delete annual target
  const doDeleteConfig = async () => {
    setDeletingConfig(true);
    try {
      await api.deleteBudgetConfig(selectedYear);
      setConfig(null);
      setAnnualTarget('');
      setPockets([]);
      invalidateBudgetCache();
      invalidateDashboardCache();
      invalidateCategoriesCache();
      setDeleteConfigModal(false);
      setSuccessMsg('Meta eliminada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting config:', err);
    }
    setDeletingConfig(false);
  };

  // Pocket editing
  const startEditPockets = () => {
    setPocketDraft(pockets.map((p) => ({ ...p })));
    setEditingPockets(true);
  };

  const cancelEditPockets = () => {
    setEditingPockets(false);
    setPocketDraft([]);
  };

  const savePocketEdits = async () => {
    setSavingPockets(true);
    try {
      const res = await api.saveBudgetPocketsBulk(pocketDraft);
      setPockets(res.data.pockets);
      invalidateBudgetCache();
      invalidateDashboardCache();
      setEditingPockets(false);
    } catch (err) {
      console.error('Error saving pockets:', err);
    }
    setSavingPockets(false);
  };

  // Create category inline
  const handleCreateCategory = async (name) => {
    try {
      await api.createCategory({ name, type: 'expense', color: '#da7d41' });
    } catch (err) {
      if (!err.message?.includes('Ya existe')) {
        console.error('Error creating category:', err);
        return null;
      }
    }
    invalidateCategoriesCache();
    const catRes = await getCachedCategories();
    setExpenseCategories(catRes.data.grouped?.expense || []);
    return name;
  };

  const handleAddPocket = async () => {
    if (!newPocket.name.trim() || !newPocket.percentage) return;
    try {
      const res = await api.createBudgetPocket({
        name: newPocket.name.trim(),
        percentage: parseFloat(newPocket.percentage),
        sort_order: pockets.length,
      });
      setPockets([...pockets, res.data.pocket]);
      invalidateBudgetCache();
      invalidateCategoriesCache();
      invalidateDashboardCache();
      const catRes = await getCachedCategories();
      setExpenseCategories(catRes.data.grouped?.expense || []);
      setNewPocketModal(false);
      setNewPocket({ name: '', percentage: '' });
    } catch (err) {
      console.error('Error adding pocket:', err);
    }
  };

  const handleDeletePocket = async () => {
    if (!deleteModal.pocket) return;
    try {
      await api.deleteBudgetPocket(deleteModal.pocket.id);
      setPockets(pockets.filter((p) => p.id !== deleteModal.pocket.id));
      invalidateBudgetCache();
      invalidateDashboardCache();
      setDeleteModal({ open: false, pocket: null });
    } catch (err) {
      console.error('Error deleting pocket:', err);
    }
  };

  const totalPercentage = useMemo(() => {
    const source = editingPockets ? pocketDraft : pockets;
    return source.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0);
  }, [pockets, pocketDraft, editingPockets]);

  const monthlyEstimate = annualTarget ? parseFloat(annualTarget) / 12 : 0;

  // Format number with dots as thousand separators
  const formatWithDots = (value) => {
    if (!value) return '';
    return Number(value).toLocaleString('es-CO');
  };

  const handleAnnualTargetChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setAnnualTarget(raw);
  };

  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-dark-800 rounded-lg ${className}`} />
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-44 mb-2" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>

        {/* Annual target card skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="bg-dark-800/50 rounded-lg p-4">
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-7 w-40" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>

        {/* Pockets card skeleton */}
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-5 w-52 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-dark-800/50 rounded-lg p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-8 w-14 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Presupuesto</h1>
          <p className="text-dark-400 mt-1">Configura tu meta de facturación y bolsillos de gasto</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-900 border border-dark-700 rounded-xl">
            <button
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-l-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm font-medium text-white">{selectedYear}</span>
            </div>
            <button
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-r-xl transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-fade-in">
          <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-400">{successMsg}</p>
        </div>
      )}

      {/* Annual Target */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Meta de Facturación</h3>
        <p className="text-sm text-dark-400 mb-4">Define tu meta de ventas para el año {selectedYear}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Facturación Anual (COP)</label>
            <input
              type="text"
              value={formatWithDots(annualTarget)}
              onChange={handleAnnualTargetChange}
              placeholder="914.940.000"
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-gold-400/50 transition-all"
            />
          </div>
          <div className="bg-dark-800/50 rounded-lg p-4">
            <p className="text-xs text-dark-500 mb-1">Estimado Mensual</p>
            <p className="text-xl font-bold text-gold-400">{formatCurrency(monthlyEstimate)}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={validateAndSave} loading={savingConfig} icon={Save} className="flex-1">
              Guardar Meta
            </Button>
            {config && (
              <Button
                variant="outline"
                onClick={() => setDeleteConfigModal(true)}
                className="!border-red-500/30 !text-red-400 hover:!bg-red-500/10"
                icon={Trash2}
              />
            )}
          </div>
        </div>

        {configError && (
          <div className="flex items-center gap-3 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl animate-fade-in">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-sm font-medium text-red-400">{configError}</p>
          </div>
        )}
      </Card>

      {/* Pockets Config */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Bolsillos de Presupuesto</h3>
            <p className="text-sm text-dark-400">Categorías de gasto con porcentaje asignado</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" icon={Plus} onClick={() => setNewPocketModal(true)}>
              Agregar
            </Button>
            {pockets.length > 0 && !editingPockets && (
              <Button variant="secondary" size="sm" icon={Edit2} onClick={startEditPockets}>
                Editar
              </Button>
            )}
            {editingPockets && (
              <>
                <Button variant="secondary" size="sm" icon={X} onClick={cancelEditPockets}>Cancelar</Button>
                <Button size="sm" icon={Save} onClick={savePocketEdits} loading={savingPockets}>Guardar</Button>
              </>
            )}
          </div>
        </div>

        {/* Total % indicator */}
        <div className={`mb-4 px-4 py-2.5 rounded-lg flex items-center justify-between gap-2 text-sm ${
          totalPercentage > 100
            ? 'bg-red-500/10 text-red-400'
            : totalPercentage === 100
            ? 'bg-amber-500/10 text-amber-400'
            : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          <div className="flex items-center gap-2">
            {totalPercentage > 100
              ? <AlertTriangle className="h-4 w-4" />
              : totalPercentage === 100
              ? <AlertTriangle className="h-4 w-4" />
              : <CheckCircle className="h-4 w-4" />
            }
            <span>Gastos asignados: <strong>{totalPercentage}%</strong></span>
          </div>
          {totalPercentage > 100
            ? <span className="font-medium">Supera el 100% — revisa los porcentajes</span>
            : totalPercentage === 100
            ? <span className="font-medium text-amber-300">Sin margen de utilidad</span>
            : <span className="font-medium">Utilidad proyectada: <strong>{(100 - totalPercentage).toFixed(1).replace(/\.0$/, '')}%</strong></span>
          }
        </div>

        {pockets.length === 0 ? (
          <div className="text-center py-10 text-dark-400">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay bolsillos configurados</p>
            <p className="text-sm mt-1">Haz clic en "Agregar" para crear un bolsillo</p>
          </div>
        ) : (
          <>
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-800/30">
                  <th className="text-left py-3 px-4 text-xs font-medium text-dark-400">Bolsillo</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">%</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Presup. Anual</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Presup. Mensual</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(editingPockets ? pocketDraft : pockets).map((pocket, idx) => {
                  const budgetMonth = monthlyEstimate * (pocket.percentage || 0) / 100;
                  const budgetAnnual = budgetMonth * 12;
                  return (
                    <tr key={pocket.id || idx} className="border-t border-dark-800/50 hover:bg-dark-800/20">
                      <td className="py-3 px-4">
                        {editingPockets ? (
                          <input
                            value={pocketDraft[idx]?.name || ''}
                            onChange={(e) => {
                              const draft = [...pocketDraft];
                              draft[idx] = { ...draft[idx], name: e.target.value };
                              setPocketDraft(draft);
                            }}
                            className="bg-dark-800 border border-dark-700 rounded px-3 py-1.5 text-white text-sm w-full focus:outline-none focus:border-gold-400/50"
                          />
                        ) : (
                          <span className="text-white font-medium">{pocket.name}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {editingPockets ? (
                          <input
                            type="number"
                            value={pocketDraft[idx]?.percentage || ''}
                            onChange={(e) => {
                              const draft = [...pocketDraft];
                              draft[idx] = { ...draft[idx], percentage: parseFloat(e.target.value) || 0 };
                              setPocketDraft(draft);
                            }}
                            className="bg-dark-800 border border-dark-700 rounded px-3 py-1.5 text-white text-sm w-20 text-right focus:outline-none focus:border-gold-400/50"
                          />
                        ) : (
                          <span className="text-gold-400 font-medium">{pocket.percentage}%</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-dark-400">
                        {formatCurrency(budgetAnnual)}
                      </td>
                      <td className="py-3 px-4 text-right text-dark-300">
                        {formatCurrency(budgetMonth)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!editingPockets && (
                          <button
                            onClick={() => setDeleteModal({ open: true, pocket })}
                            className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Resumen financiero — separado visualmente de la tabla de bolsillos */}
          <div className="mt-4 mx-1 p-4 rounded-xl border border-dark-700 bg-dark-900/60 hidden md:block">
            <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-3">Resumen proyectado</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-dark-400 mb-0.5">Gastos estimados ({totalPercentage}%)</p>
                <p className="text-sm font-semibold text-white">{formatCurrency(annualTarget ? parseFloat(annualTarget) * totalPercentage / 100 : 0)} / año</p>
                <p className="text-xs text-dark-400">{formatCurrency(monthlyEstimate * totalPercentage / 100)} / mes</p>
              </div>
              <div className={totalPercentage < 100 ? 'text-emerald-400' : 'text-dark-500'}>
                <p className="text-xs mb-0.5 opacity-80">Utilidad proyectada ({totalPercentage < 100 ? (100 - totalPercentage).toFixed(1).replace(/\.0$/, '') : 0}%)</p>
                <p className="text-sm font-semibold">{formatCurrency(annualTarget ? parseFloat(annualTarget) * Math.max(0, 100 - totalPercentage) / 100 : 0)} / año</p>
                <p className="text-xs opacity-80">{formatCurrency(monthlyEstimate * Math.max(0, 100 - totalPercentage) / 100)} / mes</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dark-400 mb-0.5">Total facturación (100%)</p>
                <p className="text-sm font-semibold text-white">{formatCurrency(annualTarget ? parseFloat(annualTarget) : 0)} / año</p>
                <p className="text-xs text-dark-400">{formatCurrency(monthlyEstimate)} / mes</p>
              </div>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-3">
            {(editingPockets ? pocketDraft : pockets).map((pocket, idx) => {
              const budgetMonth = monthlyEstimate * (pocket.percentage || 0) / 100;
              const budgetAnnual = budgetMonth * 12;
              return (
                <Card key={pocket.id || idx} className="p-4">
                  {editingPockets ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-dark-400 mb-1">Nombre</label>
                        <input
                          value={pocketDraft[idx]?.name || ''}
                          onChange={(e) => {
                            const draft = [...pocketDraft];
                            draft[idx] = { ...draft[idx], name: e.target.value };
                            setPocketDraft(draft);
                          }}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-400/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-dark-400 mb-1">Porcentaje</label>
                        <input
                          type="number"
                          value={pocketDraft[idx]?.percentage || ''}
                          onChange={(e) => {
                            const draft = [...pocketDraft];
                            draft[idx] = { ...draft[idx], percentage: parseFloat(e.target.value) || 0 };
                            setPocketDraft(draft);
                          }}
                          className="w-full bg-dark-800 border border-dark-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-400/50"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white">{pocket.name}</h4>
                        <button
                          onClick={() => setDeleteModal({ open: true, pocket })}
                          className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-dark-400">Porcentaje</p>
                          <p className="text-lg font-bold text-gold-400">{pocket.percentage}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-dark-400">Presup. Mensual</p>
                          <p className="text-sm font-medium text-white">{formatCurrency(budgetMonth)}</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-dark-800">
                        <p className="text-xs text-dark-400">Presupuesto Anual</p>
                        <p className="text-sm text-dark-300">{formatCurrency(budgetAnnual)}</p>
                      </div>
                    </>
                  )}
                </Card>
              );
            })}

            {/* Resumen Mobile */}
            <div className="p-4 rounded-xl border border-dark-700 bg-dark-900/60">
              <p className="text-xs text-dark-500 uppercase tracking-wider font-medium mb-3">Resumen proyectado</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs text-dark-400">Gastos estimados ({totalPercentage}%)</p>
                  <p className="text-sm font-semibold text-white">{formatCurrency(monthlyEstimate * totalPercentage / 100)}/mes</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-xs ${totalPercentage < 100 ? 'text-emerald-400' : 'text-dark-500'}`}>
                    Utilidad proyectada ({totalPercentage < 100 ? (100 - totalPercentage).toFixed(1).replace(/\.0$/, '') : 0}%)
                  </p>
                  <p className={`text-sm font-semibold ${totalPercentage < 100 ? 'text-emerald-400' : 'text-dark-500'}`}>
                    {formatCurrency(monthlyEstimate * Math.max(0, 100 - totalPercentage) / 100)}/mes
                  </p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-dark-700">
                  <p className="text-xs text-dark-400">Total facturación</p>
                  <p className="text-sm font-bold text-white">{formatCurrency(monthlyEstimate)}/mes</p>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </Card>

      {/* Add Pocket Modal */}
      <Modal isOpen={newPocketModal} onClose={() => setNewPocketModal(false)} title="Nuevo Bolsillo">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Categoría de Gasto *</label>
            <CreatableSelect
              name="pocketCategory"
              value={newPocket.name}
              onChange={(e) => setNewPocket({ ...newPocket, name: e.target.value })}
              options={expenseCategories
                .filter(c => !pockets.some(p => p.name.toLowerCase() === c.name.toLowerCase()))
                .map(c => ({ value: c.name, label: c.name }))}
              placeholder="Selecciona o crea categoría"
              onCreateNew={(name) => handleCreateCategory(name)}
              createLabel="Añadir categoría"
              emptyMessage="No hay categorías de gasto creadas"
              emptyActionLabel="Ir a Categorías"
              emptyAction={() => navigate('/categories')}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">Porcentaje</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={newPocket.percentage}
                onChange={(e) => setNewPocket({ ...newPocket, percentage: e.target.value })}
                className="w-full px-4 py-3 pr-10 bg-dark-900 border border-dark-700 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 font-medium pointer-events-none">%</span>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setNewPocketModal(false)}>Cancelar</Button>
            <Button className="flex-1" icon={Save} onClick={handleAddPocket} disabled={!newPocket.name}>Crear</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Pocket Confirm */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, pocket: null })}
        onConfirm={handleDeletePocket}
        title="Eliminar Bolsillo"
        message={`¿Estás seguro de eliminar "${deleteModal.pocket?.name}"?`}
        confirmText="Eliminar"
      />

      {/* Delete Config Confirm */}
      <ConfirmModal
        isOpen={deleteConfigModal}
        onClose={() => setDeleteConfigModal(false)}
        onConfirm={doDeleteConfig}
        title="Eliminar Meta"
        message={`¿Estás seguro de eliminar la meta de facturación del año ${selectedYear}? El informe mensual dejará de mostrar el seguimiento de metas.`}
        confirmText={deletingConfig ? 'Eliminando...' : 'Eliminar Meta'}
      />

      {/* Pocket validation warning */}
      <Modal
        isOpen={pocketWarning.open}
        onClose={() => setPocketWarning({ open: false, issues: [] })}
        title="Bolsillos sin configurar"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              {pocketWarning.issues.map((issue, i) => (
                <p key={i} className="text-sm text-red-300">{issue}</p>
              ))}
            </div>
          </div>
          <p className="text-sm text-dark-400">
            Los porcentajes de gastos no pueden superar el 100% de la facturación. El porcentaje restante se considera utilidad proyectada.
          </p>
          <div className="pt-2">
            <Button
              className="w-full"
              onClick={() => setPocketWarning({ open: false, issues: [] })}
            >
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
