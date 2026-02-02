import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Plus,
} from 'lucide-react';
import { Button, Input, Select, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

// Categorías por defecto (fallback)
const DEFAULT_CATEGORIES = {
  income: [
    { value: 'salario', label: 'Salario' },
    { value: 'freelance', label: 'Freelance' },
    { value: 'inversiones', label: 'Inversiones' },
    { value: 'otros ingresos', label: 'Otros Ingresos' },
  ],
  expense: [
    { value: 'alimentación', label: 'Alimentación' },
    { value: 'transporte', label: 'Transporte' },
    { value: 'servicios', label: 'Servicios' },
    { value: 'entretenimiento', label: 'Entretenimiento' },
    { value: 'salud', label: 'Salud' },
    { value: 'educación', label: 'Educación' },
    { value: 'otros gastos', label: 'Otros Gastos' },
  ],
};

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    type: searchParams.get('type') || 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Cargar categorías personalizadas
  useEffect(() => {
    const loadCategories = async () => {
      // Modo demo: cargar de localStorage
      if (token?.startsWith('demo-')) {
        const saved = localStorage.getItem('demo_categories');
        if (saved) {
          const parsed = JSON.parse(saved);
          setCategories({
            income: parsed.income?.map(c => ({ value: c.name.toLowerCase(), label: c.name })) || DEFAULT_CATEGORIES.income,
            expense: parsed.expense?.map(c => ({ value: c.name.toLowerCase(), label: c.name })) || DEFAULT_CATEGORIES.expense,
          });
        }
        return;
      }

      try {
        const response = await api.getCategories();
        if (response.data.grouped) {
          setCategories({
            income: response.data.grouped.income?.map(c => ({ value: c.name.toLowerCase(), label: c.name })) || DEFAULT_CATEGORIES.income,
            expense: response.data.grouped.expense?.map(c => ({ value: c.name.toLowerCase(), label: c.name })) || DEFAULT_CATEGORIES.expense,
          });
        }
      } catch (err) {
        console.error('Error loading categories:', err);
        // Usar categorías por defecto en caso de error
      }
    };
    loadCategories();
  }, [token]);

  useEffect(() => {
    if (isEditing) {
      const loadTransaction = async () => {
        // Si es demo, simular
        if (token?.startsWith('demo-')) {
          setTimeout(() => {
            setFormData({
              type: 'expense',
              amount: '185.00',
              category: 'servicios',
              description: 'Factura electricidad',
              date: '2026-01-27',
            });
            setLoadingData(false);
          }, 500);
          return;
        }

        try {
          const response = await api.getTransaction(id);
          const t = response.data.transaction;
          setFormData({
            type: t.type,
            amount: String(t.amount),
            category: t.category.toLowerCase(),
            description: t.description || '',
            date: t.date,
          });
        } catch (err) {
          console.error('Error loading transaction:', err);
        } finally {
          setLoadingData(false);
        }
      };
      loadTransaction();
    }
  }, [isEditing, id, token]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.category) {
      newErrors.category = 'Selecciona una categoría';
    }

    if (!formData.date) {
      newErrors.date = 'La fecha es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      category: '', // Reset category when type changes
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Preparar datos con category capitalizada
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        description: formData.description,
        date: formData.date,
      };

      // Si es demo, guardar en localStorage
      if (token?.startsWith('demo-')) {
        await new Promise((r) => setTimeout(r, 500));
        
        // Cargar transacciones existentes
        const savedTransactions = JSON.parse(localStorage.getItem('demo_transactions') || '[]');
        
        if (isEditing) {
          // Actualizar transacción existente
          const index = savedTransactions.findIndex(t => t.id === id);
          if (index !== -1) {
            savedTransactions[index] = { ...savedTransactions[index], ...transactionData };
          }
        } else {
          // Crear nueva transacción
          const newTransaction = {
            id: `demo-${Date.now()}`,
            ...transactionData,
          };
          savedTransactions.unshift(newTransaction);
        }
        
        localStorage.setItem('demo_transactions', JSON.stringify(savedTransactions));
      } else if (isEditing) {
        await api.updateTransaction(id, transactionData);
      } else {
        await api.createTransaction(transactionData);
      }

      navigate('/transactions');
    } catch (err) {
      console.error('Error saving transaction:', err);
      setErrors({ submit: err.message || 'Error al guardar' });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-dark-800" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-gold-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/transactions"
          className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEditing ? 'Editar Transacción' : 'Nueva Transacción'}
          </h1>
          <p className="text-dark-400 mt-1">
            {isEditing
              ? 'Modifica los detalles de la transacción'
              : 'Registra un nuevo movimiento financiero'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-200">
              Tipo de transacción
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    formData.type === 'income'
                      ? 'bg-emerald-500/20'
                      : 'bg-dark-800'
                  }`}
                >
                  <ArrowUpRight
                    className={`h-5 w-5 ${
                      formData.type === 'income'
                        ? 'text-emerald-400'
                        : 'text-dark-400'
                    }`}
                  />
                </div>
                <span
                  className={`font-medium ${
                    formData.type === 'income' ? 'text-emerald-400' : 'text-dark-400'
                  }`}
                >
                  Ingreso
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'expense'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    formData.type === 'expense' ? 'bg-red-500/20' : 'bg-dark-800'
                  }`}
                >
                  <ArrowDownRight
                    className={`h-5 w-5 ${
                      formData.type === 'expense' ? 'text-red-400' : 'text-dark-400'
                    }`}
                  />
                </div>
                <span
                  className={`font-medium ${
                    formData.type === 'expense' ? 'text-red-400' : 'text-dark-400'
                  }`}
                >
                  Gasto
                </span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">
              Monto
            </label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="number"
                name="amount"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 bg-dark-900 border rounded-lg
                          text-white text-2xl font-bold placeholder-dark-600
                          focus:outline-none focus:ring-2 transition-all duration-300 ${
                            errors.amount
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-dark-700 focus:border-gold-400 focus:ring-gold-400/20'
                          }`}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-400">{errors.amount}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-dark-200">
                Categoría
              </label>
              <Link
                to="/categories"
                className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Gestionar
              </Link>
            </div>
            <Select
              name="category"
              value={formData.category}
              onChange={handleChange}
              options={categories[formData.type]}
              placeholder="Selecciona una categoría"
              error={errors.category}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">
              Descripción (opcional)
            </label>
            <div className="relative">
              <FileText className="absolute left-4 top-4 h-5 w-5 text-dark-400" />
              <textarea
                name="description"
                placeholder="Añade una descripción..."
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-lg
                         text-white placeholder-dark-500
                         focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20
                         transition-all duration-300 resize-none"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-200">
              Fecha
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className={`w-full pl-12 pr-4 py-3 bg-dark-900 border rounded-lg
                          text-white
                          focus:outline-none focus:ring-2 transition-all duration-300 ${
                            errors.date
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-dark-700 focus:border-gold-400 focus:ring-gold-400/20'
                          }`}
              />
            </div>
            {errors.date && (
              <p className="text-sm text-red-400">{errors.date}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Link to="/transactions" className="flex-1">
              <Button variant="secondary" className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1"
              loading={loading}
              icon={Save}
            >
              {isEditing ? 'Guardar cambios' : 'Crear transacción'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
