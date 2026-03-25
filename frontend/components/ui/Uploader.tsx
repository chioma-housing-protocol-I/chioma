'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import {
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';

interface UploaderProps {
  label: string;
  accept?: string;
  multiple?: boolean;
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  description?: string;
}

export const Uploader: React.FC<UploaderProps> = ({
  label,
  accept = 'image/*,application/pdf',
  multiple = false,
  onFilesSelected,
  maxFiles = 5,
  description = 'Drag and drop or click to upload',
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      addFiles(newFiles);
    }
  };

  const addFiles = (files: File[]) => {
    let updatedFiles = multiple ? [...selectedFiles, ...files] : [files[0]];
    if (maxFiles && updatedFiles.length > maxFiles) {
      updatedFiles = updatedFiles.slice(0, maxFiles);
    }
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/'))
      return <ImageIcon size={20} className="text-blue-500" />;
    return <FileText size={20} className="text-gray-500" />;
  };

  return (
    <div className="space-y-4 w-full">
      <label className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        {label}
      </label>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center space-y-3
          ${
            isDragging
              ? 'border-brand-blue bg-brand-blue/5 scale-[0.99]'
              : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          multiple={multiple}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-brand-blue transition-colors">
          <Upload size={24} />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {description}
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            PNG, JPG or PDF up to 10MB
          </p>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 gap-2">
          {selectedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 shadow-sm"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                {getFileIcon(file)}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {file.name}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
