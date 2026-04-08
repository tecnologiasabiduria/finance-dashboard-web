import { useState, useEffect } from 'react';
import {
  Plus,
  Wallet,
  Building2,
  CreditCard,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Check,
} from 'lucide-react';
import { Card, Button, Input, Modal, ConfirmModal, Spinner } from '../components/ui';
import { formatCurrency } from '../utils/formatters';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';

const ACCOUNT_COLORS = [
  '#22C55E',
  '#3B82F6',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#6B7280',
];

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Efectivo', icon: Wallet },
  { value: 'bank', label: 'Banco', icon: Building2 },
  { value: 'credit_card', label: 'Tarjeta', icon: CreditCard },
];

const TYPE_ICONS = {
  cash: Wallet,
  bank: Building2,
  credit_card: CreditCard,
};

const EMPTY_FORM = {
  name: '',
  type: 'bank',
  balance: '',
  credit_limit: '',
  cut_off_day: '',
  payment_day: '',
  interest_rate: '',
  color: ACCOUNT_COLORS[1],
  is_default: false,
};

export default function Accounts() {
  const { currency } = useSettings();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete state
  const [deleteModal, setDeleteModal] = useState({ open: false, account: null });
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accountsRes, summaryRes] = await Promise.all([
        api.getAccounts(),
        api.getAccountsSummary(),
      ]);
      setAccounts(accountsRes.data?.accounts || []);
      setSummary(summaryRes.data || null);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingAccount(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (account) => {
    setEditingAccount(account);
    setForm({
      name: account.name || '',
      type: account.type || 'bank',
      balance: (account.balance || 0).toString(),
      credit_limit: (account.credit_limit || '').toString(),
      cut_off_day: (account.cut_off_day || '').toString(),
      payment_day: (account.payment_due_day || '').toString(),
      interest_rate: (account.interest_rate || '').toString(),
      color: account.color || ACCOUNT_COLORS[1],
      is_default: account.is_default || false,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    const balanceNum = parseFloat(form.balance);
    if (isNaN(balanceNum)) {
      setFormError('El saldo debe ser un número válido');
      return;
    }

    if (form.type === 'credit_card') {
      const limit = parseFloat(form.credit_limit);
      if (!limit || limit <= 0) {
        setFormError('El límite de crédito es obligatorio');
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        balance: form.type === 'credit_card' ? Math.abs(balanceNum) : balanceNum,
        color: form.color,
        is_default: form.is_default,
      };

      if (form.type === 'credit_card') {
        payload.credit_limit = parseFloat(form.credit_limit) || 0;
        payload.cut_off_day = parseInt(form.cut_off_day) || null;
        payload.payment_due_day = parseInt(form.payment_day) || null;
        payload.interest_rate = parseFloat(form.interest_rate) || null;
      }

      if (editingAccount) {
        await api.updateAccount(editingAccount.id, payload);
      } else {
        await api.createAccount(payload);
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.account) return;
    setDeleting(true);
    try {
      await api.deleteAccount(deleteModal.account.id);
      setDeleteModal({ open: false, account: null });
      await loadData();
    } catch (err) {
      console.error('Error deleting account:', err);
    } finally {
      setDeleting(false);
    }
  };

  const cashAndBank = accounts.filter((a) => a.type === 'cash' || a.type === 'bank');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');

  // Skeleton
  const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-dark-800 rounded-lg ${className}`} />
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-44 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-5">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-8 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-xl p-5">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-36" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Mis Cuentas</h1>
          <p className="text-dark-400 mt-1">Administra tus cuentas bancarias, efectivo y tarjetas</p>
        </div>
        {accounts.length > 0 && (
          <Button size="sm" icon={Plus} onClick={openCreate}>
            Nueva Cuenta
          </Button>
        )}
      </div>

      {/* Empty state */}
      {accounts.length === 0 && (
        <Card className="p-12 text-center border-dashed border-dark-700">
          <div className="p-4 bg-gold-400/10 rounded-2xl inline-block mb-4">
            <Wallet className="h-10 w-10 text-gold-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No tienes cuentas configuradas</h3>
          <p className="text-dark-400 text-sm mb-6 max-w-md mx-auto">
            Agrega tus cuentas bancarias, efectivo y tarjetas de crédito para llevar un mejor control de tus finanzas.
          </p>
          <Button icon={Plus} onClick={openCreate}>
            Crear primera cuenta
          </Button>
        </Card>
      )}

      {/* EFECTIVO Y BANCOS */}
      {cashAndBank.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
            Efectivo y Bancos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cashAndBank.map((account) => {
              const Icon = TYPE_ICONS[account.type] || Wallet;
              return (
                <Card key={account.id} className="p-5 group relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: account.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{account.name}</h3>
                        <p className="text-xs text-dark-500 capitalize">
                          {account.type === 'cash' ? 'Efectivo' : 'Banco'}
                          {account.is_default && (
                            <span className="ml-2 text-gold-400">• Principal</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(account)}
                        className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, account })}
                        className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${account.balance >= 0 ? 'text-white' : 'text-red-400'}`}>
                    {formatCurrency(account.balance, currency)}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* TARJETAS DE CRÉDITO */}
      {creditCards.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
            Tarjetas de Crédito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditCards.map((account) => {
              const debt = Math.abs(account.balance || 0);
              const limit = account.credit_limit || 0;
              const available = Math.max(0, limit - debt);
              const utilization = limit > 0 ? (debt / limit) * 100 : 0;

              return (
                <Card key={account.id} className="p-5 group relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="p-2.5 rounded-xl"
                        style={{ backgroundColor: `${account.color}20` }}
                      >
                        <CreditCard className="h-5 w-5" style={{ color: account.color }} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">{account.name}</h3>
                        <p className="text-xs text-dark-500">
                          Tarjeta de crédito
                          {account.is_default && (
                            <span className="ml-2 text-gold-400">• Principal</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(account)}
                        className="p-1.5 text-dark-400 hover:text-gold-400 hover:bg-dark-800 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ open: true, account })}
                        className="p-1.5 text-dark-400 hover:text-red-400 hover:bg-dark-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Debt */}
                  <p className="text-2xl font-bold text-red-400 mb-3">
                    {debt > 0 ? `-${formatCurrency(debt, currency)}` : formatCurrency(0, currency)}
                  </p>

                  {/* Utilization bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-dark-400">Utilización</span>
                      <span className={`font-medium ${utilization > 70 ? 'text-red-400' : utilization > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {utilization.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          utilization > 70 ? 'bg-red-500' : utilization > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Limit & available */}
                  <div className="flex items-center justify-between text-xs text-dark-400">
                    <span>Límite: {formatCurrency(limit, currency)}</span>
                    <span>Disponible: {formatCurrency(available, currency)}</span>
                  </div>

                  {/* Cut-off & payment dates */}
                  {(account.cut_off_day || account.payment_day) && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                      {account.cut_off_day && <span>Corte: día {account.cut_off_day}</span>}
                      {account.payment_day && <span>Pago: día {account.payment_day}</span>}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* RESUMEN */}
      {summary && (
        <div>
          <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">
            Resumen
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 border-emerald-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400 uppercase tracking-wider">Activos</span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-emerald-400">
                {formatCurrency(summary.total_assets || 0, currency)}
              </p>
              <p className="text-xs text-dark-500 mt-1">Efectivo + bancos</p>
            </Card>

            <Card className="p-5 border-red-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400 uppercase tracking-wider">Deudas</span>
                <TrendingDown className="h-4 w-4 text-red-400" />
              </div>
              <p className="text-xl font-bold text-red-400">
                {formatCurrency(summary.total_liabilities || 0, currency)}
              </p>
              <p className="text-xs text-dark-500 mt-1">Tarjetas de crédito</p>
            </Card>

            <Card className={`p-5 ${(summary.net_worth || 0) >= 0 ? 'border-gold-400/20' : 'border-red-500/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-dark-400 uppercase tracking-wider">Patrimonio Neto</span>
                <DollarSign className="h-4 w-4 text-gold-400" />
              </div>
              <p className={`text-xl font-bold ${(summary.net_worth || 0) >= 0 ? 'text-gold-400' : 'text-red-400'}`}>
                {formatCurrency(summary.net_worth || 0, currency)}
              </p>
              <p className="text-xs text-dark-500 mt-1">Activos - Deudas</p>
            </Card>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
        size="md"
      >
        <div className="space-y-5">
          {/* Account type toggle */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Tipo de cuenta</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'border-gold-400 bg-gold-400/10 text-gold-400'
                        : 'border-dark-700 bg-dark-800/50 text-dark-400 hover:border-dark-600 hover:text-dark-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <Input
            label="Nombre de la cuenta"
            placeholder="Ej: Bancolombia, Efectivo tienda"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          {/* Balance */}
          <Input
            label={form.type === 'credit_card' ? 'Deuda actual' : 'Saldo inicial'}
            type="number"
            placeholder="0"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
          />

          {/* Credit card extra fields */}
          {form.type === 'credit_card' && (
            <>
              <Input
                label="Límite de crédito"
                type="number"
                placeholder="0"
                value={form.credit_limit}
                onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Día de corte"
                  type="number"
                  placeholder="1-31"
                  min="1"
                  max="31"
                  value={form.cut_off_day}
                  onChange={(e) => setForm({ ...form, cut_off_day: e.target.value })}
                />
                <Input
                  label="Día de pago"
                  type="number"
                  placeholder="1-31"
                  min="1"
                  max="31"
                  value={form.payment_day}
                  onChange={(e) => setForm({ ...form, payment_day: e.target.value })}
                />
              </div>
              <Input
                label="Tasa de interés (% anual, opcional)"
                type="number"
                placeholder="0"
                step="0.01"
                value={form.interest_rate}
                onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
              />
            </>
          )}

          {/* Color selector */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                    form.color === color
                      ? 'border-white scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {form.color === color && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* Default checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm({ ...form, is_default: !form.is_default })}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                form.is_default
                  ? 'bg-gold-400 border-gold-400'
                  : 'border-dark-600 bg-dark-800'
              }`}
            >
              {form.is_default && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            <span className="text-sm text-dark-200">Cuenta por defecto</span>
          </label>

          {/* Error */}
          {formError && (
            <p className="text-sm text-red-400">{formError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingAccount ? 'Guardar Cambios' : 'Crear Cuenta'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, account: null })}
        onConfirm={handleDelete}
        title="Eliminar cuenta"
        message={`¿Estás seguro de eliminar "${deleteModal.account?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
