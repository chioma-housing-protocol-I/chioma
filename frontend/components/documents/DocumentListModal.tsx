'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  Download,
  Trash2,
  Upload,
  FolderOpen,
} from 'lucide-react';
import type { Document, DocumentCategory } from './types';
import { DocumentCard } from './DocumentCard';
import { EmptyState } from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';

interface DocumentListModalProps {
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
  onView: (document: Document) => void;
  onDelete?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  onUploadClick?: () => void;
  isLoading?: boolean;
}

export const DocumentListModal: React.FC<DocumentListModalProps> = ({
  documents,
  isOpen,
  onClose,
  onView,
  onDelete,
  onDownload,
  onUploadClick,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<
    DocumentCategory | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set(),
  );

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.name.toLowerCase().includes(query) ||
          doc.description?.toLowerCase().includes(query) ||
          doc.uploadedByName?.toLowerCase().includes(query),
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    // Sort documents
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        case 'date':
        default:
          return (
            new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          );
      }
    });

    return filtered;
  }, [documents, searchQuery, selectedCategory, sortBy]);

  if (!isOpen) return null;

  const categories: { value: DocumentCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Documents' },
    { value: 'lease', label: 'Lease Agreements' },
    { value: 'identity', label: 'Identity Documents' },
    { value: 'payment', label: 'Payment Receipts' },
    { value: 'maintenance', label: 'Maintenance Records' },
    { value: 'inspection', label: 'Inspection Reports' },
    { value: 'other', label: 'Other' },
  ];

  const handleSelectDocument = (documentId: string) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map((doc) => doc.id)));
    }
  };

  const handleBulkDownload = () => {
    if (selectedDocuments.size === 0) {
      toast.error('Please select documents to download');
      return;
    }

    selectedDocuments.forEach((docId) => {
      if (onDownload) {
        onDownload(docId);
      }
    });

    toast.success(`Downloading ${selectedDocuments.size} document(s)`);
    setSelectedDocuments(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedDocuments.size === 0) {
      toast.error('Please select documents to delete');
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedDocuments.size} document(s)? This action cannot be undone.`,
      )
    ) {
      return;
    }

    selectedDocuments.forEach((docId) => {
      if (onDelete) {
        onDelete(docId);
      }
    });

    toast.success(`Deleted ${selectedDocuments.size} document(s)`);
    setSelectedDocuments(new Set());
  };

  const handleDownload = (document: Document) => {
    if (onDownload) {
      onDownload(document.id);
    } else {
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = document.name;
      link.click();
    }
    toast.success(`Downloading ${document.name}`);
  };

  const handleDelete = (document: Document) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${document.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    if (onDelete) {
      onDelete(document.id);
      toast.success(`Deleted ${document.name}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-white dark:bg-slate-900 border border-neutral-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
                <FolderOpen className="text-brand-blue" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">
                  Document Library
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  {filteredDocuments.length} document
                  {filteredDocuments.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onUploadClick && (
                <button
                  onClick={onUploadClick}
                  className="px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Upload size={16} />
                  Upload
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                size={18}
              />
              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(
                    e.target.value as DocumentCategory | 'all',
                  )
                }
                className="pl-10 pr-8 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-blue appearance-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'date' | 'name' | 'size')
              }
              className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-brand-blue cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedDocuments.size > 0 && (
            <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedDocuments.size === filteredDocuments.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {selectedDocuments.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDownload}
                  className="px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-sm font-semibold text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download size={14} />
                  Download
                </button>
                {onDelete && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-sm font-semibold text-red-700 dark:text-red-400 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Loading documents...
                </p>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={
                searchQuery || selectedCategory !== 'all'
                  ? 'No documents found'
                  : 'No documents yet'
              }
              description={
                searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Upload your first document to get started'
              }
              actionLabel={
                onUploadClick && !searchQuery && selectedCategory === 'all'
                  ? 'Upload Document'
                  : undefined
              }
              onAction={
                onUploadClick && !searchQuery && selectedCategory === 'all'
                  ? onUploadClick
                  : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDocuments.map((document) => (
                <div key={document.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.has(document.id)}
                    onChange={() => handleSelectDocument(document.id)}
                    className="w-4 h-4 rounded border-neutral-300 text-brand-blue focus:ring-brand-blue cursor-pointer shrink-0"
                  />
                  <div className="flex-1">
                    <DocumentCard
                      document={document}
                      onView={onView}
                      onDownload={
                        onDownload ? () => handleDownload(document) : undefined
                      }
                      onDelete={
                        onDelete ? () => handleDelete(document) : undefined
                      }
                      showActions={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-white/5 border-t border-neutral-200 dark:border-white/5 flex items-center justify-between shrink-0">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Total: {documents.length} document
            {documents.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
