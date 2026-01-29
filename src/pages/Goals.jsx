import { useState, useEffect } from 'react';
import { Target, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button, Card, Input, Modal, ConfirmModal } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

// Colores disponibles para las metas
const COLORS = [
  { name: 'Dorado', value: '#D4AF37' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Morado', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Naranja', value: '#F97316' },
];

// Datos iniciales de metas (se guardan en localStorage)
const DEFAULT_GOALS = [
  { id: '1', name: 'Meta de ahorro', current: 0, target: 20000, color: '#D4AF37' },
  { id: '2', name: 'Fondo de emergencia', current: 0, target: 10000, color: '#10B981' },
  { id: '3', name: 'Inversión mensual', current: 0, target: 5000, color: '#3B82F6' },
];

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, goal: null });

  // Cargar metas del localStorage
  useEffect(() => {
    const savedGoals = localStorage.getItem(`goals_${user?.id}`);
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    } else {
      setGoals(DEFAULT_GOALS);
    }
    setLoading(false);
  }, [user?.id]);

  // Guardar metas en localStorage
  const saveGoals = (newGoals) => {
    setGoals(newGoals);
    localStorage.setItem(`goals_${user?.id}`, JSON.stringify(newGoals));
  };

  const handleSaveGoal = (goalData) => {
    if (editingGoal) {
      // Editar meta existente
      const updated = goals.map((g) =>
        g.id === editingGoal.id ? { ...g, ...goalData } : g
      );
      saveGoals(updated);
    } else {
      // Nueva meta
      const newGoal = {
        id: Date.now().toString(),
        ...goalData,
        current: 0,
      };
      saveGoals([...goals, newGoal]);
    }
    setModalOpen(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = () => {
    if (deleteModal.goal) {
      saveGoals(goals.filter((g) => g.id !== deleteModal.goal.id));
      setDeleteModal({ open: false, goal: null });
    }
  };

  const handleUpdateProgress = (goalId, newCurrent) => {
    const updated = goals.map((g) =>
      g.id === goalId ? { ...g, current: Math.max(0, newCurrent) } : g
    );
    saveGoals(updated);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setModalOpen(true);
  };

  const openNewModal = () => {
    setEditingGoal(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-2 border-gold-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Metas Financieras</h1>
          <p className="text-dark-400 mt-1">Configura y sigue el progreso de tus metas</p>
        </div>
        <Button icon={Plus} onClick={openNewModal}>
          Nueva Meta
        </Button>
      </div>

      {/* Lista de Metas */}
      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="h-16 w-16 text-dark-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No tienes metas</h3>
          <p className="text-dark-400 mb-6">
            Crea tu primera meta financiera para comenzar a hacer seguimiento
          </p>
          <Button icon={Plus} onClick={openNewModal}>
            Crear Meta
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            const remaining = Math.max(0, goal.target - goal.current);

            return (
              <Card key={goal.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color}20` }}
                    >
                      <Target className="h-5 w-5" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{goal.name}</h3>
                      <p className="text-sm text-dark-400">
                        {Math.round(progress)}% completado
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(goal)}
                      className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ open: true, goal })}
                      className="p-2 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-3 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="flex justify-between text-sm mb-4">
                  <span className="text-dark-400">
                    Actual: <span className="text-white">{formatCurrency(goal.current)}</span>
                  </span>
                  <span className="text-dark-400">
                    Meta: <span className="text-white">{formatCurrency(goal.target)}</span>
                  </span>
                </div>

                {/* Quick Update */}
                <QuickUpdateInput
                  goalId={goal.id}
                  currentValue={goal.current}
                  onUpdate={handleUpdateProgress}
                />

                {remaining > 0 && (
                  <p className="text-xs text-dark-500 mt-3">
                    Faltan {formatCurrency(remaining)} para alcanzar tu meta
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Crear/Editar Meta */}
      <GoalModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        goal={editingGoal}
      />

      {/* Modal de Confirmación de Eliminación */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, goal: null })}
        onConfirm={handleDeleteGoal}
        title="Eliminar Meta"
        message={`¿Estás seguro de eliminar la meta "${deleteModal.goal?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

// Componente para actualizar progreso rápidamente
function QuickUpdateInput({ goalId, currentValue, onUpdate }) {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value !== 0) {
      onUpdate(goalId, currentValue + value);
      setInputValue('');
    }
  };

  const handleSetValue = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && value >= 0) {
      onUpdate(goalId, value);
      setInputValue('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Monto a agregar/restar"
          className="flex-1"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAdd();
            }
          }}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAdd}
          title="Agregar al progreso"
        >
          +
        </Button>
      </div>
      <button
        onClick={handleSetValue}
        className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
      >
        Establecer como valor actual
      </button>
    </div>
  );
}

// Componente Modal para crear/editar metas
function GoalModal({ open, onClose, onSave, goal }) {
  const [formData, setFormData] = useState({
    name: '',
    target: '',
    current: '',
    color: COLORS[0].value,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        target: goal.target.toString(),
        current: goal.current.toString(),
        color: goal.color,
      });
    } else {
      setFormData({
        name: '',
        target: '',
        current: '0',
        color: COLORS[0].value,
      });
    }
    setErrors({});
  }, [goal, open]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    if (!formData.target || parseFloat(formData.target) <= 0) {
      newErrors.target = 'La meta debe ser mayor a 0';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      name: formData.name.trim(),
      target: parseFloat(formData.target),
      color: formData.color,
      current: goal ? parseFloat(formData.current) || 0 : 0,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={goal ? 'Editar Meta' : 'Nueva Meta'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre de la meta"
          placeholder="Ej: Fondo de emergencia"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
        />

        <Input
          label="Monto objetivo"
          type="number"
          placeholder="20000"
          value={formData.target}
          onChange={(e) => setFormData({ ...formData, target: e.target.value })}
          error={errors.target}
        />

        {goal && (
          <Input
            label="Progreso actual"
            type="number"
            placeholder="0"
            value={formData.current}
            onChange={(e) => setFormData({ ...formData, current: e.target.value })}
            error={errors.current}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">
            Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => setFormData({ ...formData, color: color.value })}
                className={`w-10 h-10 rounded-lg transition-all ${
                  formData.color === color.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" icon={Save}>
            {goal ? 'Guardar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
