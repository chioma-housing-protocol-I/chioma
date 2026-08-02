'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedTypes?: string;
  multiple?: boolean;
  className?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSize = 50 * 1024 * 1024, // 50MB default
  acceptedTypes = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp',
  multiple = true,
  className = '',
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (file: File) => {
    const type = file.type.toLowerCase();
    if (type.includes('pdf')) {
      return <FileText className="w-6 h-6 text-red-500" />;
    }
    if (type.includes('image')) {
      return <ImageIcon className="w-6 h-6 text-blue-500" />;
    }
    return <File className="w-6 h-6 text-neutral-500" />;
  };

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (file.size > maxSize) {
          errors.push(
            `${file.name} exceeds maximum size of ${formatFileSize(maxSize)}`,
          );
          continue;
        }
        validFiles.push(file);
      }

      if (errors.length > 0) {
        console.error('File validation errors:', errors);
      }

      return validFiles.slice(0, maxFiles - selectedFiles.length);
    },
    [maxSize, maxFiles, selectedFiles.length],
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const fileArray = Array.from(files);
      const validFiles = validateFiles(fileArray);

      if (validFiles.length > 0) {
        const newFiles = [...selectedFiles, ...validFiles].slice(0, maxFiles);
        setSelectedFiles(newFiles);
        onFilesSelected(newFiles);
      }
    },
    [selectedFiles, maxFiles, validateFiles, onFilesSelected],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const clearAll = () => {
    setSelectedFiles([]);
    onFilesSelected([]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : selectedFiles.length > 0
              ? 'border-green-300 bg-green-50'
              : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleInputChange}
          className="hidden"
          accept={acceptedTypes}
          multiple={multiple}
        />

        {selectedFiles.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Upload className="w-8 h-8 text-green-500" />
              <span className="text-lg font-semibold text-neutral-900">
                {selectedFiles.length} file
                {selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <p className="text-sm text-neutral-500">
              Click or drag to add more files (max {maxFiles})
            </p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm text-neutral-600 mb-1">
              Click or drag files here to upload
            </p>
            <p className="text-xs text-neutral-400">
              PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, PNG, GIF, WebP (max{' '}
              {formatFileSize(maxSize)})
            </p>
          </>
        )}
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-700">
              Selected Files ({selectedFiles.length}/{maxFiles})
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {formatFileSize(file.size)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
