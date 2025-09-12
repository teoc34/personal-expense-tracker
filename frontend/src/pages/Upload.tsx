import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { uploadAPI } from '../services/api';
import { formatCurrency, formatDate, formatFileSize } from '../utils/formatters';
import { toast } from 'react-hot-toast';
import {
  Upload as UploadIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Eye,
  RefreshCw
} from 'lucide-react';

interface UploadResult {
  success: boolean;
  processed_count: number;
  error_count: number;
  transactions: any[];
  errors: any[];
}

interface ValidationResult {
  valid: boolean;
  preview: any[];
  total_count: number;
  columns_detected: string[];
  error?: string;
}

const Upload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation(
    ({ file, autoCategorize }: { file: File; autoCategorize: boolean }) =>
      uploadAPI.uploadCSV(file, autoCategorize),
    {
      onSuccess: (response) => {
        setUploadResult(response.data);
        setCurrentStep('result');
        queryClient.invalidateQueries('transactions');
        queryClient.invalidateQueries('dashboard');
        queryClient.invalidateQueries('categories');
        
        const { processed_count, error_count } = response.data;
        if (error_count === 0) {
          toast.success(`Successfully imported ${processed_count} transactions`);
        } else if (processed_count > 0) {
          toast.success(`Imported ${processed_count} transactions with ${error_count} errors`);
        } else {
          toast.error('No transactions were imported');
        }
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to upload file';
        toast.error(message);
      }
    }
  );

  // Validation mutation
  const validateMutation = useMutation(
    (file: File) => uploadAPI.validateCSV(file),
    {
      onSuccess: (response) => {
        setValidationResult(response.data);
        setCurrentStep('preview');
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Failed to validate file';
        toast.error(message);
        setValidationResult({ valid: false, preview: [], total_count: 0, columns_detected: [], error: message });
        setCurrentStep('preview');
      }
    }
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.includes('csv') && !file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setUploadResult(null);
    setValidationResult(null);
    setCurrentStep('upload');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleValidate = () => {
    if (selectedFile) {
      validateMutation.mutate(selectedFile);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate({ file: selectedFile, autoCategorize });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setValidationResult(null);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* File Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : selectedFile
            ? 'border-success-500 bg-success-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <UploadIcon className={`mx-auto h-12 w-12 ${
            selectedFile ? 'text-success-400' : 'text-gray-400'
          }`} />
          <div className="mt-4">
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-success-700">
                  File selected: {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            ) : (
              <div>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Drop your CSV file here, or{' '}
                    <span className="text-primary-600 hover:text-primary-500">browse</span>
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  CSV files up to 5MB are supported
                </p>
              </div>
            )}
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          id="file-upload"
          name="file-upload"
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Upload Options */}
      {selectedFile && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Options</h3>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auto-categorize"
                  type="checkbox"
                  checked={autoCategorize}
                  onChange={(e) => setAutoCategorize(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="auto-categorize" className="font-medium text-gray-700">
                  Auto-categorize transactions
                </label>
                <p className="text-gray-500">
                  Automatically assign categories to transactions based on their descriptions
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleValidate}
              disabled={validateMutation.isLoading}
              className="btn-secondary"
            >
              {validateMutation.isLoading ? (
                <div className="spinner mr-2" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview
            </button>
            
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isLoading}
              className="btn-primary"
            >
              {uploadMutation.isLoading ? (
                <div className="spinner mr-2" />
              ) : (
                <UploadIcon className="h-4 w-4 mr-2" />
              )}
              Upload
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Format Guide</h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <p>Your CSV file should contain the following columns (column names are flexible):</p>
          
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><strong>Amount:</strong> Transaction amount (positive or negative)</li>
            <li><strong>Description:</strong> Transaction description or memo</li>
            <li><strong>Date:</strong> Transaction date (various formats supported)</li>
            <li><strong>Category:</strong> Transaction category (optional)</li>
          </ul>

          <div className="mt-4 bg-gray-50 p-3 rounded">
            <p className="font-medium text-gray-700 mb-2">Example CSV format:</p>
            <pre className="text-xs text-gray-600">
Date,Description,Amount,Category{'\n'}
2024-01-15,Grocery Store,-45.67,Food{'\n'}
2024-01-16,Salary Deposit,2500.00,Income{'\n'}
2024-01-17,Gas Station,-32.10,Transportation
            </pre>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
        <button onClick={handleReset} className="btn-secondary">
          <X className="h-4 w-4 mr-2" />
          Cancel
        </button>
      </div>

      {validationResult && (
        <div className="card">
          {validationResult.valid ? (
            <div className="flex items-center text-success-700">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">File validation successful</span>
            </div>
          ) : (
            <div className="flex items-center text-error-700">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="font-medium">File validation failed</span>
            </div>
          )}
          
          {validationResult.valid && (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total transactions:</span>
                <span className="ml-2 font-medium">{validationResult.total_count}</span>
              </div>
              <div>
                <span className="text-gray-500">Columns detected:</span>
                <span className="ml-2 font-medium">{validationResult.columns_detected.length}</span>
              </div>
            </div>
          )}

          {validationResult.error && (
            <div className="mt-4 text-sm text-error-600">
              <p>{validationResult.error}</p>
            </div>
          )}
        </div>
      )}

      {validationResult?.valid && validationResult.preview.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Transaction Preview (First 5 rows)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {validationResult.preview.map((transaction, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'income' 
                          ? 'bg-success-100 text-success-800'
                          : 'bg-error-100 text-error-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button onClick={handleReset} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadMutation.isLoading}
              className="btn-primary"
            >
              {uploadMutation.isLoading ? (
                <div className="spinner mr-2" />
              ) : (
                <UploadIcon className="h-4 w-4 mr-2" />
              )}
              Proceed with Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderResultStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Upload Results</h2>
        <button onClick={handleReset} className="btn-primary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Upload Another File
        </button>
      </div>

      {uploadResult && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="card text-center">
              <div className="text-2xl font-bold text-success-600">
                {uploadResult.processed_count}
              </div>
              <div className="text-sm text-gray-500">Successfully Imported</div>
            </div>
            
            <div className="card text-center">
              <div className="text-2xl font-bold text-error-600">
                {uploadResult.error_count}
              </div>
              <div className="text-sm text-gray-500">Errors</div>
            </div>
            
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-600">
                {uploadResult.processed_count + uploadResult.error_count}
              </div>
              <div className="text-sm text-gray-500">Total Processed</div>
            </div>
          </div>

          {/* Errors */}
          {uploadResult.errors.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Errors ({uploadResult.errors.length})
              </h3>
              
              <div className="space-y-3">
                {uploadResult.errors.slice(0, 10).map((error, index) => (
                  <div key={index} className="bg-error-50 border border-error-200 rounded-md p-3">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-error-400 mt-0.5" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-error-800">
                          Row {error.row}: {error.error}
                        </p>
                        {error.transaction && (
                          <p className="text-sm text-error-600 mt-1">
                            {error.transaction.description} - {formatCurrency(error.transaction.amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {uploadResult.errors.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... and {uploadResult.errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Successfully Imported Transactions */}
          {uploadResult.transactions.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Successfully Imported ({Math.min(uploadResult.transactions.length, 10)} of {uploadResult.transactions.length} shown)
              </h3>
              
              <div className="overflow-x-auto">
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
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadResult.transactions.slice(0, 10).map((transaction, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.category_name ? (
                            <div className="flex items-center">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: transaction.category_color }}
                              />
                              {transaction.category_name}
                            </div>
                          ) : (
                            <span className="text-gray-400">Uncategorized</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-medium ${
                            transaction.type === 'income' ? 'text-success-600' : 'text-error-600'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount, 'USD', false)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Transactions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Import your transactions from a CSV file
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-8">
        <div className={`flex items-center ${currentStep === 'upload' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'upload' ? 'bg-primary-100' : 'bg-gray-100'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm font-medium">Upload</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300"></div>
        
        <div className={`flex items-center ${currentStep === 'preview' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'preview' ? 'bg-primary-100' : 'bg-gray-100'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm font-medium">Preview</span>
        </div>
        
        <div className="flex-1 h-px bg-gray-300"></div>
        
        <div className={`flex items-center ${currentStep === 'result' ? 'text-primary-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'result' ? 'bg-primary-100' : 'bg-gray-100'
          }`}>
            3
          </div>
          <span className="ml-2 text-sm font-medium">Results</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'preview' && renderPreviewStep()}
      {currentStep === 'result' && renderResultStep()}
    </div>
  );
};

export default Upload;