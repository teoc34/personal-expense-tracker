import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { goalAPI, categoryAPI, type Goal, type Category } from '../services/api';
import { formatCurrency, formatDate, formatPercentage, getGoalStatusColor, getCurrentDateString } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  Play,
  Pause,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface GoalFormData {
  title: string;
  target_amount: number;
  current_amount: number;
  category_id: number | '';
  target_date: string;
  status: 'active' | 'completed' | 'paused';
}

const Goals: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [progressModalGoal, setProgressModalGoal] = useState<Goal | null>(null);
  const [progressAmount, setProgressAmount] = useState<number>(0);

  const queryClient = useQueryClient();

  // Fetch goals
  const { data: goals, isLoading } = useQuery<Goal[]>(
    'goals',
    () => goalAPI.getAll().then(res => res.data)
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
  } = useForm<GoalFormData>({
    defaultValues: {
      status: 'active',
      current_amount: 0
    }
  });

  // Create goal mutation
  const createMutation = useMutation(goalAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('goals');
      queryClient.invalidateQueries('dashboard');
      setIsModalOpen(false);
      reset();
      toast.success('Goal created successfully');
    },
    onError: () => {
      toast.error('Failed to create goal');
    }
  });

  // Update goal mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Goal> }) => 
      goalAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('goals');
        queryClient.invalidateQueries('dashboard');
        setIsModalOpen(false);
        setEditingGoal(null);
        reset();
        toast.success('Goal updated successfully');
      },
      onError: () => {
        toast.error('Failed to update goal');
      }
    }
  );

  // Update progress mutation
  const updateProgressMutation = useMutation(
    ({ id, amount }: { id: number; amount: number }) =>
      goalAPI.updateProgress(id, amount),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('goals');
        queryClient.invalidateQueries('dashboard');
        setProgressModalGoal(null);
        setProgressAmount(0);
        toast.success('Goal progress updated successfully');
      },
      onError: () => {
        toast.error('Failed to update goal progress');
      }
    }
  );

  // Delete goal mutation
  const deleteMutation = useMutation(goalAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('goals');
      queryClient.invalidateQueries('dashboard');
      toast.success('Goal deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete goal');
    }
  });

  const onSubmit = (data: GoalFormData) => {
    const goalData = {
      ...data,
      target_amount: Number(data.target_amount),
      current_amount: Number(data.current_amount),
      category_id: data.category_id === '' ? null : Number(data.category_id)
    };

    if (editingGoal) {
      updateMutation.mutate({ 
        id: editingGoal.id, 
        data: goalData 
      });
    } else {
      createMutation.mutate(goalData as any);
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    reset({
      title: goal.title,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      category_id: goal.category_id || '',
      target_date: goal.target_date || '',
      status: goal.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleProgressUpdate = (goal: Goal) => {
    setProgressModalGoal(goal);
    setProgressAmount(0);
  };

  const handleSubmitProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (progressModalGoal && progressAmount !== 0) {
      updateProgressMutation.mutate({
        id: progressModalGoal.id,
        amount: progressAmount
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'active':
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Goals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set and track your financial goals
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            reset({ status: 'active', current_amount: 0 });
            setIsModalOpen(true);
          }}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </button>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {goals?.map((goal) => (
          <div key={goal.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {goal.title}
                </h3>
                {goal.category_name && (
                  <div className="flex items-center mt-1">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: goal.category_color }}
                    />
                    <span className="text-sm text-gray-500">
                      {goal.category_name}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(goal)}
                  className="text-gray-400 hover:text-primary-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{formatCurrency(goal.current_amount)}</span>
                <span>{formatCurrency(goal.target_amount)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    goal.progress_percentage >= 100
                      ? 'bg-success-500'
                      : goal.progress_percentage >= 75
                      ? 'bg-primary-500'
                      : goal.progress_percentage >= 50
                      ? 'bg-warning-500'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${Math.min(goal.progress_percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-900">
                  {formatPercentage(goal.progress_percentage)}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGoalStatusColor(goal.status)}`}>
                  {getStatusIcon(goal.status)}
                  <span className="ml-1 capitalize">{goal.status}</span>
                </span>
              </div>
            </div>

            {/* Goal Details */}
            <div className="space-y-2 text-sm text-gray-600">
              {goal.target_date && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Target: {formatDate(goal.target_date)}</span>
                </div>
              )}
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                <span>
                  Remaining: {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}
                </span>
              </div>
            </div>

            {/* Actions */}
            {goal.status !== 'completed' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleProgressUpdate(goal)}
                  className="w-full btn-primary text-sm"
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Update Progress
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Empty State */}
        {goals && goals.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No goals</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first financial goal.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setEditingGoal(null);
                    reset({ status: 'active', current_amount: 0 });
                    setIsModalOpen(true);
                  }}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingGoal ? 'Edit Goal' : 'Add Goal'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingGoal(null);
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
                        Goal Title
                      </label>
                      <input
                        {...register('title', { required: 'Goal title is required' })}
                        type="text"
                        className="input mt-1"
                        placeholder="Enter goal title"
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Target Amount
                        </label>
                        <input
                          {...register('target_amount', { 
                            required: 'Target amount is required',
                            min: { value: 0.01, message: 'Target amount must be positive' }
                          })}
                          type="number"
                          step="0.01"
                          min="0"
                          className="input mt-1"
                          placeholder="0.00"
                        />
                        {errors.target_amount && (
                          <p className="mt-1 text-sm text-red-600">{errors.target_amount.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Current Amount
                        </label>
                        <input
                          {...register('current_amount', { 
                            min: { value: 0, message: 'Current amount cannot be negative' }
                          })}
                          type="number"
                          step="0.01"
                          min="0"
                          className="input mt-1"
                          placeholder="0.00"
                        />
                        {errors.current_amount && (
                          <p className="mt-1 text-sm text-red-600">{errors.current_amount.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Category (Optional)
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
                        Target Date (Optional)
                      </label>
                      <input
                        {...register('target_date')}
                        type="date"
                        className="input mt-1"
                        min={getCurrentDateString()}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select {...register('status')} className="input mt-1">
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="completed">Completed</option>
                      </select>
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
                    {editingGoal ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingGoal(null);
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

      {/* Progress Update Modal */}
      {progressModalGoal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmitProgress}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Update Progress: {progressModalGoal.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setProgressModalGoal(null);
                        setProgressAmount(0);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <p>Current Amount: {formatCurrency(progressModalGoal.current_amount)}</p>
                        <p>Target Amount: {formatCurrency(progressModalGoal.target_amount)}</p>
                        <p>Progress: {formatPercentage(progressModalGoal.progress_percentage)}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Amount to Add/Subtract
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={progressAmount || ''}
                        onChange={(e) => setProgressAmount(Number(e.target.value))}
                        className="input mt-1"
                        placeholder="Enter positive or negative amount"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter a positive number to add progress, negative to subtract
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={progressAmount === 0 || updateProgressMutation.isLoading}
                    className="btn-primary w-full sm:ml-3 sm:w-auto"
                  >
                    {updateProgressMutation.isLoading ? (
                      <div className="spinner mr-2" />
                    ) : null}
                    Update Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgressModalGoal(null);
                      setProgressAmount(0);
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

export default Goals;