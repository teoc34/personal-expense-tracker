import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { transactionAPI, categoryAPI, type Transaction, type Category } from '../services/api';
import { formatCurrency, formatDate, getCurrentDateString } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  X,
  Calendar,
  Tag
} from 'lucide-react';

interface TransactionFormData {
  amount: number;
  description: string;
  category_id: number | '';
  type: 'income' | 'expense';
  date: string;
}

const Transactions: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery(
    ['transactions', filters, currentPage],
    () => transactionAPI.getAll({
      ...filters,
      page: currentPage,
      limit: 20
    }).then(res => res.data),
    {
      keepPreviousData: true
    }
  );

  // Fetch categories for dropdown
  const { data: categories } = useQuery<Category[]>(
    'categories',
    () => categoryAPI.getAll().then(res => res.data)
  );

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<TransactionFormData>({
    defaultValues: {
      date: getCurrentDateString(),
      type: 'expense'
    }
  });

  // Create transaction mutation
  const createMutation = useMutation(transactionAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('transactions');
      queryClient.invalidateQueries('dashboard');
      setIsModalOpen(false);
      reset();
      toast.success('Transaction created successfully');
    },
    onError: () => {
      toast.error('Failed to create transaction');
    }
  });

  // Update transaction mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Transaction> }) => 
      transactionAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('transactions');
        queryClient.invalidateQueries('dashboard');
        setIsModalOpen(false);
        setEditingTransaction(null);
        reset();
        toast.success('Transaction updated successfully');
      },
      onError: () => {
        toast.error('Failed to update transaction');
      }
    }
  );

  // Delete transaction mutation
  const deleteMutation = useMutation(transactionAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('transactions');
      queryClient.invalidateQueries('dashboard');
      toast.success('Transaction deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete transaction');
    }
  });

  const onSubmit = (data: TransactionFormData) => {
    const transactionData = {
      ...data,
      amount: Number(data.amount),
      category_id: data.category_id === '' ? null : Number(data.category_id)
    };

    if (editingTransaction) {
      updateMutation.mutate({ 
        id: editingTransaction.id, 
        data: transactionData 
      });
    } else {
      createMutation.mutate(transactionData as any);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    reset({
      amount: transaction.amount,
      description: transaction.description,
      category_id: transaction.category_id || '',
      type: transaction.type,
      date: transaction.date
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteMutation.mutate(id);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      type: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const transactions = transactionsData?.transactions || [];
  const pagination = transactionsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your income and expenses
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTransaction(null);
            reset({ date: getCurrentDateString(), type: 'expense' });
            setIsModalOpen(true);
          }}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input pl-10"
            />
          </div>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="input"
          >
            <option value="">All Categories</option>
            {categories?.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="input"
          >
            <option value="">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <input
            type="date"
            placeholder="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="input"
          />

          <input
            type="date"
            placeholder="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="input"
          />
        </div>

        {(filters.search || filters.category || filters.type || filters.startDate || filters.endDate) && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Filters active
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="card">
        {transactionsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="spinner"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first transaction.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setEditingTransaction(null);
                  reset({ date: getCurrentDateString(), type: 'expense' });
                  setIsModalOpen(true);
                }}
                className="btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'income' ? 'bg-success-100' : 'bg-error-100'
                          }`}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-4 w-4 text-success-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-error-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.category_name ? (
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: transaction.category_color }}
                            />
                            <span className="text-sm text-gray-900">
                              {transaction.category_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          transaction.type === 'income' ? 'text-success-600' : 'text-error-600'
                        }`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount, 'USD', false)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={currentPage === pagination.pages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">
                        {((currentPage - 1) * pagination.limit) + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pagination.limit, pagination.total)}
                      </span>{' '}
                      of{' '}
                      <span className="font-medium">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="btn-secondary disabled:opacity-50 rounded-l-md"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                        disabled={currentPage === pagination.pages}
                        className="btn-secondary disabled:opacity-50 rounded-r-md"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingTransaction(null);
                        reset();
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        {...register('description', { required: 'Description is required' })}
                        type="text"
                        className="input mt-1"
                        placeholder="Enter transaction description"
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Amount
                      </label>
                      <input
                        {...register('amount', { 
                          required: 'Amount is required',
                          min: { value: 0.01, message: 'Amount must be positive' }
                        })}
                        type="number"
                        step="0.01"
                        min="0"
                        className="input mt-1"
                        placeholder="0.00"
                      />
                      {errors.amount && (
                        <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select {...register('type')} className="input mt-1">
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select {...register('category_id')} className="input mt-1">
                        <option value="">Select a category</option>
                        {categories?.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Date
                      </label>
                      <input
                        {...register('date', { required: 'Date is required' })}
                        type="date"
                        className="input mt-1"
                      />
                      {errors.date && (
                        <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting || createMutation.isLoading || updateMutation.isLoading}
                    className="btn-primary w-full sm:ml-3 sm:w-auto"
                  >
                    {isSubmitting || createMutation.isLoading || updateMutation.isLoading ? (
                      <div className="spinner mr-2" />
                    ) : null}
                    {editingTransaction ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingTransaction(null);
                      reset();
                    }}
                    className="btn-secondary mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;