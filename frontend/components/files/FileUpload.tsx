import React, { useCallback, useState } from 'react';
import {
  Upload,
  X,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { storageApi } from '../../lib/api/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const FileUpload: React.FC<Props> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [files, setFiles] = useState<
    {
      file: File;
      status: 'idle' | 'uploading' | 'success' | 'error';
      progress: number;
      error?: string;
    }[]
  >([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f) => ({
        file: f,
        status: 'idle' as const,
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files).map((f) => ({
        file: f,
        status: 'idle' as const,
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    const updatedFiles = [...files];

    for (let i = 0; i < updatedFiles.length; i++) {
      if (updatedFiles[i].status === 'success') continue;

      try {
        updatedFiles[i].status = 'uploading';
        setFiles([...updatedFiles]);

        const { url, key } = await storageApi.getUploadUrl(
          updatedFiles[i].file.name,
          updatedFiles[i].file.size,
          updatedFiles[i].file.type || 'application/octet-stream',
        );

        await storageApi.uploadToS3(url, updatedFiles[i].file);

        updatedFiles[i].status = 'success';
        updatedFiles[i].progress = 100;
        setFiles([...updatedFiles]);
      } catch (error) {
        console.error('Upload failed:', error);
        updatedFiles[i].status = 'error';
        updatedFiles[i].error = 'Upload failed';
        setFiles([...updatedFiles]);
      }
    }

    if (updatedFiles.every((f) => f.status === 'success')) {
      setTimeout(() => {
        onUploadSuccess();
        onClose();
        setFiles([]);
      }, 1500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Upload size={20} className="text-brand-blue" />
            Upload Files
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center transition-all ${
              isDragging
                ? 'border-brand-blue bg-blue-50/50 dark:bg-blue-900/10'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50'
            }`}
          >
            <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-2xl flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-brand-blue" size={32} />
            </div>
            <p className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 font-medium">
              or{' '}
              <span className="text-brand-blue">browse from your computer</span>
            </p>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-8 space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {files.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center gap-4 animate-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-500">
                    <FileIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-neutral-900 dark:text-white truncate text-sm">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status === 'uploading' && (
                      <Loader2
                        size={20}
                        className="animate-spin text-brand-blue"
                      />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle2 size={20} className="text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <span title={item.error}>
                        <AlertCircle size={20} className="text-red-500" />
                      </span>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-neutral-400"
                      disabled={item.status === 'uploading'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-4 text-neutral-600 dark:text-neutral-400 font-black hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-2xl transition-all border border-neutral-200 dark:border-neutral-700"
            >
              Cancel
            </button>
            <button
              onClick={uploadFiles}
              disabled={
                files.length === 0 ||
                files.some((f) => f.status === 'uploading')
              }
              className="flex-1 py-4 bg-brand-blue hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
            >
              {files.some((f) => f.status === 'uploading')
                ? 'Uploading...'
                : 'Start Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
