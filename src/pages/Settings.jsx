import { useState } from 'react';
import { User, Mail, Lock, Bell, Shield, Palette, Save } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    weekly: true,
    monthly: false,
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.updateProfile({ name: profileData.name });
      setSuccess('Perfil actualizado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error al actualizar perfil');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      await api.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setSuccess('Contraseña actualizada correctamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Error al cambiar contraseña');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'appearance', label: 'Apariencia', icon: Palette },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Configuración</h1>
        <p className="text-dark-400 mt-1">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <p className="text-emerald-400">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gold-400/10 text-gold-400'
                      : 'text-dark-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">
                Información del perfil
              </h2>

              {/* Avatar */}
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-3xl font-bold text-dark-950">
                    {profileData.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium">{profileData.name}</p>
                  <p className="text-dark-400 text-sm">{profileData.email}</p>
                  <p className="text-gold-400 text-xs mt-1">Plan Premium</p>
                </div>
              </div>

              <div className="space-y-5">
                <Input
                  label="Nombre completo"
                  name="name"
                  icon={User}
                  value={profileData.name}
                  onChange={handleProfileChange}
                />
                <Input
                  label="Correo electrónico"
                  name="email"
                  type="email"
                  icon={Mail}
                  value={profileData.email}
                  disabled
                  className="opacity-60 cursor-not-allowed"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-dark-800">
                <Button onClick={handleSaveProfile} loading={loading} icon={Save}>
                  Guardar cambios
                </Button>
              </div>
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">
                Cambiar contraseña
              </h2>

              <div className="space-y-5">
                <Input
                  label="Contraseña actual"
                  name="currentPassword"
                  type="password"
                  icon={Lock}
                  placeholder="••••••••"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                />
                <Input
                  label="Nueva contraseña"
                  name="newPassword"
                  type="password"
                  icon={Lock}
                  placeholder="Mínimo 8 caracteres"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                />
                <Input
                  label="Confirmar nueva contraseña"
                  name="confirmPassword"
                  type="password"
                  icon={Lock}
                  placeholder="Repite la nueva contraseña"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                />
              </div>

              <div className="mt-6 pt-6 border-t border-dark-800">
                <Button onClick={handleSavePassword} loading={loading} icon={Save}>
                  Actualizar contraseña
                </Button>
              </div>

              {/* Sessions */}
              <div className="mt-8 pt-6 border-t border-dark-800">
                <h3 className="text-md font-semibold text-white mb-4">
                  Sesiones activas
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">Este dispositivo</p>
                      <p className="text-dark-400 text-sm">
                        Linux • Chrome • Última actividad: Ahora
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                      Activo
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">
                Preferencias de notificaciones
              </h2>

              <div className="space-y-4">
                {[
                  {
                    key: 'email',
                    title: 'Notificaciones por email',
                    description: 'Recibe alertas importantes en tu correo',
                  },
                  {
                    key: 'push',
                    title: 'Notificaciones push',
                    description: 'Alertas en tiempo real en tu navegador',
                  },
                  {
                    key: 'weekly',
                    title: 'Resumen semanal',
                    description: 'Recibe un resumen de tu actividad cada semana',
                  },
                  {
                    key: 'monthly',
                    title: 'Reporte mensual',
                    description: 'Análisis detallado de tus finanzas cada mes',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">{item.title}</p>
                      <p className="text-dark-400 text-sm">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationChange(item.key)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key] ? 'bg-gold-400' : 'bg-dark-700'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          notifications[item.key]
                            ? 'translate-x-7'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-dark-800">
                <Button onClick={handleSave} loading={loading} icon={Save}>
                  Guardar preferencias
                </Button>
              </div>
            </Card>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-white mb-6">
                Apariencia
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-3">
                    Tema
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'dark', label: 'Oscuro', active: true },
                      { id: 'light', label: 'Claro', active: false },
                      { id: 'system', label: 'Sistema', active: false },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          theme.active
                            ? 'border-gold-400 bg-gold-400/10'
                            : 'border-dark-700 opacity-50 cursor-not-allowed'
                        }`}
                        disabled={!theme.active}
                      >
                        <div
                          className={`h-16 rounded-lg mb-3 ${
                            theme.id === 'dark'
                              ? 'bg-dark-950'
                              : theme.id === 'light'
                              ? 'bg-gray-100'
                              : 'bg-gradient-to-r from-dark-950 to-gray-100'
                          }`}
                        />
                        <p
                          className={`text-sm font-medium ${
                            theme.active ? 'text-gold-400' : 'text-dark-400'
                          }`}
                        >
                          {theme.label}
                        </p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-dark-500 mt-2">
                    Más temas próximamente
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-200 mb-3">
                    Moneda predeterminada
                  </label>
                  <select className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-lg text-white focus:outline-none focus:border-gold-400">
                    <option value="USD">USD - Dólar estadounidense</option>
                    <option value="MXN">MXN - Peso mexicano</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="COP">COP - Peso colombiano</option>
                  </select>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
