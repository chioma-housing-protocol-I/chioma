'use client';

import React from 'react';
import { X, Download, Printer, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import type { Document } from './types';
import { DocumentPreview } from './DocumentPreview';

interface DocumentViewerModalProps {
  document: Document | null;
  onClose: () => void;
  onDownload?: (documentId: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
  onDownload,
}) => {
  if (!document) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document.id);
    } else {
      // Fallback: direct download
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = document.name;
      link.click();
    }
  };

  const handlePrint = () => {
    window.open(document.url, '_blank');
  };

  const handleOpenInNewTab = () => {
    window.open(document.url, '_blank');
  };

  const canPreview = document.type === 'pdf' || document.type === 'image';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[95vh] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-white/5 flex items-center justify-between bg-neutral-50 dark:bg-white/5 shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight truncate">
              {document.name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              <span>{(document.size / (1024 * 1024)).toFixed(2)} MB</span>
              <span>•</span>
              <span>
                {format(new Date(document.uploadedAt), 'MMM d, yyyy h:mm a')}
              </span>
              {document.uploadedByName && (
                <>
                  <span>•</span>
                  <span>Uploaded by {document.uploadedByName}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-brand-blue dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-brand-blue dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
              title="Print"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-brand-blue dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
              title="Open in new tab"
            >
              <ExternalLink size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {document.description && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {document.description}
              </p>
            </div>
          )}

          {canPreview ? (
            <DocumentPreview
              url={document.url}
              type={document.type === 'image' ? 'image' : 'pdf'}
              name={document.name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
              <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center mb-4">
                <ExternalLink size={32} className="text-neutral-500" />
              </div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
                Preview not available
              </h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 text-center max-w-md">
                This file type cannot be previewed in the browser. Please
                download the file to view it.
              </p>
              <button
                onClick={handleDownload}
                className="px-6 py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md"
              >
                Download File
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-white/5 border-t border-neutral-200 dark:border-white/5 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};
