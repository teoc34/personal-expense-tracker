import React from 'react';
import { useQuery } from 'react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';

export default function Dashboard() {
  const { data: overview, isLoading } = useQuery(
    'dashboard-overview',
    () => api.get('/dashboard/overview').then(res => res.data),
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your financial health</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(new Date())}</span>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(overview?.transactions.total_income || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-danger-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(overview?.transactions.total_expenses || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Net Amount</p>
              <p className={`text-2xl font-semibold ${
                (overview?.transactions.net_amount || 0) >= 0 ? 'text-success-600' : 'text-danger-600'
              }`}>
                {formatCurrency(overview?.transactions.net_amount || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Goals</p>
              <p className="text-2xl font-semibold text-gray-900">
                {overview?.goals.active_goals || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Welcome to BudgetTracker!</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Your Personal Budget Management application is ready to help you track expenses, manage categories, and achieve your financial goals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-50 p-4 rounded-lg">
              <h3 className="font-medium text-primary-900 mb-2">📊 Upload Bank Extracts</h3>
              <p className="text-sm text-primary-700">
                Upload CSV, Excel, or PDF files to automatically categorize your transactions.
              </p>
            </div>
            <div className="bg-success-50 p-4 rounded-lg">
              <h3 className="font-medium text-success-900 mb-2">🎯 Set Savings Goals</h3>
              <p className="text-sm text-success-700">
                Create financial goals with automatic monthly contribution calculations.
              </p>
            </div>
            <div className="bg-warning-50 p-4 rounded-lg">
              <h3 className="font-medium text-warning-900 mb-2">📈 Track Progress</h3>
              <p className="text-sm text-warning-700">
                Monitor your financial health with comprehensive analytics and insights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


