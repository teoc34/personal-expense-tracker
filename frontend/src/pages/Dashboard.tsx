import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { dashboardAPI, type DashboardData } from '../services/api';
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  const { data, isLoading, error } = useQuery<DashboardData>(
    ['dashboard', period],
    () => dashboardAPI.getData(period).then(res => res.data),
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600">Failed to load dashboard data</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, comparison, category_spending, recent_transactions, daily_trend, goals_summary } = data;

  const periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' }
  ];

  // Prepare chart data
  const chartData = daily_trend.map(item => ({
    date: formatDate(item.date, 'MMM dd'),
    income: item.income,
    expenses: item.expenses,
    net: item.income - item.expenses
  }));

  const pieData = category_spending.slice(0, 6).map((category, index) => ({
    name: category.name,
    value: category.total_amount,
    color: category.color || `hsl(${index * 60}, 70%, 60%)`
  }));

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your financial activity
          </p>
        </div>
        
        {/* Period selector */}
        <div className="mt-4 sm:mt-0">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="input w-full sm:w-auto"
          >
            {periodOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-success-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Income
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {formatCurrency(summary.total_income)}
                </dd>
              </dl>
            </div>
          </div>
          {comparison.income_change !== 0 && (
            <div className="mt-4 flex items-center text-sm">
              {comparison.income_change > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-success-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-error-600" />
              )}
              <span className={`ml-1 ${comparison.income_change > 0 ? 'text-success-600' : 'text-error-600'}`}>
                {formatPercentage(Math.abs(comparison.income_change))} vs last month
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingDown className="h-8 w-8 text-error-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Expenses
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {formatCurrency(summary.total_expenses)}
                </dd>
              </dl>
            </div>
          </div>
          {comparison.expense_change !== 0 && (
            <div className="mt-4 flex items-center text-sm">
              {comparison.expense_change > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-error-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-success-600" />
              )}
              <span className={`ml-1 ${comparison.expense_change > 0 ? 'text-error-600' : 'text-success-600'}`}>
                {formatPercentage(Math.abs(comparison.expense_change))} vs last month
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Net Income
                </dt>
                <dd className={`text-lg font-semibold ${summary.net_income >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                  {formatCurrency(summary.net_income)}
                </dd>
              </dl>
            </div>
          </div>
          <div className="mt-4">
            <span className="text-sm text-gray-500">
              Savings Rate: {formatPercentage(summary.savings_rate)}
            </span>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-primary-600" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Transactions
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {summary.total_transactions}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spending Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrency(value, 'USD', false)} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name.charAt(0).toUpperCase() + name.slice(1)
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ fill: '#EF4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Spending Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spending by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  dataKey="value"
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions and Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Transactions</h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {recent_transactions.slice(0, 5).map((transaction) => (
                <li key={transaction.id} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-success-100' : 'bg-error-100'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="h-4 w-4 text-success-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-error-600" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.category_name || 'Uncategorized'} • {formatDate(transaction.date)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`text-sm font-medium ${
                        transaction.type === 'income' ? 'text-success-600' : 'text-error-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, 'USD', false)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Goals Summary */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Goals Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Goals</span>
              <span className="text-sm font-medium">{goals_summary.total_goals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Active Goals</span>
              <span className="text-sm font-medium">{goals_summary.active_goals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Completed Goals</span>
              <span className="text-sm font-medium text-success-600">{goals_summary.completed_goals}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Average Progress</span>
              <span className="text-sm font-medium">{formatPercentage(goals_summary.avg_progress)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;