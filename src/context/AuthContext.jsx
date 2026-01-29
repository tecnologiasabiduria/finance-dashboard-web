import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

// Datos de demostración para visualización
const DEMO_USER = {
  id: '1',
  name: 'Carlos García',
  email: 'carlos@empresa.com',
  avatar: null,
  subscription: {
    status: 'active',
    plan: 'premium',
    expiresAt: '2026-12-31',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = sessionStorage.getItem('token');
      if (savedToken) {
        try {
          api.setToken(savedToken);
          const { data } = await api.getMe();
          setUser(data.user);
          setToken(savedToken);
        } catch (error) {
          sessionStorage.removeItem('token');
          api.clearToken();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    // Modo demostración: si el email contiene "demo", simular login exitoso
    if (email.includes('demo') || email === 'demo@demo.com') {
      const demoToken = 'demo-jwt-token-' + Date.now();
      setUser(DEMO_USER);
      setToken(demoToken);
      sessionStorage.setItem('token', demoToken);
      api.setToken(demoToken);
      return { user: DEMO_USER, token: demoToken };
    }

    try {
      const result = await api.login(email, password);
      setUser(result.data.user);
      setToken(result.data.token);
      sessionStorage.setItem('token', result.data.token);
      api.setToken(result.data.token);
      return result.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (data) => {
    const result = await api.register(data);
    return result.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('token');
    api.clearToken();
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
