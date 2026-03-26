/**
 * Document-specific types for the document management system
 */

export type DocumentType = 'pdf' | 'image' | 'docx' | 'xlsx' | 'txt';
export type DocumentCategory =
  | 'lease'
  | 'identity'
  | 'payment'
  | 'maintenance'
  | 'inspection'
  | 'other';

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  category?: DocumentCategory;
  description?: string;
  thumbnailUrl?: string;
}

export interface DocumentMetadata {
  category?: DocumentCategory;
  description?: string;
}

export interface DocumentUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}
