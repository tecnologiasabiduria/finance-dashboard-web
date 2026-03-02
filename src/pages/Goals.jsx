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
import { getCachedCategories, invalidateCategoriesCache } from '../services/cache';

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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [configRes, pocketsRes, catRes] = await Promise.all([
          api.getBudgetConfig(selectedYear),
          api.getBudgetPockets(),
          getCachedCategories(),
        ]);

        const cfg = configRes.data.config;
        setConfig(cfg);
        setAnnualTarget(cfg ? cfg.annual_revenue_target.toString() : '');

        const pkts = pocketsRes.data.pockets || [];
        setPockets(pkts);

        setExpenseCategories(catRes.data.grouped?.expense || []);
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
    if (!target || target <= 0) return;

    const issues = [];
    if (pockets.length === 0) {
      issues.push('No hay bolsillos configurados. Sin bolsillos, el presupuesto no se distribuirá en categorías de gasto.');
    } else if (totalPercentage !== 100) {
      issues.push(`Los bolsillos suman ${totalPercentage}% en lugar de 100%. El presupuesto no se distribuirá correctamente.`);
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
    if (!target || target <= 0) return;
    setPocketWarning({ open: false, issues: [] });
    setSavingConfig(true);
    try {
      const res = await api.saveBudgetConfig({ year: selectedYear, annual_revenue_target: target });
      setConfig(res.data.config);
      setSuccessMsg('Meta guardada correctamente');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
    }
    setSavingConfig(false);
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
      setEditingPockets(false);
    } catch (err) {
      console.error('Error saving pockets:', err);
    }
    setSavingPockets(false);
  };

  // Create category inline
  const handleCreateCategory = async (name) => {
    try {
      await api.createCategory({ name, type: 'expense', color: '#D4AF37' });
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
      invalidateCategoriesCache();
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
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Presupuesto</h1>
          <p className="text-dark-400 mt-1">Configura tu meta de facturación y bolsillos de gasto</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-900 border border-dark-800 rounded-xl">
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
          <Button onClick={validateAndSave} loading={savingConfig} icon={Save}>
            Guardar Meta
          </Button>
        </div>
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
        <div className={`mb-4 px-4 py-2 rounded-lg flex items-center gap-2 text-sm ${
          totalPercentage === 100
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-amber-500/10 text-amber-400'
        }`}>
          {totalPercentage === 100 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          Total: {totalPercentage}%
          {totalPercentage !== 100 && <span className="text-dark-400 ml-2">(debe sumar 100%)</span>}
        </div>

        {pockets.length === 0 ? (
          <div className="text-center py-10 text-dark-400">
            <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay bolsillos configurados</p>
            <p className="text-sm mt-1">Haz clic en "Agregar" para crear un bolsillo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
              <tfoot>
                <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                  <td className="py-3 px-4 font-bold text-white">TOTAL</td>
                  <td className="py-3 px-4 text-right font-bold text-gold-400">{totalPercentage}%</td>
                  <td className="py-3 px-4 text-right font-bold text-dark-400">{formatCurrency(annualTarget ? parseFloat(annualTarget) : 0)}</td>
                  <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(monthlyEstimate)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
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
            Configura los bolsillos correctamente antes de guardar la meta. Los porcentajes deben sumar exactamente 100%.
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
