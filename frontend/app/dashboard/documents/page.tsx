'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Upload, FolderOpen, FileText } from 'lucide-react';
import type { Document, DocumentMetadata } from '@/components/documents';

// Dynamically import modals to avoid SSR issues with PDF viewer
const DocumentViewerModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentViewerModal,
    })),
  { ssr: false },
);

const DocumentUploadModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentUploadModal,
    })),
  { ssr: false },
);

const DocumentListModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentListModal,
    })),
  { ssr: false },
);

// Mock data for demonstration
const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Lease Agreement - 123 Main St.pdf',
    type: 'pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: 2457600,
    uploadedBy: 'user-1',
    uploadedByName: 'John Landlord',
    uploadedAt: new Date('2024-03-15T10:30:00').toISOString(),
    category: 'lease',
    description: 'Annual lease agreement for property at 123 Main Street',
  },
  {
    id: '2',
    name: 'Property Inspection Report.pdf',
    type: 'pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: 1843200,
    uploadedBy: 'user-2',
    uploadedByName: 'Jane Inspector',
    uploadedAt: new Date('2024-03-10T14:20:00').toISOString(),
    category: 'inspection',
    description: 'Move-in inspection report with photos',
  },
  {
    id: '3',
    name: 'Payment Receipt March 2024.pdf',
    type: 'pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    size: 512000,
    uploadedBy: 'user-3',
    uploadedByName: 'Bob Tenant',
    uploadedAt: new Date('2024-03-01T09:15:00').toISOString(),
    category: 'payment',
    description: 'Rent payment receipt for March 2024',
  },
  {
    id: '4',
    name: 'Drivers License.jpg',
    type: 'image',
    url: 'https://via.placeholder.com/800x600/4F46E5/FFFFFF?text=ID+Document',
    size: 1024000,
    uploadedBy: 'user-3',
    uploadedByName: 'Bob Tenant',
    uploadedAt: new Date('2024-02-20T16:45:00').toISOString(),
    category: 'identity',
    description: 'Government-issued ID for verification',
  },
];

const initialDocuments =
  process.env.NODE_ENV === 'production' ? [] : mockDocuments;

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  const handleUpload = async (
    files: File[],
    metadata: DocumentMetadata,
  ): Promise<void> => {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create mock documents from uploaded files
    const newDocuments: Document[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      type: file.type.startsWith('image/')
        ? 'image'
        : file.type === 'application/pdf'
          ? 'pdf'
          : 'docx',
      url: URL.createObjectURL(file),
      size: file.size,
      uploadedBy: 'current-user',
      uploadedByName: 'Current User',
      uploadedAt: new Date().toISOString(),
      category: metadata.category,
      description: metadata.description,
    }));

    setDocuments((prev) => [...newDocuments, ...prev]);
  };

  const handleDownload = (documentId: string) => {
    const document = documents.find((doc) => doc.id === documentId);
    if (document) {
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = document.name;
      link.click();
    }
  };

  const handleDelete = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setIsListModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white mb-2">
            Document Management
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Upload, view, and manage your rental documents
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                <FileText className="text-brand-blue" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-1">
              {documents.length}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Total Documents
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                <FolderOpen className="text-purple-600" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-1">
              {new Set(documents.map((d) => d.category)).size}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Categories
            </p>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                <Upload className="text-green-600" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-1">
              {(
                documents.reduce((acc, doc) => acc + doc.size, 0) /
                (1024 * 1024)
              ).toFixed(1)}{' '}
              MB
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Total Storage
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-6 py-3 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2"
          >
            <Upload size={20} />
            Upload Documents
          </button>
          <button
            onClick={() => setIsListModalOpen(true)}
            className="px-6 py-3 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold rounded-xl transition-colors border border-neutral-200 dark:border-neutral-700 flex items-center gap-2"
          >
            <FolderOpen size={20} />
            Browse All Documents
          </button>
        </div>

        {/* Recent Documents */}
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-4">
            Recent Documents
          </h2>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto text-neutral-400 mb-4" size={48} />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                No documents uploaded yet
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-6 py-2.5 bg-brand-blue hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
              >
                Upload Your First Document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText
                        className="text-brand-blue shrink-0"
                        size={20}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {new Date(doc.uploadedAt).toLocaleDateString()} •{' '}
                          {(doc.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg shrink-0">
                      {doc.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DocumentViewerModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onDownload={handleDownload}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      <DocumentListModal
        documents={documents}
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        onView={handleViewDocument}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onUploadClick={() => {
          setIsListModalOpen(false);
          setIsUploadModalOpen(true);
        }}
      />
    </div>
  );
}
