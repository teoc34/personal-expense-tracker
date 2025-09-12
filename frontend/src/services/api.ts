import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Transaction {
  id: number;
  amount: number;
  description: string;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  type: 'income' | 'expense';
  date: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  transaction_count?: number;
  total_expenses?: number;
  total_income?: number;
  created_at: string;
}

export interface Goal {
  id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  target_date: string | null;
  status: 'active' | 'completed' | 'paused';
  progress_percentage: number;
  created_at: string;
}

export interface DashboardData {
  summary: {
    total_income: number;
    total_expenses: number;
    net_income: number;
    total_transactions: number;
    savings_rate: number;
  };
  comparison: {
    current_month: { income: number; expenses: number };
    previous_month: { income: number; expenses: number };
    income_change: number;
    expense_change: number;
  };
  category_spending: Array<{
    name: string;
    color: string;
    icon: string;
    total_amount: number;
    transaction_count: number;
  }>;
  recent_transactions: Transaction[];
  daily_trend: Array<{
    date: string;
    income: number;
    expenses: number;
  }>;
  goals_summary: {
    total_goals: number;
    active_goals: number;
    completed_goals: number;
    avg_progress: number;
  };
  period: string;
}

// Transaction API
export const transactionAPI = {
  getAll: (params?: {
    category?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    return api.get<{
      transactions: Transaction[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>('/transactions', { params });
  },

  getById: (id: number) => {
    return api.get<Transaction>(`/transactions/${id}`);
  },

  create: (transaction: Omit<Transaction, 'id' | 'created_at'>) => {
    return api.post<Transaction>('/transactions', transaction);
  },

  update: (id: number, transaction: Partial<Transaction>) => {
    return api.put<Transaction>(`/transactions/${id}`, transaction);
  },

  delete: (id: number) => {
    return api.delete(`/transactions/${id}`);
  },
};

// Category API
export const categoryAPI = {
  getAll: () => {
    return api.get<Category[]>('/categories');
  },

  getById: (id: number) => {
    return api.get<Category>(`/categories/${id}`);
  },

  create: (category: Omit<Category, 'id' | 'created_at'>) => {
    return api.post<Category>('/categories', category);
  },

  update: (id: number, category: Partial<Category>) => {
    return api.put<Category>(`/categories/${id}`, category);
  },

  delete: (id: number) => {
    return api.delete(`/categories/${id}`);
  },
};

// Goal API
export const goalAPI = {
  getAll: () => {
    return api.get<Goal[]>('/goals');
  },

  getById: (id: number) => {
    return api.get<Goal>(`/goals/${id}`);
  },

  create: (goal: Omit<Goal, 'id' | 'created_at' | 'progress_percentage'>) => {
    return api.post<Goal>('/goals', goal);
  },

  update: (id: number, goal: Partial<Goal>) => {
    return api.put<Goal>(`/goals/${id}`, goal);
  },

  updateProgress: (id: number, amount: number) => {
    return api.patch<Goal>(`/goals/${id}/progress`, { amount });
  },

  delete: (id: number) => {
    return api.delete(`/goals/${id}`);
  },
};

// Dashboard API
export const dashboardAPI = {
  getData: (period: 'week' | 'month' | 'year' | 'all' = 'month') => {
    return api.get<DashboardData>('/dashboard', { params: { period } });
  },

  getAnalytics: (params?: {
    category?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return api.get('/dashboard/analytics', { params });
  },
};

// Upload API
export const uploadAPI = {
  uploadCSV: (file: File, autoCategorize: boolean = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_categorize', autoCategorize.toString());

    return api.post('/upload/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  validateCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post('/upload/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getUploadHistory: () => {
    return api.get('/upload/history');
  },
};

// Health check
export const healthAPI = {
  check: () => {
    return api.get('/health');
  },
};

export default api;