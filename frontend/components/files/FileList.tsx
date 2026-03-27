import React from 'react';
import { MoreVertical, Download, Trash2, Edit2, Share2 } from 'lucide-react';
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

export const FileList: React.FC<Props> = ({
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
    <div className="overflow-x-auto bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 text-sm uppercase tracking-wider">
              Name
            </th>
            <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 text-sm uppercase tracking-wider">
              Size
            </th>
            <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 text-sm uppercase tracking-wider">
              Type
            </th>
            <th className="p-4 font-bold text-neutral-600 dark:text-neutral-400 text-sm uppercase tracking-wider">
              Modified
            </th>
            <th className="p-4 text-right font-bold text-neutral-600 dark:text-neutral-400 text-sm uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {files.map((file) => (
            <tr
              key={file.id}
              className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors group cursor-pointer"
              onClick={() => onSelect(file)}
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <FileIcon fileType={file.fileType} size={24} />
                  <span className="font-semibold text-neutral-900 dark:text-white truncate max-w-xs">
                    {file.fileName}
                  </span>
                </div>
              </td>
              <td className="p-4 text-neutral-600 dark:text-neutral-400 text-sm">
                {formatSize(file.fileSize)}
              </td>
              <td className="p-4 text-neutral-600 dark:text-neutral-400 text-sm">
                {file.fileType.split('/')[1] || file.fileType}
              </td>
              <td className="p-4 text-neutral-600 dark:text-neutral-400 text-sm">
                {formatDistanceToNow(new Date(file.updatedAt), {
                  addSuffix: true,
                })}
              </td>
              <td
                className="p-4 text-right"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDownload(file)}
                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => onShare(file)}
                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
                    title="Share"
                  >
                    <Share2 size={18} />
                  </button>
                  <button
                    onClick={() => onRename(file)}
                    className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
                    title="Rename"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(file)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
