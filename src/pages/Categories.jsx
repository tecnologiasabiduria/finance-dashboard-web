import { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Palette,
  Check,
  X,
} from 'lucide-react';
import { Button, Card, Input, Modal, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// Colores predefinidos para elegir
const PRESET_COLORS = [
  '#D4AF37', '#22C55E', '#EF4444', '#3B82F6', '#8B5CF6',
  '#F97316', '#EC4899', '#10B981', '#F59E0B', '#6B7280',
  '#14B8A6', '#6366F1', '#E11D48', '#0EA5E9', '#84CC16',
];

// Categorías demo para modo sin backend
const DEMO_CATEGORIES = {
  income: [
    { id: 'demo-1', name: 'Salario', type: 'income', color: '#22C55E', icon: 'briefcase' },
    { id: 'demo-2', name: 'Freelance', type: 'income', color: '#10B981', icon: 'laptop' },
    { id: 'demo-3', name: 'Inversiones', type: 'income', color: '#059669', icon: 'trending-up' },
    { id: 'demo-4', name: 'Otros Ingresos', type: 'income', color: '#047857', icon: 'plus-circle' },
  ],
  expense: [
    { id: 'demo-5', name: 'Alimentación', type: 'expense', color: '#EF4444', icon: 'utensils' },
    { id: 'demo-6', name: 'Transporte', type: 'expense', color: '#F97316', icon: 'car' },
    { id: 'demo-7', name: 'Servicios', type: 'expense', color: '#F59E0B', icon: 'home' },
    { id: 'demo-8', name: 'Entretenimiento', type: 'expense', color: '#8B5CF6', icon: 'film' },
    { id: 'demo-9', name: 'Salud', type: 'expense', color: '#EC4899', icon: 'heart' },
    { id: 'demo-10', name: 'Educación', type: 'expense', color: '#3B82F6', icon: 'book' },
    { id: 'demo-11', name: 'Otros Gastos', type: 'expense', color: '#6B7280', icon: 'more-horizontal' },
  ],
};

export default function Categories() {
  const { token } = useAuth();
  const isDemo = token?.startsWith('demo-');

  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeTab, setActiveTab] = useState('expense');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#D4AF37',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    if (isDemo) {
      // Cargar desde localStorage o usar demo
      const saved = localStorage.getItem('demo_categories');
      if (saved) {
        setCategories(JSON.parse(saved));
      } else {
        setCategories(DEMO_CATEGORIES);
        localStorage.setItem('demo_categories', JSON.stringify(DEMO_CATEGORIES));
      }
      setLoading(false);
      return;
    }

    try {
      const response = await api.getCategories();
      setCategories(response.data.grouped || { income: [], expense: [] });
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color || '#D4AF37',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        type: activeTab,
        color: '#D4AF37',
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', type: 'expense', color: '#D4AF37' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre es requerido');
      return;
    }

    setSaving(true);
    setError('');

    if (isDemo) {
      // Modo demo: guardar en localStorage
      const newCategories = { ...categories };
      if (editingCategory) {
        const index = newCategories[formData.type].findIndex(c => c.id === editingCategory.id);
        if (index !== -1) {
          newCategories[formData.type][index] = {
            ...editingCategory,
            ...formData,
          };
        }
      } else {
        newCategories[formData.type].push({
          id: `demo-${Date.now()}`,
          ...formData,
          icon: 'tag',
        });
      }
      setCategories(newCategories);
      localStorage.setItem('demo_categories', JSON.stringify(newCategories));
      setSaving(false);
      handleCloseModal();
      return;
    }

    try {
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, formData);
      } else {
        await api.createCategory(formData);
      }
      await loadCategories();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Error al guardar categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category) => {
    if (!confirm(`¿Eliminar la categoría "${category.name}"?`)) return;

    if (isDemo) {
      const newCategories = { ...categories };
      newCategories[category.type] = newCategories[category.type].filter(c => c.id !== category.id);
      setCategories(newCategories);
      localStorage.setItem('demo_categories', JSON.stringify(newCategories));
      return;
    }

    try {
      await api.deleteCategory(category.id);
      await loadCategories();
    } catch (err) {
      alert(err.message || 'Error al eliminar categoría');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Categorías</h1>
          <p className="text-dark-400 mt-1">
            Personaliza las categorías para tus ingresos y gastos
          </p>
        </div>
        <Button icon={Plus} onClick={() => handleOpenModal()}>
          Nueva Categoría
        </Button>
      </div>

      {isDemo && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ Modo demo: Los cambios se guardan localmente
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-dark-900/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('expense')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'expense'
              ? 'bg-red-500/20 text-red-400'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <ArrowDownRight className="h-4 w-4" />
          Gastos ({categories.expense?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            activeTab === 'income'
              ? 'bg-green-500/20 text-green-400'
              : 'text-dark-400 hover:text-white hover:bg-dark-800'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          Ingresos ({categories.income?.length || 0})
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(categories[activeTab] || []).map((category) => (
          <Card key={category.id} className="p-4 hover:border-gold-400/30 transition-all group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <Tag className="h-5 w-5" style={{ color: category.color }} />
                </div>
                <div>
                  <h3 className="font-medium text-white">{category.name}</h3>
                  <p className="text-xs text-dark-500 capitalize">{category.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenModal(category)}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-dark-800 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-dark-800 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {/* Add new card */}
        <button
          onClick={() => handleOpenModal()}
          className="p-4 border-2 border-dashed border-dark-700 rounded-xl hover:border-gold-400/50 hover:bg-dark-900/50 transition-all flex items-center justify-center gap-2 text-dark-400 hover:text-gold-400 min-h-[88px]"
        >
          <Plus className="h-5 w-5" />
          <span>Agregar categoría</span>
        </button>
      </div>

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Input
            label="Nombre"
            placeholder="Ej: Comida rápida"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            icon={Tag}
          />

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Tipo</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'expense' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  formData.type === 'expense'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <ArrowDownRight className="h-4 w-4" />
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'income' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  formData.type === 'income'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                Ingreso
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              <Palette className="h-4 w-4 inline mr-1" />
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.color === color
                      ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-white scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && (
                    <Check className="h-4 w-4 text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-xs text-dark-500 mb-2">Vista previa</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${formData.color}20` }}
              >
                <Tag className="h-5 w-5" style={{ color: formData.color }} />
              </div>
              <div>
                <p className="font-medium text-white">{formData.name || 'Nombre de categoría'}</p>
                <p className="text-xs text-dark-500">{formData.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={handleCloseModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={saving}
              icon={Check}
            >
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
