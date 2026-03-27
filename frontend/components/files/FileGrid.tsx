import React from 'react';
import { Download, Trash2, Share2, Edit2 } from 'lucide-react';
import { FileMetadata } from '../../lib/api/storage';
import { FileIcon } from './FileIcon';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  files: FileMetadata[];
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onShare: (file: FileMetadata) => void;
  onSelect: (file: FileMetadata) => void;
}

export const FileGrid: React.FC<Props> = ({
  files,
  onDownload,
  onDelete,
  onRename,
  onShare,
  onSelect,
}) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {files.map((file) => (
        <div
          key={file.id}
          className="bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col overflow-hidden"
          onClick={() => onSelect(file)}
        >
          {/* File Preview Thumbnail area */}
          <div className="h-32 bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center relative border-b border-neutral-200 dark:border-neutral-700 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-900 transition-colors">
            <FileIcon fileType={file.fileType} size={48} />

            {/* Quick Actions Overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file);
                }}
                className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-neutral-600 dark:text-neutral-400"
              >
                <Download size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file);
                }}
                className="p-1.5 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <h3
              className="font-bold text-neutral-900 dark:text-white truncate mb-1"
              title={file.fileName}
            >
              {file.fileName}
            </h3>
            <div className="flex justify-between items-center text-xs text-neutral-500 dark:text-neutral-400">
              <span>{formatSize(file.fileSize)}</span>
              <span>
                {formatDistanceToNow(new Date(file.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(file);
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-neutral-700 dark:text-neutral-300"
              >
                <Share2 size={12} />
                Share
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(file);
                }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-bold border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-neutral-700 dark:text-neutral-300"
              >
                <Edit2 size={12} />
                Rename
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
