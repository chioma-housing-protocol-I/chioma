'use client';

import React from 'react';
import { X, Download, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DocumentRecord } from '@/lib/query/hooks/use-landlord-documents';
import { format } from 'date-fns';

interface DocumentPreviewProps {
  document: DocumentRecord | null;
  onClose: () => void;
  onDownload?: (document: DocumentRecord) => void;
  className?: string;
}

export function DocumentPreview({
  document,
  onClose,
  onDownload,
  className = '',
}: DocumentPreviewProps) {
  if (!document) return null;

  const getDocumentIcon = () => {
    const fileType = document.fileType.toLowerCase();
    if (fileType.includes('pdf')) {
      return <FileText className="w-12 h-12 text-red-500" />;
    }
    if (fileType.includes('image')) {
      return <ImageIcon className="w-12 h-12 text-blue-500" />;
    }
    return <File className="w-12 h-12 text-neutral-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getTypeBadge = () => {
    const config = {
      LEASE: {
        className: 'bg-purple-100 text-purple-700 border-purple-200',
        label: 'Lease',
      },
      INSPECTION: {
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        label: 'Inspection',
      },
      RECEIPT: {
        className: 'bg-green-100 text-green-700 border-green-200',
        label: 'Receipt',
      },
      CONTRACT: {
        className: 'bg-blue-100 text-blue-700 border-blue-200',
        label: 'Contract',
      },
      OTHER: {
        className: 'bg-gray-100 text-gray-700 border-gray-200',
        label: 'Other',
      },
    };
    const { className, label } = config[document.type];
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  const getStatusBadge = () => {
    const config = {
      ACTIVE: { variant: 'default' as const, label: 'Active' },
      ARCHIVED: { variant: 'secondary' as const, label: 'Archived' },
      EXPIRED: { variant: 'destructive' as const, label: 'Expired' },
    };
    const { variant, label } = config[document.status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document);
    } else {
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = document.name;
      link.click();
    }
  };

  const canPreview =
    document.fileType.toLowerCase().includes('pdf') ||
    document.fileType.toLowerCase().includes('image');

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 ${className}`}
    >
      <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
              {getDocumentIcon()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900">
                {document.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {getTypeBadge()}
                {getStatusBadge()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-neutral-500">Property</div>
              <div className="font-medium text-neutral-900">
                {document.propertyName}
              </div>
            </div>
            {document.tenantName && (
              <div>
                <div className="text-sm text-neutral-500">Tenant</div>
                <div className="font-medium text-neutral-900">
                  {document.tenantName}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-neutral-500">File Size</div>
              <div className="font-medium text-neutral-900">
                {formatFileSize(document.fileSize)}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-500">Uploaded</div>
              <div className="font-medium text-neutral-900">
                {format(new Date(document.uploadedAt), 'MMM d, yyyy • h:mm a')}
              </div>
            </div>
            {document.expiresAt && (
              <div>
                <div className="text-sm text-neutral-500">Expires</div>
                <div className="font-medium text-neutral-900">
                  {format(new Date(document.expiresAt), 'MMM d, yyyy')}
                </div>
              </div>
            )}
          </div>

          {document.description && (
            <div className="mb-6">
              <div className="text-sm text-neutral-500 mb-2">Description</div>
              <p className="text-neutral-700">{document.description}</p>
            </div>
          )}

          {/* Preview */}
          {canPreview ? (
            <div className="border border-neutral-200 rounded-2xl overflow-hidden">
              {document.fileType.toLowerCase().includes('pdf') ? (
                <iframe
                  src={document.url}
                  title={document.name}
                  className="w-full h-[500px]"
                />
              ) : (
                <img
                  src={document.url}
                  alt={document.name}
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center">
              <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                Preview not available
              </h3>
              <p className="text-neutral-500 mb-4">
                This file type cannot be previewed. Download the file to view
                it.
              </p>
              <Button onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
