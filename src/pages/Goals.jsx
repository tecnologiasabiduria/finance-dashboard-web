import { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wallet,
  PieChart,
  Settings2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Modal, ConfirmModal, Spinner, CreatableSelect } from '../components/ui';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function Goals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'config'

  // Budget data
  const [config, setConfig] = useState(null);
  const [pockets, setPockets] = useState([]);
  const [overview, setOverview] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);

  // Month/year navigation
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [configRes, pocketsRes, catRes] = await Promise.all([
          api.getBudgetConfig(selectedYear),
          api.getBudgetPockets(),
          api.getCategories(),
        ]);

        const cfg = configRes.data.config;
        setConfig(cfg);
        setAnnualTarget(cfg ? cfg.annual_revenue_target.toString() : '');

        const pkts = pocketsRes.data.pockets || [];
        setPockets(pkts);

        setExpenseCategories(catRes.data.grouped?.expense || []);

        // Load overview if config exists
        if (cfg) {
          const overviewRes = await api.getBudgetOverview(selectedYear, selectedMonth);
          setOverview(overviewRes.data);
        } else {
          setOverview(null);
        }
      } catch (err) {
        console.error('Error loading budget:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedMonth, selectedYear]);

  // Month navigation
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  // Save annual target
  const handleSaveConfig = async () => {
    const target = parseFloat(annualTarget);
    if (!target || target <= 0) return;
    setSavingConfig(true);
    try {
      const res = await api.saveBudgetConfig({ year: selectedYear, annual_revenue_target: target });
      setConfig(res.data.config);

      // Reload overview
      const overviewRes = await api.getBudgetOverview(selectedYear, selectedMonth);
      setOverview(overviewRes.data);
    } catch (err) {
      console.error('Error saving config:', err);
    }
    setSavingConfig(false);
  };

  // Start editing pockets
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
      if (config) {
        const overviewRes = await api.getBudgetOverview(selectedYear, selectedMonth);
        setOverview(overviewRes.data);
      }
    } catch (err) {
      console.error('Error saving pockets:', err);
    }
    setSavingPockets(false);
  };

  // Create category inline (same pattern as TransactionForm)
  const handleCreateCategory = async (name) => {
    try {
      await api.createCategory({ name, type: 'expense', color: '#D4AF37' });
    } catch (err) {
      // If category already exists, that's fine — just use it
      if (!err.message?.includes('Ya existe')) {
        console.error('Error creating category:', err);
        return null;
      }
    }
    // Reload categories either way
    const catRes = await api.getCategories();
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
      // Reload categories since backend auto-creates them
      const catRes = await api.getCategories();
      setExpenseCategories(catRes.data.grouped?.expense || []);
      setNewPocketModal(false);
      setNewPocket({ name: '', percentage: '' });
      if (config) {
        const overviewRes = await api.getBudgetOverview(selectedYear, selectedMonth);
        setOverview(overviewRes.data);
      }
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
      if (config) {
        const overviewRes = await api.getBudgetOverview(selectedYear, selectedMonth);
        setOverview(overviewRes.data);
      }
    } catch (err) {
      console.error('Error deleting pocket:', err);
    }
  };

  const totalPercentage = useMemo(() => {
    const source = editingPockets ? pocketDraft : pockets;
    return source.reduce((s, p) => s + (parseFloat(p.percentage) || 0), 0);
  }, [pockets, pocketDraft, editingPockets]);

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
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Presupuesto por Bolsillo</h1>
          <p className="text-dark-400 mt-1">Planifica y controla la distribución de tus ingresos</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center bg-dark-900 border border-dark-800 rounded-xl">
            <button onClick={goToPrevMonth} className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-l-xl transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 px-3 py-2">
              <Calendar className="h-4 w-4 text-gold-400" />
              <span className="text-sm font-medium text-white min-w-[130px] text-center">
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <button onClick={goToNextMonth} className="p-2.5 text-dark-400 hover:text-white hover:bg-dark-800 rounded-r-xl transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-dark-900/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'overview' ? 'bg-gold-400/20 text-gold-400' : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <PieChart className="h-4 w-4" />
          Resumen
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'config' ? 'bg-gold-400/20 text-gold-400' : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          Configurar
        </button>
      </div>

      {activeTab === 'config' ? (
        <ConfigView
          annualTarget={annualTarget}
          setAnnualTarget={setAnnualTarget}
          handleSaveConfig={handleSaveConfig}
          savingConfig={savingConfig}
          pockets={pockets}
          editingPockets={editingPockets}
          pocketDraft={pocketDraft}
          setPocketDraft={setPocketDraft}
          startEditPockets={startEditPockets}
          cancelEditPockets={cancelEditPockets}
          savePocketEdits={savePocketEdits}
          savingPockets={savingPockets}
          totalPercentage={totalPercentage}
          setNewPocketModal={setNewPocketModal}
          setDeleteModal={setDeleteModal}
          selectedYear={selectedYear}
          config={config}
        />
      ) : (
        <OverviewView
          overview={overview}
          config={config}
          pockets={pockets}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          setActiveTab={setActiveTab}
        />
      )}

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
          <Input
            label="Porcentaje (%)"
            type="number"
            placeholder="20"
            value={newPocket.percentage}
            onChange={(e) => setNewPocket({ ...newPocket, percentage: e.target.value })}
          />
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
    </div>
  );
}

// ============================================================
// CONFIG VIEW — Configurar meta y bolsillos
// ============================================================
function ConfigView({
  annualTarget, setAnnualTarget, handleSaveConfig, savingConfig,
  pockets, editingPockets, pocketDraft, setPocketDraft,
  startEditPockets, cancelEditPockets, savePocketEdits, savingPockets,
  totalPercentage, setNewPocketModal, setDeleteModal,
  selectedYear, config,
}) {
  const monthlyEstimate = annualTarget ? parseFloat(annualTarget) / 12 : 0;

  return (
    <div className="space-y-6">
      {/* Annual Target */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Meta de Facturación</h3>
        <p className="text-sm text-dark-400 mb-4">Define tu meta de ventas para el año {selectedYear}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Facturación Anual (COP)</label>
            <input
              type="number"
              value={annualTarget}
              onChange={(e) => setAnnualTarget(e.target.value)}
              placeholder="914940000"
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-gold-400/50 transition-all"
            />
          </div>
          <div className="bg-dark-800/50 rounded-lg p-4">
            <p className="text-xs text-dark-500 mb-1">Estimado Mensual</p>
            <p className="text-xl font-bold text-gold-400">{formatCurrency(monthlyEstimate)}</p>
          </div>
          <Button onClick={handleSaveConfig} loading={savingConfig} icon={Save}>
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
                  <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">
                    Presupuesto Mes
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-dark-400 w-20">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(editingPockets ? pocketDraft : pockets).map((pocket, idx) => {
                  const budget = monthlyEstimate * (pocket.percentage || 0) / 100;
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
                      <td className="py-3 px-4 text-right text-dark-300">
                        {formatCurrency(budget)}
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
                  <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(monthlyEstimate)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// OVERVIEW VIEW — Vista con cruce de datos reales
// ============================================================
function OverviewView({ overview, config, pockets, selectedMonth, selectedYear, setActiveTab }) {
  if (!config || pockets.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Wallet className="h-16 w-16 text-dark-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Configura tu presupuesto</h3>
        <p className="text-dark-400 mb-6">
          Define tu meta de facturación anual y los bolsillos de gasto para comenzar
        </p>
        <Button icon={Settings2} onClick={() => setActiveTab('config')}>
          Ir a Configurar
        </Button>
      </Card>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  const monthName = MONTH_NAMES[selectedMonth - 1];
  const salesDev = overview.sales_deviation;
  const salesDevPct = overview.monthly_estimate > 0
    ? ((overview.actual_sales - overview.monthly_estimate) / overview.monthly_estimate * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {overview.alerts && overview.alerts.length > 0 && (
        <div className="space-y-2">
          {overview.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                alert.type === 'danger'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-amber-500/10 border-amber-500/30'
              }`}
            >
              <AlertCircle className={`h-5 w-5 flex-shrink-0 ${alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
              <p className={`text-sm font-medium ${alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'}`}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-gold-400/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Ventas Estimadas</span>
            <Target className="h-4 w-4 text-gold-400" />
          </div>
          <p className="text-xl font-bold text-gold-400">{formatCurrency(overview.monthly_estimate)}</p>
          <p className="text-xs text-dark-500 mt-1">{monthName} {selectedYear}</p>
        </Card>

        <Card className={`p-5 ${salesDev >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Ventas Reales</span>
            {salesDev >= 0
              ? <ArrowUpRight className="h-4 w-4 text-emerald-400" />
              : <ArrowDownRight className="h-4 w-4 text-red-400" />
            }
          </div>
          <p className={`text-xl font-bold ${salesDev >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(overview.actual_sales)}
          </p>
          <p className={`text-xs mt-1 ${salesDev >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {salesDev >= 0 ? '+' : ''}{salesDevPct}% vs estimado
          </p>
        </Card>

        <Card className="p-5 border-dark-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Presupuesto Total</span>
            <PieChart className="h-4 w-4 text-dark-400" />
          </div>
          <p className="text-xl font-bold text-white">{formatCurrency(overview.total_budget)}</p>
          <p className="text-xs text-dark-500 mt-1">Suma de bolsillos</p>
        </Card>

        <Card className={`p-5 ${overview.total_actual_expenses > overview.total_budget ? 'border-red-500/20' : 'border-emerald-500/20'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-400 uppercase tracking-wider">Gastos Reales</span>
            <TrendingDown className="h-4 w-4 text-red-400" />
          </div>
          <p className={`text-xl font-bold ${overview.total_actual_expenses > overview.total_budget ? 'text-red-400' : 'text-emerald-400'}`}>
            {formatCurrency(overview.total_actual_expenses)}
          </p>
          <p className="text-xs text-dark-500 mt-1">De transacciones registradas</p>
        </Card>
      </div>

      {/* Pockets Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Detalle por Bolsillo</h3>
            <p className="text-sm text-dark-400">{monthName} {selectedYear}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-dark-800/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400">Bolsillo</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">% Presup.</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Valor Presupuesto</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Valor Real</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">% Real</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Desviación ($)</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-dark-400">Desviación (%)</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-dark-400">Estado</th>
              </tr>
            </thead>
            <tbody>
              {overview.pockets.map((p) => {
                const isOver = p.status === 'over';
                const hasData = p.actual_value > 0;
                return (
                  <tr key={p.id} className="border-t border-dark-800/50 hover:bg-dark-800/20">
                    <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                    <td className="py-3 px-4 text-right text-gold-400">{p.percentage}%</td>
                    <td className="py-3 px-4 text-right text-dark-300">{formatCurrency(p.budget_value)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${hasData ? (isOver ? 'text-red-400' : 'text-emerald-400') : 'text-dark-500'}`}>
                      {hasData ? formatCurrency(p.actual_value) : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right ${hasData ? (isOver ? 'text-red-400' : 'text-dark-300') : 'text-dark-500'}`}>
                      {hasData ? `${p.percentage_real}%` : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      p.deviation_amount > 0 ? 'text-red-400' : p.deviation_amount < 0 ? 'text-emerald-400' : 'text-dark-500'
                    }`}>
                      {hasData ? (
                        <>
                          {p.deviation_amount > 0 ? '+' : ''}
                          {formatCurrency(p.deviation_amount)}
                        </>
                      ) : '—'}
                    </td>
                    <td className={`py-3 px-4 text-right ${
                      p.deviation_percent > 0 ? 'text-red-400' : p.deviation_percent < 0 ? 'text-emerald-400' : 'text-dark-500'
                    }`}>
                      {hasData ? `${p.deviation_percent > 0 ? '+' : ''}${p.deviation_percent}%` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isOver ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-lg">
                          <AlertTriangle className="h-3 w-3" />
                          Excedido
                        </span>
                      ) : hasData ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg">
                          <CheckCircle className="h-3 w-3" />
                          OK
                        </span>
                      ) : (
                        <span className="text-dark-500 text-xs">Sin datos</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                <td className="py-3 px-4 font-bold text-white">TOTAL</td>
                <td className="py-3 px-4 text-right font-bold text-gold-400">100%</td>
                <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(overview.total_budget)}</td>
                <td className="py-3 px-4 text-right font-bold text-white">{formatCurrency(overview.total_actual_expenses)}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Progress Bars — Visual summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ejecución del Presupuesto</h3>
        <div className="space-y-4">
          {overview.pockets.map((p) => {
            const pct = p.budget_value > 0 ? Math.min((p.actual_value / p.budget_value) * 100, 150) : 0;
            const isOver = p.status === 'over';
            return (
              <div key={p.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-dark-300">{p.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-dark-400">
                      {formatCurrency(p.actual_value)} / {formatCurrency(p.budget_value)}
                    </span>
                    <span className={`text-xs font-medium ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Annual Sales Tracking */}
      {overview.annual_data && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-lg font-semibold text-white">Ventas: Estimado vs Real — {selectedYear}</h3>
            <p className="text-sm text-dark-400">Seguimiento mes a mes de la facturación</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400">Concepto</th>
                  {MONTH_NAMES.map((m, i) => (
                    <th key={i} className={`text-right py-3 px-3 text-xs font-medium min-w-[85px] ${
                      i + 1 === selectedMonth ? 'text-gold-400' : 'text-dark-400'
                    }`}>
                      {m.substring(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-dark-800/50">
                  <td className="py-3 px-4 font-medium text-dark-300">Ventas Estimadas</td>
                  {overview.annual_data.map((d, i) => (
                    <td key={i} className="py-3 px-3 text-right text-dark-400">{formatCurrency(d.estimated_sales)}</td>
                  ))}
                </tr>
                <tr className="border-t border-dark-800/50">
                  <td className="py-3 px-4 font-medium text-emerald-400">Ventas Reales</td>
                  {overview.annual_data.map((d, i) => (
                    <td key={i} className={`py-3 px-3 text-right font-medium ${
                      d.actual_sales > 0
                        ? (d.actual_sales >= d.estimated_sales ? 'text-emerald-400' : 'text-red-400')
                        : 'text-dark-600'
                    }`}>
                      {d.actual_sales > 0 ? formatCurrency(d.actual_sales) : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="border-t-2 border-dark-700 bg-dark-800/30">
                  <td className="py-3 px-4 font-bold text-white">Desviación</td>
                  {overview.annual_data.map((d, i) => {
                    const dev = d.actual_sales - d.estimated_sales;
                    return (
                      <td key={i} className={`py-3 px-3 text-right font-medium ${
                        d.actual_sales > 0
                          ? (dev >= 0 ? 'text-emerald-400' : 'text-red-400')
                          : 'text-dark-600'
                      }`}>
                        {d.actual_sales > 0 ? formatCurrency(dev) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
