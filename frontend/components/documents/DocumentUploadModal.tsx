'use client';

import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Uploader } from '@/components/ui/Uploader';
import type { DocumentMetadata, DocumentCategory } from './types';
import toast from 'react-hot-toast';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], metadata: DocumentMetadata) => Promise<void>;
  allowedTypes?: string;
  maxFiles?: number;
  title?: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  allowedTypes = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt',
  maxFiles = 10,
  title = 'Upload Documents',
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [description, setDescription] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  if (!isOpen) return null;

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const metadata: DocumentMetadata = {
        category,
        description: description.trim() || undefined,
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(selectedFiles, metadata);

      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success(
        `Successfully uploaded ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`,
      );

      // Reset form
      setTimeout(() => {
        setSelectedFiles([]);
        setCategory('other');
        setDescription('');
        setUploadProgress(0);
        onClose();
      }, 500);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload documents',
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) {
      toast.error('Please wait for the upload to complete');
      return;
    }
    setSelectedFiles([]);
    setCategory('other');
    setDescription('');
    setUploadProgress(0);
    onClose();
  };

  const categories: { value: DocumentCategory; label: string }[] = [
    { value: 'lease', label: 'Lease Agreement' },
    { value: 'identity', label: 'Identity Document' },
    { value: 'payment', label: 'Payment Receipt' },
    { value: 'maintenance', label: 'Maintenance Record' },
    { value: 'inspection', label: 'Inspection Report' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-neutral-50 dark:bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
              <Upload className="text-brand-blue" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Upload and organize your documents
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Uploader */}
          <Uploader
            label="Select Files"
            accept={allowedTypes}
            multiple={true}
            onFilesSelected={handleFilesSelected}
            maxFiles={maxFiles}
            description="Drag and drop files here or click to browse"
          />

          {/* Category Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Document Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={isUploading}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isUploading}
              placeholder="Add a brief description of the document(s)..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-neutral-500 text-right">
              {description.length}/500
            </p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Uploading...
                </span>
                <span className="font-bold text-brand-blue">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-blue transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
            <AlertCircle
              size={20}
              className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"
            />
            <div className="text-sm text-blue-900 dark:text-blue-100">
              <p className="font-semibold mb-1">Supported file types:</p>
              <p className="text-blue-700 dark:text-blue-300">
                Images (JPG, PNG, GIF), PDF, Word documents, Excel spreadsheets,
                and text files. Maximum file size: 50MB per file.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-white/5 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            {selectedFiles.length > 0 && (
              <>
                <CheckCircle2 size={16} className="text-green-500" />
                <span>
                  {selectedFiles.length} file
                  {selectedFiles.length > 1 ? 's' : ''} selected
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Upload{' '}
                  {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
