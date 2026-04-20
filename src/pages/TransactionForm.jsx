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
  Upload,
  Landmark,
  CreditCard,
  Smartphone,
  Banknote,
  PiggyBank,
  AlertCircle,
} from 'lucide-react';
import { Button, Select, Card, CreatableSelect, DatePicker, FileUpload } from '../components/ui';
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

// Método de pago / Tipo de transacción (enum canónico sincronizado con backend y DB)
const PAYMENT_METHOD_OPTIONS = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_debito', label: 'Tarjeta de Débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de Crédito' },
  { value: 'consignacion', label: 'Consignación' },
  { value: 'cheque', label: 'Cheque' },
];
const VALID_PAYMENT_METHODS = PAYMENT_METHOD_OPTIONS.map((o) => o.value);

// Normaliza cualquier valor legacy a uno del enum (o '' si no mapea).
function normalizePaymentMethod(raw) {
  if (!raw) return '';
  const v = String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (VALID_PAYMENT_METHODS.includes(v)) return v;
  if (['transferencia', 'transfer', 'transferencia bancaria'].includes(v)) return 'transferencia';
  if (['efectivo', 'cash'].includes(v)) return 'efectivo';
  if (['tarjeta_debito', 'tarjeta debito', 'tarjeta de debito', 'debito', 'debit'].includes(v)) return 'tarjeta_debito';
  if (['tarjeta_credito', 'tarjeta credito', 'tarjeta de credito', 'credito', 'credit'].includes(v)) return 'tarjeta_credito';
  if (['consignacion', 'consignación'].includes(v)) return 'consignacion';
  if (['cheque'].includes(v)) return 'cheque';
  return '';
}

// Default razonable según el tipo de cuenta seleccionada.
function defaultPaymentMethodForAccount(account) {
  if (!account) return '';
  const t = account.type || account.account_type;
  if (t === 'cash') return 'efectivo';
  if (t === 'credit_card') return 'tarjeta_credito';
  return '';
}

// Icon map for account types
const ACCOUNT_TYPE_ICONS = {
  bank: Landmark,
  credit_card: CreditCard,
  digital_wallet: Smartphone,
  cash: Banknote,
  savings: PiggyBank,
};

function getAccountIcon(type) {
  return ACCOUNT_TYPE_ICONS[type] || Wallet;
}

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
    // Cuenta bancaria
    account_id: '',
    to_account_id: '',
    // Cuotas (solo para gastos con tarjeta de crédito)
    cuotas: 1,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [categoriesRaw, setCategoriesRaw] = useState({ income: [], expense: [] });
  const [selectedSubId, setSelectedSubId] = useState(null);

  const [documents, setDocuments] = useState([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // archivos seleccionados antes de guardar

  const [carteraLink, setCarteraLink] = useState(null);
  const [applyToCartera, setApplyToCartera] = useState(false);
  const [carteraSelectId, setCarteraSelectId] = useState('');
  const [carteraRecords, setCarteraRecords] = useState([]);
  
  // Crear nuevo registro de cartera (venta con saldo pendiente)
  const [createNewCartera, setCreateNewCartera] = useState(false);
  const [totalSaleValue, setTotalSaleValue] = useState('');
  const [pastClients, setPastClients] = useState([]);
  const [clientSuggestions, setClientSuggestions] = useState([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [pastProviders, setPastProviders] = useState([]);
  const [providerSuggestions, setProviderSuggestions] = useState([]);
  const [showProviderSuggestions, setShowProviderSuggestions] = useState(false);

  // Accounts
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);

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
          client_email: r.email || '',
          client_phone: r.telefono || '',
          client_address: r.direccion || '',
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

  // Auto-completado: lookup de proveedores por documento
  // Fuentes (en orden de prioridad): subcategorías → transacciones pasadas
  const providerLookup = useMemo(() => {
    const map = {};

    // 1. Transacciones pasadas (menor prioridad)
    for (const p of pastProviders) {
      if (p.provider_document && !map[p.provider_document]) {
        map[p.provider_document] = p;
      }
    }

    // 2. Subcategorías de gastos (mayor prioridad)
    for (const cat of categoriesRaw.expense || []) {
      for (const sub of cat.subcategories || []) {
        const doc = (sub.provider_document || '').trim();
        if (doc) {
          map[doc] = {
            provider_name: sub.provider_name || '',
            provider_document: doc,
            payment_method: normalizePaymentMethod(sub.payment_method),
          };
        }
      }
    }

    return map;
  }, [categoriesRaw, pastProviders]);

  const handleDocumentBlur = () => {
    // Small delay so click on suggestion fires before blur hides it
    setTimeout(() => {
      setShowClientSuggestions(false);
      setShowProviderSuggestions(false);
    }, 150);
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

  const getProviderSuggestions = (field, value) => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    return Object.values(providerLookup).filter((p) => {
      if (field === 'provider_document') return p.provider_document.toLowerCase().includes(q);
      if (field === 'provider_name') return p.provider_name.toLowerCase().includes(q);
      return false;
    }).slice(0, 6);
  };

  const handleSelectProvider = (provider) => {
    setFormData((prev) => ({
      ...prev,
      provider_document: provider.provider_document || prev.provider_document,
      provider_name: provider.provider_name || prev.provider_name,
      payment_method: normalizePaymentMethod(provider.payment_method) || prev.payment_method,
    }));
    setShowProviderSuggestions(false);
    setProviderSuggestions([]);
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
        payment_method: normalizePaymentMethod(sub.payment_method) || prev.payment_method,
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
    }
  };

  // Load accounts
  useEffect(() => {
    setAccountsLoading(true);
    api.getAccounts().then((res) => {
      const list = res.data?.accounts || res.data || [];
      setAccounts(Array.isArray(list) ? list : []);
      // Preselect default account + sugerir método de pago coherente
      const defaultAcc = list.find((a) => a.is_default);
      if (defaultAcc && !isEditing) {
        setFormData((prev) => {
          const suggested = defaultPaymentMethodForAccount(defaultAcc);
          return {
            ...prev,
            account_id: prev.account_id || defaultAcc.id,
            payment_method:
              prev.type === 'transfer'
                ? 'transferencia'
                : prev.payment_method || suggested,
          };
        });
      } else if (!isEditing) {
        setFormData((prev) =>
          prev.type === 'transfer' && !prev.payment_method
            ? { ...prev, payment_method: 'transferencia' }
            : prev
        );
      }
    }).catch(() => setAccounts([])).finally(() => setAccountsLoading(false));
  }, [token]);

  useEffect(() => {
    loadCategories();
    api.getTransactions({ limit: 300 }).then((res) => {
      const clients = {};
      const providers = {};
      for (const tx of res.data?.transactions || []) {
        if (tx.type === 'income') {
          const doc = (tx.client_document || '').trim();
          if (doc && !clients[doc]) {
            clients[doc] = {
              client_name: tx.client_name || '',
              client_document: doc,
              client_email: tx.client_email || '',
              client_phone: tx.client_phone || '',
              client_address: tx.client_address || '',
            };
          }
        } else if (tx.type === 'expense') {
          const doc = (tx.provider_document || '').trim();
          if (doc && !providers[doc]) {
            providers[doc] = {
              provider_name: tx.provider_name || '',
              provider_document: doc,
              payment_method: normalizePaymentMethod(tx.payment_method),
            };
          }
        }
      }
      setPastClients(Object.values(clients));
      setPastProviders(Object.values(providers));
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
            payment_method: normalizePaymentMethod(t.payment_method),
            source_account: t.source_account || '',
            destination_account: t.destination_account || '',
            account_id: t.account_id || '',
            to_account_id: t.to_account_id || '',
          });
          // Load existing documents
          api.getTransactionDocuments(id).then((res) => {
            setDocuments(res.data?.documents || []);
            setDocsLoaded(true);
          }).catch(() => setDocsLoaded(true));
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
    const isCarteraOnlyIncome = formData.type === 'income' && createNewCartera && !applyToCartera;
    if (!isCarteraOnlyIncome && (!formData.amount || parseFloat(formData.amount) <= 0)) {
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
    // Método de pago requerido en income/expense, excepto facturas sin cobro inmediato
    if ((formData.type === 'income' || formData.type === 'expense') && !isCarteraOnlyIncome) {
      if (!formData.payment_method) {
        newErrors.payment_method = 'Selecciona el método de pago';
      } else if (!VALID_PAYMENT_METHODS.includes(formData.payment_method)) {
        newErrors.payment_method = 'Método de pago inválido';
      }
    }
    // Account is required when accounts exist
    if (accounts.length > 0) {
      if (formData.type === 'income' || formData.type === 'expense') {
        if (!formData.account_id) {
          newErrors.account_id = 'Selecciona una cuenta';
        }
      }
      if (formData.type === 'transfer') {
        if (!formData.account_id) {
          newErrors.account_id = 'Selecciona la cuenta de origen';
        }
        if (!formData.to_account_id) {
          newErrors.to_account_id = 'Selecciona la cuenta de destino';
        }
        if (formData.account_id && formData.to_account_id && formData.account_id === formData.to_account_id) {
          newErrors.to_account_id = 'La cuenta destino debe ser diferente a la de origen';
        }
      }
    }
    if (formData.type === 'transfer') {
      if (!formData.source_account && !formData.account_id) {
        newErrors.source_account = 'Selecciona la cuenta de origen';
      }
      if (!formData.destination_account && !formData.to_account_id) {
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
    // Validación para crear nuevo registro de cartera
    if (!isEditing && formData.type === 'income' && createNewCartera) {
      const total = parseFloat(totalSaleValue) || 0;
      const paid = parseFloat(formData.amount) || 0;
      if (total <= 0) {
        newErrors.totalSaleValue = 'El valor total de la venta es requerido';
      } else if (paid > 0 && paid >= total) {
        newErrors.totalSaleValue = 'El valor total debe ser mayor al monto pagado (si no hay saldo pendiente, no necesitas crear cartera)';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUploadDoc = async (file) => {
    if (!isEditing) {
      // Nueva transacción: guardar en estado local con preview
      const tempId = `pending-${Date.now()}`;
      setPendingFiles((prev) => [...prev, {
        id: tempId,
        file,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        signed_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }]);
      return;
    }
    setUploadingDoc(true);
    try {
      const res = await api.uploadTransactionDocument(id, file);
      setDocuments((prev) => [...prev, res.data.document]);
    } catch (err) {
      console.error('Error uploading document:', err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!isEditing) {
      setPendingFiles((prev) => prev.filter((f) => f.id !== docId));
      return;
    }
    try {
      await api.deleteTransactionDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Error deleting document:', err);
    }
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
    if (name === 'provider_document' || name === 'provider_name') {
      const suggestions = getProviderSuggestions(name, value);
      setProviderSuggestions(suggestions);
      setShowProviderSuggestions(suggestions.length > 0);
    }
    if (name === 'category') {
      setSelectedSubId(null);
    }
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleClientFieldKeyDown = (e) => {
    if (e.key === 'Enter' && showClientSuggestions && clientSuggestions.length > 0) {
      e.preventDefault();
      handleSelectClient(clientSuggestions[0]);
    }
  };

  const handleProviderFieldKeyDown = (e) => {
    if (e.key === 'Enter' && showProviderSuggestions && providerSuggestions.length > 0) {
      e.preventDefault();
      handleSelectProvider(providerSuggestions[0]);
    }
  };

  const handleTypeChange = (type) => {
    setSelectedSubId(null);
    // Al cambiar de tipo, resetear siempre los toggles de cartera para evitar
    // que queden activos por un estado anterior. Solo se reactivan si el usuario
    // los marca manualmente o si llegan por el query param `carteraId`.
    setApplyToCartera(false);
    setCarteraSelectId('');
    setCreateNewCartera(false);
    setTotalSaleValue('');
    // Restore default account when switching type
    const defaultAcc = accounts.find((a) => a.is_default);
    const nextPaymentMethod =
      type === 'transfer'
        ? 'transferencia'
        : defaultPaymentMethodForAccount(defaultAcc);
    setFormData((prev) => ({
      ...prev,
      type,
      category: '',
      invoice_number: '', client_document: '', client_name: '',
      client_address: '', client_email: '', client_phone: '',
      invoice_status: '', provider_document: '', provider_name: '',
      payment_method: nextPaymentMethod,
      source_account: '', destination_account: '',
      account_id: defaultAcc?.id || '',
      to_account_id: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Factura/Cuenta de cobro sin anticipo: solo crea registro en cartera
      const paidAmount = parseFloat(formData.amount) || 0;
      if (!isEditing && formData.type === 'income' && createNewCartera && paidAmount === 0) {
        const total = parseFloat(totalSaleValue) || 0;
        if (total > 0) {
          await api.createCarteraRecord({
            nombre: formData.client_name || '',
            documento: formData.client_document || '',
            email: formData.client_email || '',
            telefono: formData.client_phone || '',
            direccion: formData.client_address || '',
            fecha_venta: formData.date,
            valor_venta: total,
            cash: 0,
            producto: formData.category || '',
            notas: formData.description || '',
            plataforma: '',
            fuente: '',
          });
          invalidateCarteraCache();
        }
        navigate('/cartera');
        setLoading(false);
        return;
      }

      const transactionData = {
        type: formData.type,
        amount: paidAmount,
        category: formData.category,
        description: formData.description || null,
        date: formData.date,
      };

      // Include account_id if accounts are configured
      if (formData.account_id) {
        transactionData.account_id = formData.account_id;
      }

      if (formData.type !== 'transfer') {
        transactionData.payment_method = formData.payment_method || null;
      }

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
        if (!isEditing && formData.cuotas > 1) {
          transactionData.cuotas = formData.cuotas;
        }
      } else if (formData.type === 'transfer') {
        transactionData.source_account = formData.source_account || null;
        transactionData.destination_account = formData.destination_account || null;
        if (formData.to_account_id) {
          transactionData.to_account_id = formData.to_account_id;
        }
      }

      if (isEditing) {
        await api.updateTransaction(id, transactionData);
      } else {
        if (formData.type === 'income' && applyToCartera && carteraSelectId) {
          transactionData.cartera_id = carteraSelectId;
        }
        const created = await api.createTransaction(transactionData);
        const newId = created.data?.transaction?.id;
        if (newId && pendingFiles.length > 0) {
          await Promise.allSettled(
            pendingFiles.map((pf) => api.uploadTransactionDocument(newId, pf.file))
          );
        }
        
        // Crear registro de cartera si está activo
        if (formData.type === 'income' && createNewCartera && totalSaleValue) {
          const total = parseFloat(totalSaleValue) || 0;
          const paid = parseFloat(formData.amount) || 0;
          const saldo = total - paid;
          
          if (saldo > 0) {
            await api.createCarteraRecord({
              nombre: formData.client_name || '',
              documento: formData.client_document || '',
              email: formData.client_email || '',
              telefono: formData.client_phone || '',
              direccion: formData.client_address || '',
              fecha_venta: formData.date,
              valor_venta: total,
              cash: paid,
              producto: formData.category || '',
              notas: formData.description || '',
              plataforma: '',
              fuente: '',
            });
            invalidateCarteraCache();
          }
        }
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
      <div className="flex items-center justify-between gap-4">
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
        {!isEditing && (
          <Link to="/transactions/import">
            <Button variant="secondary" icon={Upload} size="sm">
              <span className="hidden sm:inline">Importar CSV</span>
              <span className="sm:hidden">Importar</span>
            </Button>
          </Link>
        )}
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
                {formData.type === 'income' && createNewCartera
                  ? `Anticipo recibido ${currency} (0 si no hay cobro aún)`
                  : formData.type === 'income'
                  ? `Ingreso ${currency} *`
                  : formData.type === 'transfer'
                  ? `Monto ${currency} *`
                  : `Gasto Total ${currency} *`}
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

          {/* Account Selector — for income/expense */}
          {accounts.length > 0 && formData.type !== 'transfer' && (() => {
            const selectableAccounts = formData.type === 'income'
              ? accounts.filter((a) => (a.type || a.account_type) !== 'credit_card')
              : accounts;
            if (selectableAccounts.length === 0) {
              return (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                  <p className="text-sm text-dark-200">
                    No tienes cuentas de efectivo o banco donde recibir este ingreso. Crea una cuenta para continuar.
                  </p>
                </div>
              );
            }
            return (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-200">Cuenta *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectableAccounts.map((acc) => {
                  const AccIcon = getAccountIcon(acc.account_type);
                  const selected = formData.account_id === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const suggested = defaultPaymentMethodForAccount(acc);
                          return {
                            ...prev,
                            account_id: acc.id,
                            payment_method:
                              !prev.payment_method && suggested
                                ? suggested
                                : prev.payment_method,
                          };
                        });
                        if (errors.account_id) setErrors((prev) => ({ ...prev, account_id: '' }));
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                        selected
                          ? 'border-gold-400/60 bg-gold-400/10'
                          : errors.account_id
                          ? 'border-red-500/40 bg-dark-900 hover:border-dark-600'
                          : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${selected ? 'bg-gold-400/20' : 'bg-dark-800'}`}>
                        <AccIcon className={`h-4 w-4 ${selected ? 'text-gold-400' : 'text-dark-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${selected ? 'text-gold-300' : 'text-white'}`}>{acc.name}</p>
                        <p className="text-xs text-dark-400 truncate">
                          {(acc.type === 'credit_card' || acc.account_type === 'credit_card')
                            ? `Deuda: ${formatCurrency(Math.abs(Number(acc.balance || 0)), currency)}`
                            : formatCurrency(Number(acc.balance || 0), currency)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              {errors.account_id && <p className="text-sm text-red-400">{errors.account_id}</p>}
            </div>
            );
          })()}
          {accounts.length === 0 && !accountsLoading && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-sm text-dark-200">
                No tienes cuentas configuradas.{' '}
                <Link to="/accounts" className="text-gold-400 hover:text-gold-300 font-medium underline">
                  Configura tus cuentas
                </Link>{' '}
                para un mejor control financiero.
              </p>
            </div>
          )}

          {/* Método de pago / Tipo de transacción — income & expense */}
          {formData.type !== 'transfer' && (
            <Select
              label="Método de pago *"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              options={PAYMENT_METHOD_OPTIONS}
              placeholder="Selecciona cómo se movió el dinero"
              error={errors.payment_method}
            />
          )}

          {/* Cuotas — solo para gastos con tarjeta de crédito */}
          {formData.type === 'expense' && !isEditing && (() => {
            const selectedAcc = accounts.find(a => a.id === formData.account_id);
            const isCreditCard = selectedAcc?.type === 'credit_card' || selectedAcc?.account_type === 'credit_card';
            if (!isCreditCard) return null;
            const totalAmount = parseFloat(formData.amount) || 0;
            const cuotasOpts = [1, 2, 3, 6, 9, 12, 18, 24, 36];
            const monthly = formData.cuotas > 1 && totalAmount > 0
              ? (totalAmount / formData.cuotas).toFixed(0)
              : null;
            return (
              <div className="space-y-3 p-4 bg-dark-900/60 border border-dark-700 rounded-xl">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gold-400" />
                  <label className="text-sm font-medium text-dark-200">Cuotas</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cuotasOpts.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cuotas: n }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        formData.cuotas === n
                          ? 'border-gold-400 bg-gold-400/10 text-gold-300'
                          : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500'
                      }`}
                    >
                      {n === 1 ? 'Una vez' : `${n}x`}
                    </button>
                  ))}
                </div>
                {monthly && (
                  <p className="text-xs text-dark-400">
                    <span className="text-gold-400 font-medium">
                      {formData.cuotas} cuotas de {formatCurrency(Number(monthly), currency)}/mes
                    </span>
                    {' '}— Total: {formatCurrency(totalAmount, currency)}
                  </p>
                )}
              </div>
            );
          })()}

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
                        const newValue = !applyToCartera;
                        setApplyToCartera(newValue);
                        setCarteraSelectId('');
                        setErrors((prev) => ({ ...prev, cartera_id: '' }));
                        // Desactivar crear nueva cartera si se activa cobro
                        if (newValue) {
                          setCreateNewCartera(false);
                          setTotalSaleValue('');
                        }
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
                                  // Auto-fill all client data from cartera record
                                  if (record) {
                                    setFormData((prev) => ({
                                      ...prev,
                                      client_name: record.nombre || prev.client_name,
                                      client_document: record.documento || prev.client_document,
                                      client_email: record.email || prev.client_email,
                                      client_phone: record.telefono || prev.client_phone,
                                      client_address: record.direccion || prev.client_address,
                                    }));
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                                  selected
                                    ? 'border-gold-400/60 bg-gold-400/10'
                                    : errors.cartera_id
                                    ? 'border-red-500/50 bg-red-500/5 hover:border-red-500/70'
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
                        </>
                      )}
                      {errors.cartera_id && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-sm text-red-400 font-medium">{errors.cartera_id}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Crear nuevo registro de cartera (venta con saldo pendiente) */}
              {!isEditing && !applyToCartera && (
                <div className="rounded-xl border border-dark-700 bg-dark-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white flex items-center gap-2">
                      <Plus className="h-4 w-4 text-amber-400 shrink-0" />
                      Venta con saldo pendiente
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCreateNewCartera((v) => !v);
                        if (!createNewCartera) setTotalSaleValue('');
                        setErrors((prev) => ({ ...prev, totalSaleValue: '' }));
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        createNewCartera ? 'bg-amber-500' : 'bg-dark-600'
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        createNewCartera ? 'translate-x-4' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>

                  {!createNewCartera && (
                    <p className="text-xs text-dark-400">
                      Activa si el cliente no paga el total y queda con saldo pendiente (se creará un registro en cartera).
                    </p>
                  )}

                  {createNewCartera && (
                    <div className="space-y-3 pt-1">
                      <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-white [.beige-theme_&]:text-amber-900">
                          El monto de arriba es lo que el cliente paga ahora. Ingresa abajo el valor total de la venta para calcular el saldo pendiente.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-dark-200">Valor total de la venta *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ej: 200.000"
                            value={totalSaleValue ? Number(totalSaleValue).toLocaleString('es-CO') : ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\./g, '').replace(/\D/g, '');
                              setTotalSaleValue(raw);
                              if (errors.totalSaleValue) setErrors((prev) => ({ ...prev, totalSaleValue: '' }));
                            }}
                            className={`w-full pl-12 pr-4 py-3 bg-dark-900 border rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 transition-all duration-300 ${
                              errors.totalSaleValue 
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                                : 'border-dark-700 focus:border-amber-400 focus:ring-amber-400/20'
                            }`}
                          />
                        </div>
                        {errors.totalSaleValue && <p className="text-sm text-red-400">{errors.totalSaleValue}</p>}
                      </div>
                      
                      {totalSaleValue && formData.amount && (
                        <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                          <span className="text-sm text-dark-400">Saldo pendiente:</span>
                          <span className="text-lg font-bold text-red-400">
                            {formatCurrency(Math.max(0, parseFloat(totalSaleValue) - parseFloat(formData.amount)), currency)}
                          </span>
                        </div>
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
                        onKeyDown={handleClientFieldKeyDown}
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
                        onKeyDown={handleClientFieldKeyDown}
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

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Documento Proveedor</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      name="provider_document"
                      placeholder="NIT o documento"
                      value={formData.provider_document}
                      onChange={handleChange}
                      onBlur={handleDocumentBlur}
                      onKeyDown={handleProviderFieldKeyDown}
                      autoComplete="off"
                      className={inputClass}
                    />
                    {showProviderSuggestions && providerSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden">
                        {providerSuggestions.map((p) => (
                          <button
                            key={p.provider_document}
                            type="button"
                            onMouseDown={() => handleSelectProvider(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                              <Building className="h-4 w-4 text-gold-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.provider_name || '—'}</p>
                              <p className="text-xs text-dark-400 truncate">{p.provider_document}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-dark-200">Proveedor</label>
                  <div className="relative">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                    <input
                      type="text"
                      name="provider_name"
                      placeholder="Nombre del proveedor"
                      value={formData.provider_name}
                      onChange={handleChange}
                      onBlur={handleDocumentBlur}
                      onKeyDown={handleProviderFieldKeyDown}
                      autoComplete="off"
                      className={inputClass}
                    />
                    {showProviderSuggestions && providerSuggestions.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-xl overflow-hidden">
                        {providerSuggestions.map((p) => (
                          <button
                            key={p.provider_document}
                            type="button"
                            onMouseDown={() => handleSelectProvider(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-gold-400/10 flex items-center justify-center flex-shrink-0">
                              <Building className="h-4 w-4 text-gold-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.provider_name || '—'}</p>
                              <p className="text-xs text-dark-400 truncate">{p.provider_document}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
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

                {accounts.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-dark-200">Desde (Origen) *</label>
                        <div className="space-y-2">
                          {accounts.map((acc) => {
                            const AccIcon = getAccountIcon(acc.account_type);
                            const selected = formData.account_id === acc.id;
                            return (
                              <button
                                key={acc.id}
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, account_id: acc.id, source_account: acc.name }));
                                  if (errors.account_id) setErrors((prev) => ({ ...prev, account_id: '' }));
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                                  selected
                                    ? 'border-gold-400/60 bg-gold-400/10'
                                    : errors.account_id
                                    ? 'border-red-500/40 bg-dark-900 hover:border-dark-600'
                                    : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 ${selected ? 'bg-gold-400/20' : 'bg-dark-800'}`}>
                                  <AccIcon className={`h-4 w-4 ${selected ? 'text-gold-400' : 'text-dark-400'}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${selected ? 'text-gold-300' : 'text-white'}`}>{acc.name}</p>
                                  <p className="text-xs text-dark-400 truncate">
                                    {acc.account_type === 'credit_card'
                                      ? `Deuda: -${formatCurrency(Number(acc.balance || 0), currency)}`
                                      : formatCurrency(Number(acc.balance || 0), currency)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {errors.account_id && <p className="text-sm text-red-400">{errors.account_id}</p>}
                      </div>
                      <div className="space-y-2">
                        {(() => {
                          const destAcc = accounts.find(a => a.id === formData.to_account_id);
                          const isPayingTC = destAcc?.account_type === 'credit_card';
                          return (
                            <label className="block text-sm font-medium text-dark-200">
                              {isPayingTC ? 'Pagar Tarjeta (Destino) *' : 'Hacia (Destino) *'}
                            </label>
                          );
                        })()}
                        <div className="space-y-2">
                          {accounts.map((acc) => {
                            const AccIcon = getAccountIcon(acc.account_type);
                            const selected = formData.to_account_id === acc.id;
                            const isOrigin = formData.account_id === acc.id;
                            return (
                              <button
                                key={acc.id}
                                type="button"
                                disabled={isOrigin}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, to_account_id: acc.id, destination_account: acc.name }));
                                  if (errors.to_account_id) setErrors((prev) => ({ ...prev, to_account_id: '' }));
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                                  isOrigin
                                    ? 'border-dark-800 bg-dark-900/50 opacity-40 cursor-not-allowed'
                                    : selected
                                    ? 'border-gold-400/60 bg-gold-400/10'
                                    : errors.to_account_id
                                    ? 'border-red-500/40 bg-dark-900 hover:border-dark-600'
                                    : 'border-dark-700 bg-dark-900 hover:border-dark-600'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg shrink-0 ${selected ? 'bg-gold-400/20' : 'bg-dark-800'}`}>
                                  <AccIcon className={`h-4 w-4 ${selected ? 'text-gold-400' : 'text-dark-400'}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm font-medium truncate ${selected ? 'text-gold-300' : 'text-white'}`}>{acc.name}</p>
                                  <p className="text-xs text-dark-400 truncate">
                                    {acc.account_type === 'credit_card'
                                      ? `Deuda: -${formatCurrency(Number(acc.balance || 0), currency)}`
                                      : formatCurrency(Number(acc.balance || 0), currency)}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {errors.to_account_id && <p className="text-sm text-red-400">{errors.to_account_id}</p>}
                      </div>
                    </div>
                    {(() => {
                      const destAcc = accounts.find(a => a.id === formData.to_account_id);
                      const isPayingTC = destAcc?.account_type === 'credit_card';
                      if (isPayingTC) {
                        const deuda = Math.abs(Number(destAcc.balance || 0));
                        return (
                          <div className="mt-3 p-3 rounded-xl bg-gold-400/10 border border-gold-400/20">
                            <p className="text-xs text-gold-300 font-medium flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5" />
                              El pago reducira la deuda de {destAcc.name}
                            </p>
                            {deuda > 0 && (
                              <p className="text-xs text-dark-400 mt-1">
                                Deuda actual: {formatCurrency(deuda, currency)}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return (
                        <p className="text-xs text-dark-500 mt-3 flex items-center gap-1.5">
                          <span>💡</span> Para pagar una tarjeta de credito, selecciona el banco como origen y la tarjeta como destino.
                        </p>
                      );
                    })()}
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-dark-200">Cuenta Origen *</label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                        <input
                          type="text"
                          name="source_account"
                          placeholder="Ej: Bancolombia, Nequi..."
                          value={formData.source_account}
                          onChange={handleChange}
                          className={errors.source_account ? inputErrorClass : inputClass}
                        />
                      </div>
                      {errors.source_account && <p className="text-sm text-red-400">{errors.source_account}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-dark-200">Cuenta Destino *</label>
                      <div className="relative">
                        <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-400" />
                        <input
                          type="text"
                          name="destination_account"
                          placeholder="Ej: Davivienda, Efectivo..."
                          value={formData.destination_account}
                          onChange={handleChange}
                          className={errors.destination_account ? inputErrorClass : inputClass}
                        />
                      </div>
                      {errors.destination_account && <p className="text-sm text-red-400">{errors.destination_account}</p>}
                    </div>
                  </div>
                )}
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

          {/* Documents */}
          {isEditing && (
            <div className="border-t border-dark-800 pt-6">
              <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos adjuntos
              </h3>
              <FileUpload
                files={documents}
                onUpload={handleUploadDoc}
                onDelete={handleDeleteDoc}
                uploading={uploadingDoc}
              />
            </div>
          )}
          {!isEditing && (
            <div className="border-t border-dark-800 pt-6">
              <h3 className="text-sm font-semibold text-gold-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos adjuntos
              </h3>
              <FileUpload
                files={pendingFiles}
                onUpload={handleUploadDoc}
                onDelete={handleDeleteDoc}
                uploading={false}
              />
            </div>
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
