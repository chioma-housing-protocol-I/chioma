'use client';

import React from 'react';
import {
  FileText,
  Image as ImageIcon,
  Download,
  Eye,
  Trash2,
  File,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Document } from './types';

interface DocumentCardProps {
  document: Document;
  onView: (document: Document) => void;
  onDownload?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  showActions?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onDownload,
  onDelete,
  showActions = true,
}) => {
  const getDocumentIcon = () => {
    switch (document.type) {
      case 'pdf':
        return <FileText className="text-red-500" size={24} />;
      case 'image':
        return <ImageIcon className="text-blue-500" size={24} />;
      case 'docx':
        return <File className="text-blue-600" size={24} />;
      case 'xlsx':
        return <File className="text-green-600" size={24} />;
      default:
        return <FileText className="text-gray-500" size={24} />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getCategoryBadge = () => {
    if (!document.category) return null;

    const colors: Record<string, string> = {
      lease: 'bg-purple-100 text-purple-700',
      identity: 'bg-blue-100 text-blue-700',
      payment: 'bg-green-100 text-green-700',
      maintenance: 'bg-orange-100 text-orange-700',
      inspection: 'bg-yellow-100 text-yellow-700',
      other: 'bg-gray-100 text-gray-700',
    };

    return (
      <span
        className={`text-xs font-semibold px-2 py-1 rounded-lg ${colors[document.category]}`}
      >
        {document.category.charAt(0).toUpperCase() + document.category.slice(1)}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 hover:shadow-lg transition-all group">
      <div className="flex items-start gap-4">
        {/* Icon/Thumbnail */}
        <div className="shrink-0">
          {document.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={document.thumbnailUrl}
              alt={document.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
              {getDocumentIcon()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
              {document.name}
            </h3>
            {getCategoryBadge()}
          </div>

          {document.description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2 line-clamp-2">
              {document.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span>{formatFileSize(document.size)}</span>
            <span>•</span>
            <span>{format(new Date(document.uploadedAt), 'MMM d, yyyy')}</span>
            {document.uploadedByName && (
              <>
                <span>•</span>
                <span className="truncate">{document.uploadedByName}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onView(document)}
              className="p-2 text-neutral-600 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="View document"
            >
              <Eye size={18} />
            </button>
            {onDownload && (
              <button
                onClick={() => onDownload(document)}
                className="p-2 text-neutral-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="Download document"
              >
                <Download size={18} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(document)}
                className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete document"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
