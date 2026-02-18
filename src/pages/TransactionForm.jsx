import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  DollarSign,
  FileText,
  Plus,
  User,
  MapPin,
  Mail,
  Phone,
  Hash,
  Building,
  Receipt,
} from 'lucide-react';
import { Button, Select, Card, CreatableSelect, DatePicker } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';



// Status de facturación
const INVOICE_STATUS_OPTIONS = [
  { value: 'FACTURADO', label: 'Facturado' },
  { value: 'NO FACTURADO', label: 'No Facturado' },
];

// Métodos de pago comunes
const PAYMENT_METHODS = [
  { value: 'Bancolombia', label: 'Bancolombia' },
  { value: 'Davivienda', label: 'Davivienda' },
  { value: 'Nequi', label: 'Nequi' },
  { value: 'Daviplata', label: 'Daviplata' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Tarjeta de Crédito', label: 'Tarjeta de Crédito' },
  { value: 'Tarjeta de Débito', label: 'Tarjeta de Débito' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'PSE', label: 'PSE' },
  { value: 'Otro', label: 'Otro' },
];

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    type: searchParams.get('type') || 'income',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    // Campos de ingreso
    invoice_number: '',
    client_document: '',
    client_name: '',
    client_address: '',
    client_email: '',
    client_phone: '',
    invoice_status: '',
    // Campos de gasto
    provider_document: '',
    provider_name: '',
    payment_method: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);

  // Cargar categorías personalizadas (ingreso y gasto)
  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      if (response.data.grouped?.expense) {
        setExpenseCategories(
          response.data.grouped.expense.map((c) => ({
            value: c.name,
            label: c.name,
          }))
        );
      }
      if (response.data.grouped?.income) {
        setIncomeCategories(
          response.data.grouped.income.map((c) => ({
            value: c.name,
            label: c.name,
          }))
        );
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [token]);

  // Crear categoría inline y recargar lista
  const handleCreateCategory = async (name, type) => {
    try {
      await api.createCategory({ name, type, color: '#D4AF37' });
      await loadCategories();
      return name;
    } catch (err) {
      console.error('Error creating category:', err);
      return null;
    }
  };

  useEffect(() => {
    if (isEditing) {
      const loadTransaction = async () => {
        try {
          const response = await api.getTransaction(id);
          const t = response.data.transaction;
          setFormData({
            type: t.type,
            amount: String(t.amount),
            category: t.category || '',
            description: t.description || '',
            date: t.date,
            invoice_number: t.invoice_number || '',
            client_document: t.client_document || '',
            client_name: t.client_name || '',
            client_address: t.client_address || '',
            client_email: t.client_email || '',
            client_phone: t.client_phone || '',
            invoice_status: t.invoice_status || '',
            provider_document: t.provider_document || '',
            provider_name: t.provider_name || '',
            payment_method: t.payment_method || '',
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
    if (!formData.date) {
      newErrors.date = 'La fecha es requerida';
    }
    if (formData.type === 'income' && !formData.category) {
      newErrors.category = 'Selecciona el tipo de ingreso';
    }
    if (formData.type === 'expense' && !formData.category) {
      newErrors.category = 'Selecciona una categoría';
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
      category: '',
      invoice_number: '', client_document: '', client_name: '',
      client_address: '', client_email: '', client_phone: '',
      invoice_status: '', provider_document: '', provider_name: '',
      payment_method: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const transactionData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || null,
        date: formData.date,
      };

      if (formData.type === 'income') {
        transactionData.invoice_number = formData.invoice_number || null;
        transactionData.client_document = formData.client_document || null;
        transactionData.client_name = formData.client_name || null;
        transactionData.client_address = formData.client_address || null;
        transactionData.client_email = formData.client_email || null;
        transactionData.client_phone = formData.client_phone || null;
        transactionData.invoice_status = formData.invoice_status || null;
      } else {
        transactionData.provider_document = formData.provider_document || null;
        transactionData.provider_name = formData.provider_name || null;
        transactionData.payment_method = formData.payment_method || null;
      }

      if (isEditing) {
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

  // Clase base para inputs
  const inputClass = `w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-700 rounded-lg
    text-white placeholder-dark-500 focus:outline-none focus:border-gold-400
    focus:ring-2 focus:ring-gold-400/20 transition-all duration-300`;

  const inputErrorClass = `w-full pl-12 pr-4 py-3 bg-dark-900 border rounded-lg
    text-white placeholder-dark-600 focus:outline-none focus:ring-2 transition-all duration-300
    border-red-500 focus:border-red-500 focus:ring-red-500/20`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
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
            {isEditing ? 'Editar Registro' : 'Nuevo Registro'}
          </h1>
          <p className="text-dark-400 mt-1">
            {isEditing
              ? 'Modifica los detalles del registro'
              : 'Registra un nuevo ingreso o gasto'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Type */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-200">
              Tipo de registro
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
                <div className={`p-2 rounded-lg ${formData.type === 'income' ? 'bg-emerald-500/20' : 'bg-dark-800'}`}>
                  <ArrowUpRight className={`h-5 w-5 ${formData.type === 'income' ? 'text-emerald-400' : 'text-dark-400'}`} />
                </div>
                <span className={`font-medium ${formData.type === 'income' ? 'text-emerald-400' : 'text-dark-400'}`}>
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
                <div className={`p-2 rounded-lg ${formData.type === 'expense' ? 'bg-red-500/20' : 'bg-dark-800'}`}>
                  <ArrowDownRight className={`h-5 w-5 ${formData.type === 'expense' ? 'text-red-400' : 'text-dark-400'}`} />
                </div>
                <span className={`font-medium ${formData.type === 'expense' ? 'text-red-400' : 'text-dark-400'}`}>
                  Gasto
                </span>
              </button>
            </div>
          </div>

          {/* Common: Date + Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">Fecha *</label>
              <DatePicker
                name="date"
                value={formData.date}
                onChange={handleChange}
                placeholder="Seleccionar fecha"
                error={errors.date}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">
                {formData.type === 'income' ? 'Ingreso COP *' : 'Gasto Total COP *'}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                <input
                  type="number"
                  name="amount"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`${errors.amount ? inputErrorClass : inputClass} text-xl font-bold`}
                />
              </div>
              {errors.amount && <p className="text-sm text-red-400">{errors.amount}</p>}
            </div>
          </div>

          {/* ======= INCOME FIELDS ======= */}
          {formData.type === 'income' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Factura Nº</label>
                  <div className="relative">
                    <Receipt className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      name="invoice_number"
                      placeholder="Número de factura"
                      value={formData.invoice_number}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Tipo de Ingreso *</label>
                  <CreatableSelect
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    options={incomeCategories}
                    placeholder="Selecciona tipo"
                    error={errors.category}
                    onCreateNew={(name) => handleCreateCategory(name, 'income')}
                    createLabel="Añadir tipo de ingreso"
                    emptyMessage="No hay tipos de ingreso creados"
                    emptyActionLabel="Ir a Categorías"
                    emptyAction={() => navigate('/categories')}
                  />
                </div>
              </div>

              {/* Client Info */}
              <div className="border-t border-dark-800 pt-6">
                <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos del Cliente
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Documento</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input type="text" name="client_document" placeholder="NIT o CC" value={formData.client_document} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input type="text" name="client_name" placeholder="Nombre del cliente" value={formData.client_name} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="block text-sm font-medium text-dark-200">Dirección</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input type="text" name="client_address" placeholder="Dirección del cliente" value={formData.client_address} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Correo</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input type="email" name="client_email" placeholder="correo@ejemplo.com" value={formData.client_email} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Teléfono</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input type="tel" name="client_phone" placeholder="+57 300 123 4567" value={formData.client_phone} onChange={handleChange} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-200">Estado de Facturación</label>
                <Select
                  name="invoice_status"
                  value={formData.invoice_status}
                  onChange={handleChange}
                  options={INVOICE_STATUS_OPTIONS}
                  placeholder="Selecciona estado"
                />
              </div>
            </>
          )}

          {/* ======= EXPENSE FIELDS ======= */}
          {formData.type === 'expense' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Documento Proveedor</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input type="text" name="provider_document" placeholder="NIT o documento" value={formData.provider_document} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Proveedor</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input type="text" name="provider_name" placeholder="Nombre del proveedor" value={formData.provider_name} onChange={handleChange} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-dark-200">Categoría *</label>
                    <Link to="/categories" className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1">
                      <Plus className="h-3 w-3" />Gestionar
                    </Link>
                  </div>
                  <CreatableSelect
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    options={expenseCategories}
                    placeholder="Selecciona categoría"
                    error={errors.category}
                    onCreateNew={(name) => handleCreateCategory(name, 'expense')}
                    createLabel="Añadir categoría"
                    emptyMessage="No hay categorías de gasto creadas"
                    emptyActionLabel="Ir a Categorías"
                    emptyAction={() => navigate('/categories')}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Método de Pago</label>
                  <Select
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    options={PAYMENT_METHODS}
                    placeholder="Selecciona método"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-200">Notas</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 h-5 w-5 text-dark-400" />
                  <textarea
                    name="description"
                    placeholder="Notas adicionales..."
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
            </>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <Link to="/transactions" className="flex-1">
              <Button variant="secondary" className="w-full">Cancelar</Button>
            </Link>
            <Button type="submit" className="flex-1" loading={loading} icon={Save}>
              {isEditing ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
