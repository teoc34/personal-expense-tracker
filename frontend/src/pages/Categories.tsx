import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { categoryAPI, type Category } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Tag,
  Palette,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface CategoryFormData {
  name: string;
  color: string;
  icon: string;
}

const Categories: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading } = useQuery<Category[]>(
    'categories',
    () => categoryAPI.getAll().then(res => res.data)
  );

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<CategoryFormData>({
    defaultValues: {
      color: '#3B82F6',
      icon: 'folder'
    }
  });

  const watchedColor = watch('color');

  // Create category mutation
  const createMutation = useMutation(categoryAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('categories');
      queryClient.invalidateQueries('transactions');
      queryClient.invalidateQueries('dashboard');
      setIsModalOpen(false);
      reset();
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to create category';
      toast.error(message);
    }
  });

  // Update category mutation
  const updateMutation = useMutation(
    ({ id, data }: { id: number; data: Partial<Category> }) => 
      categoryAPI.update(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('categories');
        queryClient.invalidateQueries('transactions');
        queryClient.invalidateQueries('dashboard');
        setIsModalOpen(false);
        setEditingCategory(null);
        reset();
        toast.success('Category updated successfully');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to update category';
        toast.error(message);
      }
    }
  );

  // Delete category mutation
  const deleteMutation = useMutation(categoryAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries('categories');
      queryClient.invalidateQueries('transactions');
      queryClient.invalidateQueries('dashboard');
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to delete category';
      toast.error(message);
    }
  });

  const onSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateMutation.mutate({ 
        id: editingCategory.id, 
        data 
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      color: category.color,
      icon: category.icon
    });
    setIsModalOpen(true);
  };

  const handleDelete = (category: Category) => {
    if (category.transaction_count && category.transaction_count > 0) {
      toast.error('Cannot delete category with existing transactions');
      return;
    }

    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteMutation.mutate(category.id);
    }
  };

  const predefinedColors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#F97316', '#84CC16', '#06B6D4', '#6366F1',
    '#EF4444', '#F59E0B'
  ];

  const iconOptions = [
    { value: 'folder', label: '📁' },
    { value: 'utensils', label: '🍽️' },
    { value: 'car', label: '🚗' },
    { value: 'shopping-bag', label: '🛍️' },
    { value: 'film', label: '🎬' },
    { value: 'receipt', label: '🧾' },
    { value: 'heart', label: '❤️' },
    { value: 'trending-up', label: '📈' },
    { value: 'home', label: '🏠' },
    { value: 'plane', label: '✈️' },
    { value: 'book', label: '📚' },
    { value: 'gamepad', label: '🎮' }
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your transactions with custom categories
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            reset({ color: '#3B82F6', icon: 'folder' });
            setIsModalOpen(true);
          }}
          className="btn-primary mt-4 sm:mt-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <div key={category.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <div
                  className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  <div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {category.transaction_count || 0} transactions
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="text-gray-400 hover:text-primary-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="text-gray-400 hover:text-red-600"
                  disabled={!!(category.transaction_count && category.transaction_count > 0)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Category Stats */}
            <div className="mt-4 space-y-2">
              {category.total_expenses && category.total_expenses > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center">
                    <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                    Total Expenses
                  </span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(category.total_expenses)}
                  </span>
                </div>
              )}
              {category.total_income && category.total_income > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                    Total Income
                  </span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(category.total_income)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {categories && categories.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-12">
              <Tag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No categories</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first category.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    reset({ color: '#3B82F6', icon: 'folder' });
                    setIsModalOpen(true);
                  }}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {editingCategory ? 'Edit Category' : 'Add Category'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingCategory(null);
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
                        Category Name
                      </label>
                      <input
                        {...register('name', { required: 'Category name is required' })}
                        type="text"
                        className="input mt-1"
                        placeholder="Enter category name"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          {...register('color')}
                          type="color"
                          className="h-10 w-16 rounded border border-gray-300"
                        />
                        <div
                          className="h-10 w-10 rounded-full border-2 border-gray-300"
                          style={{ backgroundColor: watchedColor }}
                        />
                      </div>
                      
                      {/* Predefined Colors */}
                      <div className="mt-3 grid grid-cols-6 gap-2">
                        {predefinedColors.map((color, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => reset(prev => ({ ...prev, color }))}
                            className="h-8 w-8 rounded-full border-2 border-gray-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Icon
                      </label>
                      <select {...register('icon')} className="input mt-1">
                        {iconOptions.map(icon => (
                          <option key={icon.value} value={icon.value}>
                            {icon.label} {icon.value}
                          </option>
                        ))}
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
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingCategory(null);
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

export default Categories;