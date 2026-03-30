import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
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
  Tag,
  Wallet,
} from 'lucide-react';
import { Button, Select, Card, CreatableSelect, DatePicker } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import {
  getCachedCategories,
  getCachedCartera,
  invalidateDashboardCache,
  invalidateCategoriesCache,
  invalidateCarteraCache,
} from '../services/cache';
import { getCategoryIcon } from '../utils/categoryIcons';
import { formatCurrency } from '../utils/formatters';

const CARTERA_ID_PARAM_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;



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

// Cuentas para transferencias entre cuentas propias
const ACCOUNT_OPTIONS = [
  { value: 'Bancolombia', label: 'Bancolombia' },
  { value: 'Davivienda', label: 'Davivienda' },
  { value: 'Nequi', label: 'Nequi' },
  { value: 'Daviplata', label: 'Daviplata' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Banco Popular', label: 'Banco Popular' },
  { value: 'Banco de Bogotá', label: 'Banco de Bogotá' },
  { value: 'BBVA', label: 'BBVA' },
  { value: 'Otro', label: 'Otro' },
];

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { currency } = useSettings();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    type: searchParams.get('type') || 'income',
    amount: '',
    category: '',
    description: '',
    date: searchParams.get('date') || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
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
    // Campos de transferencia
    source_account: '',
    destination_account: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [categoriesRaw, setCategoriesRaw] = useState({ income: [], expense: [] });
  const [selectedSubId, setSelectedSubId] = useState(null);

  const [carteraLink, setCarteraLink] = useState(null);
  const [applyToCartera, setApplyToCartera] = useState(false);
  const [carteraSelectId, setCarteraSelectId] = useState('');
  const [carteraRecords, setCarteraRecords] = useState([]);
  const [pastClients, setPastClients] = useState([]);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

  // Auto-completado: lookup de clientes por documento
  // Fuentes (en orden de prioridad): subcategorías → cartera → transacciones pasadas
  const clientLookup = useMemo(() => {
    const map = {};

    // 1. Transacciones pasadas (menor prioridad — se agregan primero)
    for (const c of pastClients) {
      if (c.client_document && !map[c.client_document]) {
        map[c.client_document] = c;
      }
    }

    // 2. Cartera
    for (const r of carteraRecords) {
      const doc = (r.documento || '').trim();
      if (doc && !map[doc]) {
        map[doc] = {
          client_name: r.nombre || '',
          client_document: doc,
          client_email: '',
          client_phone: '',
          client_address: '',
        };
      }
    }

    // 3. Subcategorías (mayor prioridad — sobreescriben)
    const allCats = [...(categoriesRaw.income || []), ...(categoriesRaw.expense || [])];
    for (const cat of allCats) {
      for (const sub of cat.subcategories || []) {
        const doc = (sub.client_document || sub.provider_document || '').trim();
        if (doc) {
          map[doc] = {
            client_name: sub.client_name || sub.provider_name || '',
            client_document: doc,
            client_email: sub.client_email || '',
            client_phone: sub.client_phone || '',
            client_address: sub.client_address || '',
          };
        }
      }
    }

    return map;
  }, [categoriesRaw, carteraRecords, pastClients]);

  const handleDocumentBlur = () => {
    // Small delay so click on suggestion fires before blur hides it
    setTimeout(() => setShowClientSuggestions(false), 150);
  };

  const getClientSuggestions = (field, value) => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    return Object.values(clientLookup).filter((c) => {
      if (field === 'client_document') return c.client_document.toLowerCase().includes(q);
      if (field === 'client_name') return c.client_name.toLowerCase().includes(q);
      return false;
    }).slice(0, 6);
  };

  const handleSelectClient = (client) => {
    setFormData((prev) => ({
      ...prev,
      client_document: client.client_document || prev.client_document,
      client_name: client.client_name || prev.client_name,
      client_email: client.client_email || prev.client_email,
      client_phone: client.client_phone || prev.client_phone,
      client_address: client.client_address || prev.client_address,
    }));
    setShowClientSuggestions(false);
    setClientSuggestions([]);
  };

  const selectedCarteraSaldo = useMemo(() => {
    if (!carteraSelectId || !carteraRecords.length) return null;
    const r = carteraRecords.find((x) => x.id === carteraSelectId);
    return r != null ? Number(r.saldo) : null;
  }, [carteraSelectId, carteraRecords]);

  const carteraSelectOptions = useMemo(() => {
    const withSaldo = carteraRecords.filter((r) => Number(r.saldo) > 0);
    const ids = new Set(withSaldo.map((r) => r.id));
    if (carteraSelectId && !ids.has(carteraSelectId)) {
      const extra = carteraRecords.find((r) => r.id === carteraSelectId);
      if (extra) withSaldo.unshift(extra);
    }
    return withSaldo.map((r) => ({
      value: r.id,
      label: `${r.nombre || 'Sin nombre'} — saldo ${formatCurrency(Number(r.saldo), currency)}`,
    }));
  }, [carteraRecords, carteraSelectId, currency]);

  const loadCategories = async () => {
    try {
      const response = await getCachedCategories();
      const grouped = response.data?.grouped || { income: [], expense: [] };
      setCategoriesRaw(grouped);
      if (grouped.expense) {
        setExpenseCategories(grouped.expense.map((c) => ({ value: c.name, label: c.name, icon: c.icon, color: c.color })));
      }
      if (grouped.income) {
        setIncomeCategories(grouped.income.map((c) => ({ value: c.name, label: c.name, icon: c.icon, color: c.color })));
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const getCurrentSubcategories = () => {
    if (!formData.category || formData.type === 'transfer') return [];
    const list = formData.type === 'income' ? categoriesRaw.income : categoriesRaw.expense;
    const cat = (list || []).find((c) => c.name === formData.category);
    return cat?.subcategories || [];
  };

  const handleSubcategorySelect = (sub) => {
    if (selectedSubId === sub.id) {
      setSelectedSubId(null);
      return;
    }
    setSelectedSubId(sub.id);
    if (formData.type === 'expense') {
      setFormData((prev) => ({
        ...prev,
        provider_name: sub.provider_name || prev.provider_name,
        provider_document: sub.provider_document || prev.provider_document,
      }));
    } else if (formData.type === 'income') {
      setFormData((prev) => ({
        ...prev,
        client_name: sub.client_name || prev.client_name,
        client_document: sub.client_document || prev.client_document,
        client_email: sub.client_email || prev.client_email,
        client_phone: sub.client_phone || prev.client_phone,
        client_address: sub.client_address || prev.client_address,
      }));
      // Auto-activar cartera si la subcategoría es de cobro de cartera
      if (!isEditing && (sub.name || '').toLowerCase().includes('cartera')) {
        setApplyToCartera(true);
      }
    }
  };

  useEffect(() => {
    loadCategories();
    api.getTransactions({ limit: 300 }).then((res) => {
      const clients = {};
      for (const tx of res.data?.transactions || []) {
        if (tx.type !== 'income') continue;
        const doc = (tx.client_document || '').trim();
        if (!doc || clients[doc]) continue;
        clients[doc] = {
          client_name: tx.client_name || '',
          client_document: doc,
          client_email: tx.client_email || '',
          client_phone: tx.client_phone || '',
          client_address: tx.client_address || '',
        };
      }
      setPastClients(Object.values(clients));
    }).catch(() => {});
  }, [token]);

  // Load duplicated transaction data from sessionStorage
  useEffect(() => {
    if (isEditing) return;
    const dup = sessionStorage.getItem('duplicateTransaction');
    if (dup) {
      try {
        const data = JSON.parse(dup);
        setFormData((prev) => ({ ...prev, ...data, date: prev.date }));
      } catch {}
      sessionStorage.removeItem('duplicateTransaction');
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || formData.type !== 'income') return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getCachedCartera();
        const list = res.data?.records || res.data || [];
        if (!cancelled) setCarteraRecords(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCarteraRecords([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.type, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    const raw = searchParams.get('carteraId');
    if (raw && CARTERA_ID_PARAM_RE.test(raw.trim())) {
      setApplyToCartera(true);
      setCarteraSelectId(raw.trim());
    } else {
      setApplyToCartera(false);
      setCarteraSelectId('');
    }
  }, [isEditing, searchParams]);

  // Crear categoría inline y recargar lista
  const handleCreateCategory = async (name, type) => {
    try {
      await api.createCategory({ name, type, color: '#da7d41' });
      invalidateCategoriesCache();
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
          const t = response.data?.transaction;
          if (!t) return;
          setCarteraLink(response.data?.cartera_link || null);
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
            source_account: t.source_account || '',
            destination_account: t.destination_account || '',
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
    if (formData.type === 'income' && !formData.client_name?.trim()) {
      newErrors.client_name = 'El nombre del cliente es obligatorio';
    }
    if (formData.type === 'income' && !formData.client_document?.trim()) {
      newErrors.client_document = 'El documento del cliente es obligatorio';
    }
    if (formData.type === 'expense' && !formData.category) {
      newErrors.category = 'Selecciona una categoría';
    }
    if (formData.type === 'transfer') {
      if (!formData.source_account) {
        newErrors.source_account = 'Selecciona la cuenta de origen';
      }
      if (!formData.destination_account) {
        newErrors.destination_account = 'Selecciona la cuenta de destino';
      }
      if (formData.source_account && formData.destination_account && formData.source_account === formData.destination_account) {
        newErrors.destination_account = 'La cuenta destino debe ser diferente a la de origen';
      }
    }
    if (!isEditing && formData.type === 'income' && applyToCartera) {
      if (!carteraSelectId) {
        newErrors.cartera_id = 'Selecciona un registro de cartera';
      } else if (selectedCarteraSaldo != null && Number(formData.amount) > selectedCarteraSaldo) {
        newErrors.amount = `El monto no puede superar el saldo pendiente (${formatCurrency(selectedCarteraSaldo, currency)})`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatAmountDisplay = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('es-CO');
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, amount: raw }));
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: '' }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'client_document' || name === 'client_name') {
      const suggestions = getClientSuggestions(name, value);
      setClientSuggestions(suggestions);
      setShowClientSuggestions(suggestions.length > 0);
    }
    if (name === 'category') {
      setSelectedSubId(null);
      // Auto-enable cartera when selecting a cartera-related category
      if (formData.type === 'income' && !isEditing) {
        const isCarteraCategory = value.toLowerCase().includes('cartera');
        if (isCarteraCategory && !applyToCartera) {
          setApplyToCartera(true);
        }
      }
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleTypeChange = (type) => {
    setSelectedSubId(null);
    if (type !== 'income') {
      setApplyToCartera(false);
      setCarteraSelectId('');
    }
    setFormData((prev) => ({
      ...prev,
      type,
      category: '',
      invoice_number: '', client_document: '', client_name: '',
      client_address: '', client_email: '', client_phone: '',
      invoice_status: '', provider_document: '', provider_name: '',
      payment_method: '', source_account: '', destination_account: '',
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
      } else if (formData.type === 'expense') {
        transactionData.provider_document = formData.provider_document || null;
        transactionData.provider_name = formData.provider_name || null;
        transactionData.payment_method = formData.payment_method || null;
      } else if (formData.type === 'transfer') {
        transactionData.source_account = formData.source_account || null;
        transactionData.destination_account = formData.destination_account || null;
      }

      if (isEditing) {
        await api.updateTransaction(id, transactionData);
      } else {
        if (formData.type === 'income' && applyToCartera && carteraSelectId) {
          transactionData.cartera_id = carteraSelectId;
        }
        await api.createTransaction(transactionData);
      }
      invalidateDashboardCache();
      if ((!isEditing && formData.type === 'income' && applyToCartera && carteraSelectId) || carteraLink) {
        invalidateCarteraCache();
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
              : 'Registra un nuevo ingreso, gasto o transferencia'}
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
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex items-center justify-center gap-1.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'income'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className={`p-1.5 sm:p-2 rounded-lg ${formData.type === 'income' ? 'bg-emerald-500/20' : 'bg-dark-800'}`}>
                  <ArrowUpRight className={`h-4 w-4 sm:h-5 sm:w-5 ${formData.type === 'income' ? 'text-emerald-400' : 'text-dark-400'}`} />
                </div>
                <span className={`font-medium text-xs sm:text-base ${formData.type === 'income' ? 'text-emerald-400' : 'text-dark-400'}`}>
                  Ingreso
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex items-center justify-center gap-1.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'expense'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className={`p-1.5 sm:p-2 rounded-lg ${formData.type === 'expense' ? 'bg-red-500/20' : 'bg-dark-800'}`}>
                  <ArrowDownRight className={`h-4 w-4 sm:h-5 sm:w-5 ${formData.type === 'expense' ? 'text-red-400' : 'text-dark-400'}`} />
                </div>
                <span className={`font-medium text-xs sm:text-base ${formData.type === 'expense' ? 'text-red-400' : 'text-dark-400'}`}>
                  Gasto
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('transfer')}
                className={`flex items-center justify-center gap-1.5 sm:gap-3 p-2.5 sm:p-4 rounded-xl border-2 transition-all ${
                  formData.type === 'transfer'
                    ? 'border-white/60 bg-white/5'
                    : 'border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className={`p-1.5 sm:p-2 rounded-lg ${formData.type === 'transfer' ? 'bg-white/10' : 'bg-dark-800'}`}>
                  <ArrowLeftRight className={`h-4 w-4 sm:h-5 sm:w-5 ${formData.type === 'transfer' ? 'text-white' : 'text-dark-400'}`} />
                </div>
                <span className={`font-medium text-xs sm:text-base ${formData.type === 'transfer' ? 'text-white' : 'text-dark-400'}`}>
                  <span className="hidden sm:inline">Transferencia</span>
                  <span className="sm:hidden">Transf.</span>
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
                {formData.type === 'income' ? `Ingreso ${currency} *` : formData.type === 'transfer' ? `Monto ${currency} *` : `Gasto Total ${currency} *`}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  name="amount"
                  placeholder="0"
                  value={formatAmountDisplay(formData.amount)}
                  onChange={handleAmountChange}
                  className={`${errors.amount ? inputErrorClass : inputClass} text-xl font-bold`}
                />
              </div>
              {errors.amount && <p className="text-sm text-red-400">{errors.amount}</p>}
            </div>
          </div>

          {formData.type === 'income' && (
            <>
              {!isEditing && (
                <div className="rounded-xl border border-dark-700 bg-dark-900/40 p-4 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-gold-400 shrink-0" />
                      Cobro de cartera
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setApplyToCartera((v) => !v);
                        setCarteraSelectId('');
                        setErrors((prev) => ({ ...prev, cartera_id: '' }));
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        applyToCartera ? 'bg-gold-500' : 'bg-dark-600'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        applyToCartera ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {!applyToCartera && (
                    <p className="text-xs text-dark-400">
                      Activa para vincular este ingreso a una factura pendiente en cartera.
                    </p>
                  )}

                  {/* Cartera records list */}
                  {applyToCartera && (
                    <div className="space-y-2 pt-1">
                      {carteraSelectOptions.length === 0 ? (
                        <p className="text-xs text-dark-400 text-center py-3">
                          No hay registros con saldo pendiente en cartera.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-dark-400 mb-2">Selecciona la factura a abonar:</p>
                          {carteraSelectOptions.map((opt) => {
                            const record = carteraRecords.find((r) => r.id === opt.value);
                            const saldo = record ? Number(record.saldo) : 0;
                            const selected = carteraSelectId === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setCarteraSelectId(opt.value);
                                  setErrors((prev) => ({ ...prev, cartera_id: '' }));
                                  // Auto-fill client name from cartera record
                                  if (record?.nombre && !formData.client_name) {
                                    setFormData((prev) => ({ ...prev, client_name: record.nombre }));
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                                  selected
                                    ? 'border-gold-400/60 bg-gold-400/10'
                                    : 'border-dark-700 bg-dark-800/50 hover:border-dark-600 hover:bg-dark-800'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${selected ? 'text-gold-300' : 'text-white'}`}>
                                    {record?.nombre || opt.label}
                                  </p>
                                  {record?.producto && (
                                    <p className="text-xs text-dark-400 truncate">{record.producto}</p>
                                  )}
                                </div>
                                <div className="text-right ml-4 shrink-0">
                                  <p className="text-xs text-dark-400">Saldo pendiente</p>
                                  <p className={`text-sm font-semibold ${selected ? 'text-gold-400' : 'text-red-400'}`}>
                                    {formatCurrency(saldo, currency)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                          {errors.cartera_id && (
                            <p className="text-sm text-red-400">{errors.cartera_id}</p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {isEditing && carteraLink && (
                <div className="flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
                  <Wallet className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-dark-200">
                    Este ingreso está vinculado al registro{' '}
                    <span className="text-white font-medium">{carteraLink.cartera_nombre || 'de cartera'}</span>.
                    Si cambias el monto o la fecha, se actualiza el abono en cartera.
                  </p>
                </div>
              )}
            </>
          )}

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

              {/* Subcategory chips for income */}
              {getCurrentSubcategories().length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-dark-400">
                    Subcategorías — selecciona para auto-rellenar datos del cliente
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getCurrentSubcategories().map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => handleSubcategorySelect(sub)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          selectedSubId === sub.id
                            ? 'bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/50'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Info */}
              <div className="border-t border-dark-800 pt-6">
                <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Datos del Cliente
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Documento *</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input
                        type="text"
                        name="client_document"
                        placeholder="NIT o CC"
                        value={formData.client_document}
                        onChange={handleChange}
                        onBlur={handleDocumentBlur}
                        autoComplete="off"
                        className={errors.client_document ? inputErrorClass : inputClass}
                      />
                      {showClientSuggestions && clientSuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden">
                          {clientSuggestions.map((c) => (
                            <button
                              key={c.client_document}
                              type="button"
                              onMouseDown={() => handleSelectClient(c)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-gold-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{c.client_name || '—'}</p>
                                <p className="text-xs text-dark-400 truncate">{c.client_document}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.client_document && <p className="text-sm text-red-400">{errors.client_document}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Nombre *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                      <input
                        type="text"
                        name="client_name"
                        placeholder="Nombre del cliente"
                        value={formData.client_name}
                        onChange={handleChange}
                        onBlur={handleDocumentBlur}
                        autoComplete="off"
                        className={errors.client_name ? inputErrorClass : inputClass}
                      />
                      {showClientSuggestions && clientSuggestions.length > 0 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden">
                          {clientSuggestions.map((c) => (
                            <button
                              key={c.client_document}
                              type="button"
                              onMouseDown={() => handleSelectClient(c)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-gold-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{c.client_name || '—'}</p>
                                <p className="text-xs text-dark-400 truncate">{c.client_document}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.client_name && <p className="text-sm text-red-400">{errors.client_name}</p>}
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

              {/* Description / Detail */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-dark-200">Detalle del ingreso</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 h-5 w-5 text-dark-400" />
                  <textarea
                    name="description"
                    placeholder="Describe a qué corresponde este ingreso..."
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

          {/* ======= EXPENSE FIELDS ======= */}
          {formData.type === 'expense' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 order-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-dark-200">Categoría *</label>
                    <Link to="/settings" className="text-xs text-gold-400 hover:text-gold-300 flex items-center gap-1">
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

                {getCurrentSubcategories().length > 0 && (
                  <div className="space-y-2 order-2 md:order-3 md:col-span-2">
                    <label className="block text-xs font-medium text-dark-400">
                      Subcategorías — selecciona para auto-rellenar datos del proveedor
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {getCurrentSubcategories().map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleSubcategorySelect(sub)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedSubId === sub.id
                              ? 'bg-gold-400/20 text-gold-400 ring-1 ring-gold-400/50'
                              : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
                          }`}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 order-3 md:order-2">
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

          {/* ======= TRANSFER FIELDS ======= */}
          {formData.type === 'transfer' && (
            <>
              <div className="border-t border-dark-800 pt-6">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Datos de la Transferencia
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Cuenta Origen *</label>
                    <Select
                      name="source_account"
                      value={formData.source_account}
                      onChange={handleChange}
                      options={ACCOUNT_OPTIONS}
                      placeholder="Selecciona cuenta origen"
                      error={errors.source_account}
                    />
                    {errors.source_account && <p className="text-sm text-red-400">{errors.source_account}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-dark-200">Cuenta Destino *</label>
                    <Select
                      name="destination_account"
                      value={formData.destination_account}
                      onChange={handleChange}
                      options={ACCOUNT_OPTIONS}
                      placeholder="Selecciona cuenta destino"
                      error={errors.destination_account}
                    />
                    {errors.destination_account && <p className="text-sm text-red-400">{errors.destination_account}</p>}
                  </div>
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
