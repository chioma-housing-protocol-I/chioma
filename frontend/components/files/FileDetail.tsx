import React from 'react';
import {
  X,
  Download,
  Trash2,
  Share2,
  Edit2,
  Calendar,
  Info,
  HardDrive,
  User,
} from 'lucide-react';
import { FileMetadata } from '../../lib/api/storage';
import { FileIcon } from './FileIcon';
import { format } from 'date-fns';

interface Props {
  file: FileMetadata | null;
  onClose: () => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onShare: (file: FileMetadata) => void;
}

export const FileDetail: React.FC<Props> = ({
  file,
  onClose,
  onDownload,
  onDelete,
  onRename,
  onShare,
}) => {
  if (!file) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Info size={20} className="text-brand-blue" />
            File Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-900 rounded-3xl flex items-center justify-center mb-4 border border-neutral-200 dark:border-neutral-700">
              <FileIcon fileType={file.fileType} size={48} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white text-center break-all">
              {file.fileName}
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 uppercase tracking-wider font-semibold">
              {file.fileType.split('/')[1] || file.fileType}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <HardDrive size={18} className="text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Size
                </span>
              </div>
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {formatSize(file.fileSize)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Created
                </span>
              </div>
              <span className="text-sm font-bold text-neutral-900 dark:text-white">
                {format(new Date(file.createdAt), 'PPP p')}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-100 dark:border-neutral-700">
              <div className="flex items-center gap-3">
                <User size={18} className="text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Storage Key
                </span>
              </div>
              <span className="text-xs font-mono bg-neutral-200 dark:bg-neutral-700 px-2 py-1 rounded text-neutral-700 dark:text-neutral-300 max-w-[200px] truncate">
                {file.s3Key}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() => onDownload(file)}
              className="flex items-center justify-center gap-2 py-3 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Download size={18} />
              Download
            </button>
            <button
              onClick={() => onShare(file)}
              className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-all active:scale-95"
            >
              <Share2 size={18} />
              Share
            </button>
            <button
              onClick={() => onRename(file)}
              className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 text-neutral-900 dark:text-white font-bold rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-all active:scale-95"
            >
              <Edit2 size={18} />
              Rename
            </button>
            <button
              onClick={() => onDelete(file)}
              className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 font-bold rounded-2xl transition-all active:scale-95 border border-red-100 dark:border-red-900/30"
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
