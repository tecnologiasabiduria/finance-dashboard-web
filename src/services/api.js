// URL de la API desde variables de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

  forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
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

  // Goals
  getGoals() {
    return this.request('/goals');
  }

  getGoal(id) {
    return this.request(`/goals/${id}`);
  }

  createGoal(data) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateGoal(id, data) {
    return this.request(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteGoal(id) {
    return this.request(`/goals/${id}`, {
      method: 'DELETE',
    });
  }

  // Profile
  updateProfile(data) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  updatePassword(data) {
    return this.request('/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  completeOnboarding() {
    return this.request('/auth/onboarding', {
      method: 'PUT',
    });
  }

  // Categories
  getCategories() {
    return this.request('/categories');
  }

  createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  initCategories() {
    return this.request('/categories/init', {
      method: 'POST',
    });
  }

  // Subcategories
  getSubcategories(categoryId) {
    const query = categoryId ? `?category_id=${categoryId}` : '';
    return this.request(`/subcategories${query}`);
  }

  createSubcategory(data) {
    return this.request('/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateSubcategory(id, data) {
    return this.request(`/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteSubcategory(id) {
    return this.request(`/subcategories/${id}`, {
      method: 'DELETE',
    });
  }

  // Notifications
  getNotifications(limit = 50) {
    return this.request(`/notifications?limit=${limit}`);
  }

  getUnreadNotificationCount() {
    return this.request('/notifications/unread-count');
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'PUT',
    });
  }

  // Budget (Presupuesto por Bolsillo)
  getBudgetConfig(year) {
    return this.request(`/budget/config?year=${year}`);
  }

  saveBudgetConfig(data) {
    return this.request('/budget/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  getBudgetPockets() {
    return this.request('/budget/pockets');
  }

  createBudgetPocket(data) {
    return this.request('/budget/pockets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateBudgetPocket(id, data) {
    return this.request(`/budget/pockets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteBudgetPocket(id) {
    return this.request(`/budget/pockets/${id}`, {
      method: 'DELETE',
    });
  }

  saveBudgetPocketsBulk(pockets) {
    return this.request('/budget/pockets/bulk', {
      method: 'PUT',
      body: JSON.stringify({ pockets }),
    });
  }

  getBudgetOverview(year, month) {
    return this.request(`/budget/overview?year=${year}&month=${month}`);
  }
}

export const api = new ApiService();
