'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Upload, FolderOpen, FileText, Loader2 } from 'lucide-react';
import type { Document, DocumentMetadata } from '@/components/documents';
import {
  useLandlordDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDocument,
} from '@/lib/query/hooks/use-landlord-documents';

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

function mapToDocumentView(doc: {
  id: string;
  name: string;
  type: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: string;
  category: string;
  description?: string;
}): Document {
  const docType = doc.fileType?.includes('pdf')
    ? 'pdf'
    : doc.fileType?.startsWith('image/')
      ? 'image'
      : doc.fileType?.includes('word') || doc.fileType?.includes('docx')
        ? 'docx'
        : doc.fileType?.includes('sheet') || doc.fileType?.includes('xlsx')
          ? 'xlsx'
          : 'txt';
  return {
    id: doc.id,
    name: doc.name,
    type: docType,
    url: doc.url,
    size: doc.fileSize,
    uploadedBy: '',
    uploadedByName: '',
    uploadedAt: doc.uploadedAt,
    category: (doc.category as Document['category']) || 'other',
    description: doc.description,
  };
}

export default function TenantDocumentsPage() {
  const { data: documents = [], isLoading } = useLandlordDocuments();
  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);

  const handleUpload = async (
    files: File[],
    metadata: DocumentMetadata,
  ): Promise<void> => {
    for (const file of files) {
      await uploadMutation.mutateAsync({
        file,
        metadata: {
          name: file.name,
          category: metadata.category || 'other',
          description: metadata.description,
        },
      });
    }
  };

  const handleDownload = (documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      const link = window.document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.click();
    }
  };

  const handleDelete = (documentId: string) => {
    deleteMutation.mutate(documentId);
  };

  const handleViewDocument = (doc: { id: string }) => {
    const found = documents.find((d) => d.id === doc.id);
    if (found) {
      setSelectedDocument(mapToDocumentView(found));
      setIsListModalOpen(false);
    }
  };

  const totalSize = documents.reduce((acc, doc) => acc + doc.fileSize, 0);
  const categories = new Set(documents.map((d) => d.category));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-1">
          Documents
        </h1>
        <p className="text-blue-200/50">
          Upload, view, and manage your rental documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4">
            <FileText className="text-blue-400" size={20} />
          </div>
          <h3 className="text-2xl font-black text-white mb-0.5">
            {isLoading ? '-' : documents.length}
          </h3>
          <p className="text-sm text-blue-200/40">Total Documents</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mb-4">
            <FolderOpen className="text-purple-400" size={20} />
          </div>
          <h3 className="text-2xl font-black text-white mb-0.5">
            {isLoading ? '-' : categories.size}
          </h3>
          <p className="text-sm text-blue-200/40">Categories</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-4">
            <Upload className="text-emerald-400" size={20} />
          </div>
          <h3 className="text-2xl font-black text-white mb-0.5">
            {isLoading ? '-' : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`}
          </h3>
          <p className="text-sm text-blue-200/40">Total Storage</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 text-sm"
        >
          <Upload size={16} />
          Upload Documents
        </button>
        <button
          onClick={() => setIsListModalOpen(true)}
          className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors border border-white/10 flex items-center gap-2 text-sm"
        >
          <FolderOpen size={16} />
          Browse All
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Recent Documents</h2>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <FolderOpen className="text-blue-300/20 mb-4" size={48} />
            <p className="text-white font-semibold mb-1">No documents yet</p>
            <p className="text-blue-200/40 text-sm mb-6">
              Your landlord hasn&apos;t uploaded any documents for your account.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {documents.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocument(mapToDocumentView(doc))}
                className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="text-blue-400" size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate text-sm">
                      {doc.name}
                    </p>
                    <p className="text-xs text-blue-200/40 mt-0.5">
                      {new Date(doc.uploadedAt).toLocaleDateString()} ·{' '}
                      {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg shrink-0">
                  {doc.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DocumentViewerModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        onDownload={
          selectedDocument
            ? () => handleDownload(selectedDocument.id)
            : undefined
        }
      />
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
      <DocumentListModal
        documents={documents.map(mapToDocumentView)}
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
