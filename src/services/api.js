// Forzar la URL de la API con /api
const API_URL = 'http://localhost:3000/api';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.error?.message || 'Error desconocido');
        error.status = response.status;
        error.code = data.error?.code;
        throw error;
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      // Network error
      const networkError = new Error('Error de conexión con el servidor');
      networkError.status = 0;
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }
  }

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  // Dashboard
  getDashboardSummary(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/dashboard/summary${query ? `?${query}` : ''}`);
  }

  getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Transactions
  getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }

  getTransaction(id) {
    return this.request(`/transactions/${id}`);
  }

  createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteTransaction(id) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiService();
