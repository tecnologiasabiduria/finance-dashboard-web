import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = sessionStorage.getItem('token');
      const savedUser = sessionStorage.getItem('user');
      
      if (savedToken) {
        try {
          api.setToken(savedToken);
          const { data } = await api.getMe();
          setUser(data.user);
          setToken(savedToken);
        } catch (error) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          api.clearToken();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const result = await api.login(email, password);
    setUser(result.data.user);
    setToken(result.data.token);
    sessionStorage.setItem('token', result.data.token);
    api.setToken(result.data.token);
    return result.data;
  };

  const register = async (data) => {
    const result = await api.register(data);
    return result.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
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
