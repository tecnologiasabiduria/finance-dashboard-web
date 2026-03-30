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
  ChevronDown,
  ChevronRight,
  User,
  Hash,
  Building,
  Mail,
  Phone,
  MapPin,
  Search,
} from 'lucide-react';
import { Button, Card, Input, Select, Modal, ConfirmModal, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { invalidateCategoriesCache } from '../services/cache';
import { getCategoryIcon, ICON_GROUPS } from '../utils/categoryIcons';

const PRESET_COLORS = [
  '#da7d41', '#22C55E', '#EF4444', '#3B82F6', '#8B5CF6',
  '#F97316', '#EC4899', '#10B981', '#F59E0B', '#6B7280',
  '#14B8A6', '#6366F1', '#E11D48', '#0EA5E9', '#84CC16',
];

export default function Categories() {
  const { token } = useAuth();

  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense');
  const [error, setError] = useState('');

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCat, setSavingCat] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', type: 'expense', color: '#da7d41', icon: 'tag' });
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

  // Subcategory modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [savingSub, setSavingSub] = useState(false);
  const [subForm, setSubForm] = useState({
    name: '',
    provider_name: '', provider_document: '',
    client_name: '', client_document: '', client_email: '', client_phone: '', client_address: '',
  });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded categories
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      invalidateCategoriesCache();
      const response = await api.getCategories();
      setCategories(response.data.grouped || { income: [], expense: [] });
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  // ─── Category CRUD ───

  const handleOpenCatModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCatForm({ name: category.name, type: category.type, color: category.color || '#da7d41', icon: category.icon || 'tag' });
    } else {
      setEditingCategory(null);
      setCatForm({ name: '', type: activeTab, color: '#da7d41', icon: 'tag' });
    }
    setShowIconPicker(false);
    setIconSearch('');
    setError('');
    setShowCatModal(true);
  };

  const handleCloseCatModal = () => {
    setShowCatModal(false);
    setEditingCategory(null);
    setCatForm({ name: '', type: 'expense', color: '#da7d41', icon: 'tag' });
    setShowIconPicker(false);
    setIconSearch('');
    setError('');
  };

  const handleSubmitCat = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) { setError('El nombre es requerido'); return; }
    setSavingCat(true);
    setError('');
    try {
      const payload = { name: catForm.name, type: catForm.type, color: catForm.color, icon: catForm.icon };
      if (editingCategory) {
        await api.updateCategory(editingCategory.id, payload);
      } else {
        await api.createCategory(payload);
      }
      await loadCategories();
      handleCloseCatModal();
    } catch (err) {
      setError(err.message || 'Error al guardar categoría');
    } finally {
      setSavingCat(false);
    }
  };

  // ─── Subcategory CRUD ───

  const handleOpenSubModal = (category, subcategory = null) => {
    setParentCategory(category);
    if (subcategory) {
      setEditingSubcategory(subcategory);
      setSubForm({
        name: subcategory.name || '',
        provider_name: subcategory.provider_name || '',
        provider_document: subcategory.provider_document || '',
        client_name: subcategory.client_name || '',
        client_document: subcategory.client_document || '',
        client_email: subcategory.client_email || '',
        client_phone: subcategory.client_phone || '',
        client_address: subcategory.client_address || '',
      });
    } else {
      setEditingSubcategory(null);
      setSubForm({
        name: '',
        provider_name: '', provider_document: '',
        client_name: '', client_document: '', client_email: '', client_phone: '', client_address: '',
      });
    }
    setError('');
    setShowSubModal(true);
  };

  const handleCloseSubModal = () => {
    setShowSubModal(false);
    setEditingSubcategory(null);
    setParentCategory(null);
    setError('');
  };

  const handleSubmitSub = async (e) => {
    e.preventDefault();
    if (!subForm.name.trim()) { setError('El nombre es requerido'); return; }
    setSavingSub(true);
    setError('');
    try {
      const payload = { ...subForm, category_id: parentCategory.id };
      if (editingSubcategory) {
        await api.updateSubcategory(editingSubcategory.id, payload);
      } else {
        await api.createSubcategory(payload);
      }
      await loadCategories();
      handleCloseSubModal();
    } catch (err) {
      setError(err.message || 'Error al guardar subcategoría');
    } finally {
      setSavingSub(false);
    }
  };

  // ─── Delete (category or subcategory) ───

  const handleDeleteClick = (target, type) => {
    setDeleteTarget(target);
    setDeleteType(type);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteType === 'category') {
        await api.deleteCategory(deleteTarget.id);
      } else {
        await api.deleteSubcategory(deleteTarget.id);
      }
      await loadCategories();
      setDeleteTarget(null);
      setDeleteType(null);
    } catch (err) {
      setDeleteTarget(null);
      setDeleteType(null);
      setError(err.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  const inputClass = `w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-lg
    text-white placeholder-dark-500 focus:outline-none focus:border-gold-400
    focus:ring-2 focus:ring-gold-400/20 transition-all duration-300`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Categorías</h1>
          <p className="text-dark-400 mt-1">
            Personaliza las categorías y subcategorías para tus ingresos y gastos
          </p>
        </div>
        <Button icon={Plus} onClick={() => handleOpenCatModal()}>
          Nueva Categoría
        </Button>
      </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(categories[activeTab] || []).map((category) => {
          const isExpanded = expandedId === category.id;
          const subs = category.subcategories || [];

          return (
            <Card key={category.id} className="hover:border-gold-400/30 transition-all group/card">
              {/* Category header */}
              <div className="p-4 flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  {(() => { const Icon = getCategoryIcon(category.icon); return <Icon className="h-5 w-5" style={{ color: category.color }} />; })()}
                </div>

                {/* Name + meta — clickable to expand */}
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <h3 className="font-medium text-white truncate">{category.name}</h3>
                  <p className="text-xs text-dark-500">
                    {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                    {subs.length > 0 && ` · ${subs.length} subcategoría${subs.length > 1 ? 's' : ''}`}
                  </p>
                </button>

                {/* Actions — siempre visibles en hover de la card */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenCatModal(category)}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-gold-400 hover:bg-dark-800 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(category, 'category')}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-dark-800 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Chevron */}
                {subs.length > 0 && (
                  <button onClick={() => toggleExpand(category.id)} className="flex-shrink-0">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-dark-400" />
                      : <ChevronRight className="h-4 w-4 text-dark-400" />
                    }
                  </button>
                )}
              </div>

              {/* Expanded subcategories */}
              {isExpanded && (
                <div className="border-t border-dark-800 px-4 pb-4 pt-3 space-y-2">
                  {subs.length === 0 ? (
                    <p className="text-xs text-dark-500 py-1">Sin subcategorías</p>
                  ) : (
                    subs.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between py-2 px-3 bg-dark-800/50 rounded-lg group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white font-medium truncate">{sub.name}</p>
                          <p className="text-xs text-dark-500 truncate">
                            {category.type === 'expense'
                              ? sub.provider_name || 'Sin datos'
                              : [sub.client_name, sub.client_document].filter(Boolean).join(' · ') || 'Sin datos'
                            }
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                          <button
                            onClick={() => handleOpenSubModal(category, sub)}
                            className="p-1 rounded text-dark-400 hover:text-gold-400 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(sub, 'subcategory')}
                            className="p-1 rounded text-dark-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <button
                    onClick={() => handleOpenSubModal(category)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-dark-400 hover:text-gold-400 border border-dashed border-dark-700 hover:border-gold-400/50 rounded-lg transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar subcategoría
                  </button>
                </div>
              )}

              {/* Add sub button when no subs */}
              {!isExpanded && subs.length === 0 && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => { setExpandedId(category.id); handleOpenSubModal(category); }}
                    className="text-xs text-dark-500 hover:text-gold-400 transition-colors flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Agregar subcategoría
                  </button>
                </div>
              )}
            </Card>
          );
        })}

        {/* Add new card */}
        <button
          onClick={() => handleOpenCatModal()}
          className="p-4 border-2 border-dashed border-dark-700 rounded-xl hover:border-gold-400/50 hover:bg-dark-900/50 transition-all flex items-center justify-center gap-2 text-dark-400 hover:text-gold-400 min-h-[88px]"
        >
          <Plus className="h-5 w-5" />
          <span>Agregar categoría</span>
        </button>
      </div>

      {/* ─── Category Modal ─── */}
      <Modal
        isOpen={showCatModal}
        onClose={handleCloseCatModal}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSubmitCat} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Input
            label="Nombre"
            placeholder="Ej: Nómina"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            icon={Tag}
          />

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Tipo</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setCatForm({ ...catForm, type: 'expense' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  catForm.type === 'expense'
                    ? 'border-red-500 bg-red-500/10 text-red-400'
                    : 'border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <ArrowDownRight className="h-4 w-4" />
                Gasto
              </button>
              <button
                type="button"
                onClick={() => setCatForm({ ...catForm, type: 'income' })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${
                  catForm.type === 'income'
                    ? 'border-green-500 bg-green-500/10 text-green-400'
                    : 'border-dark-700 text-dark-400 hover:border-dark-600'
                }`}
              >
                <ArrowUpRight className="h-4 w-4" />
                Ingreso
              </button>
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Icono</label>
            <button
              type="button"
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="flex items-center gap-3 w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg hover:border-dark-600 transition-all"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${catForm.color}20` }}
              >
                {(() => { const Icon = getCategoryIcon(catForm.icon); return <Icon className="h-4 w-4" style={{ color: catForm.color }} />; })()}
              </div>
              <span className="text-dark-300 text-sm flex-1 text-left">{catForm.icon}</span>
              <ChevronDown className={`h-4 w-4 text-dark-400 transition-transform ${showIconPicker ? 'rotate-180' : ''}`} />
            </button>

            {showIconPicker && (
              <div className="mt-2 p-3 bg-dark-900 border border-dark-700 rounded-lg max-h-64 overflow-y-auto space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-500" />
                  <input
                    type="text"
                    placeholder="Buscar icono..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-white text-sm placeholder-dark-500 focus:outline-none focus:border-gold-400/50"
                  />
                </div>
                {ICON_GROUPS.map((group) => {
                  const filteredIcons = iconSearch
                    ? group.icons.filter(name => name.includes(iconSearch.toLowerCase()))
                    : group.icons;
                  if (filteredIcons.length === 0) return null;
                  return (
                    <div key={group.label}>
                      <p className="text-xs text-dark-500 font-medium mb-1.5">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {filteredIcons.map((iconName) => {
                          const Icon = getCategoryIcon(iconName);
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => { setCatForm({ ...catForm, icon: iconName }); setShowIconPicker(false); setIconSearch(''); }}
                              title={iconName}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                                catForm.icon === iconName
                                  ? 'ring-2 ring-gold-400 bg-gold-400/10'
                                  : 'bg-dark-800 hover:bg-dark-700'
                              }`}
                            >
                              <Icon className="h-4 w-4" style={{ color: catForm.icon === iconName ? catForm.color : '#9CA3AF' }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                  onClick={() => setCatForm({ ...catForm, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    catForm.color === color
                      ? 'ring-2 ring-offset-2 ring-offset-dark-900 ring-white scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {catForm.color === color && (
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
                style={{ backgroundColor: `${catForm.color}20` }}
              >
                {(() => { const Icon = getCategoryIcon(catForm.icon); return <Icon className="h-5 w-5" style={{ color: catForm.color }} />; })()}
              </div>
              <div>
                <p className="font-medium text-white">{catForm.name || 'Nombre de categoría'}</p>
                <p className="text-xs text-dark-500">{catForm.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={handleCloseCatModal}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={savingCat} icon={Check}>
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Subcategory Modal ─── */}
      <Modal
        isOpen={showSubModal}
        onClose={handleCloseSubModal}
        title={editingSubcategory ? 'Editar Subcategoría' : `Nueva Subcategoría en "${parentCategory?.name || ''}"`}
      >
        <form onSubmit={handleSubmitSub} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Input
            label="Nombre de la subcategoría *"
            placeholder="Nombre de la subcategoría"
            value={subForm.name}
            onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
            icon={Tag}
          />

          {/* Expense prefill fields */}
          {parentCategory?.type === 'expense' && (
            <div className="border-t border-dark-800 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider flex items-center gap-2">
                <Building className="h-4 w-4" />
                Datos del Proveedor (auto-relleno)
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-xs text-dark-400 mb-1">Nombre del proveedor</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      placeholder="Nombre del proveedor"
                      value={subForm.provider_name}
                      onChange={(e) => setSubForm({ ...subForm, provider_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs text-dark-400 mb-1">Documento del proveedor</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      placeholder="NIT o CC"
                      value={subForm.provider_document}
                      onChange={(e) => setSubForm({ ...subForm, provider_document: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Income prefill fields */}
          {parentCategory?.type === 'income' && (
            <div className="border-t border-dark-800 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4" />
                Datos del Cliente (auto-relleno)
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-xs text-dark-400 mb-1">Nombre del cliente</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={subForm.client_name}
                      onChange={(e) => setSubForm({ ...subForm, client_name: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs text-dark-400 mb-1">Documento</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      placeholder="NIT o CC"
                      value={subForm.client_document}
                      onChange={(e) => setSubForm({ ...subForm, client_document: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs text-dark-400 mb-1">Correo</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={subForm.client_email}
                        onChange={(e) => setSubForm({ ...subForm, client_email: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-dark-400 mb-1">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input
                        type="tel"
                        placeholder="+57 300..."
                        value={subForm.client_phone}
                        onChange={(e) => setSubForm({ ...subForm, client_phone: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs text-dark-400 mb-1">Dirección</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      placeholder="Dirección del cliente"
                      value={subForm.client_address}
                      onChange={(e) => setSubForm({ ...subForm, client_address: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={handleCloseSubModal}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={savingSub} icon={Check}>
              {editingSubcategory ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteType(null); }}
        onConfirm={confirmDelete}
        title={deleteType === 'category' ? 'Eliminar categoría' : 'Eliminar subcategoría'}
        message={`¿Estás seguro de eliminar "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
