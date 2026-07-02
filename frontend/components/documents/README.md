# Document Management Components

A complete document management system for the Chioma rental platform with upload, viewing, and management capabilities.

## Features

✅ **Document Upload** - Drag-and-drop file upload with progress tracking
✅ **PDF Viewer** - Built-in PDF viewer with zoom and navigation
✅ **Image Preview** - Full image preview with zoom capabilities
✅ **Document List** - Searchable, filterable document library
✅ **Bulk Operations** - Select multiple documents for download/delete
✅ **Category Management** - Organize documents by type (lease, identity, payment, etc.)
✅ **Responsive Design** - Works on desktop, tablet, and mobile
✅ **Dark Mode Support** - Full dark mode compatibility
✅ **Accessibility** - ARIA labels and keyboard navigation

## Components

### 1. DocumentViewerModal

View and interact with documents (PDF and images).

```tsx
import { DocumentViewerModal } from '@/components/documents';

<DocumentViewerModal
  document={selectedDocument}
  onClose={() => setSelectedDocument(null)}
  onDownload={(docId) => handleDownload(docId)}
/>;
```

**Props:**

- `document`: Document object or null
- `onClose`: Function to close the modal
- `onDownload?`: Optional download handler

**Features:**

- PDF viewing with page navigation
- Zoom in/out controls
- Image preview
- Download button
- Print functionality
- Open in new tab

### 2. DocumentUploadModal

Upload documents with metadata and progress tracking.

```tsx
import { DocumentUploadModal } from '@/components/documents';

<DocumentUploadModal
  isOpen={isUploadModalOpen}
  onClose={() => setIsUploadModalOpen(false)}
  onUpload={handleUpload}
  maxFiles={10}
/>;
```

**Props:**

- `isOpen`: Boolean to control modal visibility
- `onClose`: Function to close the modal
- `onUpload`: Async function to handle file upload
- `allowedTypes?`: Accepted file types (default: images, PDF, docs)
- `maxFiles?`: Maximum number of files (default: 10)
- `title?`: Custom modal title

**Features:**

- Drag-and-drop file upload
- Multiple file selection
- Category selection
- Description field
- Upload progress indicator
- File validation
- Preview selected files

### 3. DocumentListModal

Browse, search, and manage documents.

```tsx
import { DocumentListModal } from '@/components/documents';

<DocumentListModal
  documents={documents}
  isOpen={isListModalOpen}
  onClose={() => setIsListModalOpen(false)}
  onView={handleView}
  onDownload={handleDownload}
  onDelete={handleDelete}
  onUploadClick={() => setIsUploadModalOpen(true)}
/>;
```

**Props:**

- `documents`: Array of document objects
- `isOpen`: Boolean to control modal visibility
- `onClose`: Function to close the modal
- `onView`: Function to view a document
- `onDelete?`: Optional delete handler
- `onDownload?`: Optional download handler
- `onUploadClick?`: Optional upload button handler
- `isLoading?`: Loading state

**Features:**

- Search documents by name/description
- Filter by category
- Sort by date/name/size
- Bulk select and actions
- Document cards with metadata
- Empty state handling
- Pagination-ready design

### 4. DocumentCard

Display individual document information.

```tsx
import { DocumentCard } from '@/components/documents';

<DocumentCard
  document={document}
  onView={handleView}
  onDownload={handleDownload}
  onDelete={handleDelete}
  showActions={true}
/>;
```

**Props:**

- `document`: Document object
- `onView`: Function to view the document
- `onDownload?`: Optional download handler
- `onDelete?`: Optional delete handler
- `showActions?`: Show/hide action buttons (default: true)

### 5. DocumentPreview

Preview component for PDF and images.

```tsx
import { DocumentPreview } from '@/components/documents';

<DocumentPreview url={document.url} type="pdf" name={document.name} />;
```

**Props:**

- `url`: Document URL
- `type`: 'pdf' or 'image'
- `name`: Document name

## Types

```typescript
type DocumentType = 'pdf' | 'image' | 'docx' | 'xlsx' | 'txt';

type DocumentCategory =
  | 'lease'
  | 'identity'
  | 'payment'
  | 'maintenance'
  | 'inspection'
  | 'other';

interface Document {
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

interface DocumentMetadata {
  category?: DocumentCategory;
  description?: string;
}
```

## Usage Example

See the complete implementation in `/app/dashboard/documents/page.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Document, DocumentMetadata } from '@/components/documents';

// Dynamic imports to avoid SSR issues with PDF viewer
const DocumentViewerModal = dynamic(
  () =>
    import('@/components/documents').then((mod) => ({
      default: mod.DocumentViewerModal,
    })),
  { ssr: false },
);

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleUpload = async (files: File[], metadata: DocumentMetadata) => {
    // Upload logic here
    // Call your API endpoint
    // Update documents state
  };

  return (
    <div>
      {/* Your UI */}

      <DocumentViewerModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
```

## Supported File Types

### Upload

- **Images**: JPG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX, XLS, XLSX, TXT
- **Max Size**: 50MB per file

### Preview

- **PDF**: Full preview with navigation and zoom
- **Images**: Full preview with zoom
- **Other**: Download-only (no preview)

## Styling

All components use Tailwind CSS and follow the Chioma design system:

- Brand blue: `#2563eb`
- Rounded corners: `rounded-2xl`, `rounded-3xl`
- Dark mode support via `dark:` variants
- Consistent spacing and typography

## Dependencies

```json
{
  "react-pdf": "^10.4.1",
  "pdfjs-dist": "^5.5.207",
  "lucide-react": "^0.562.0",
  "date-fns": "^4.1.0",
  "react-hot-toast": "^2.6.0"
}
```

## API Integration

To integrate with your backend:

1. **Upload Endpoint**

```typescript
const handleUpload = async (files: File[], metadata: DocumentMetadata) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  formData.append('category', metadata.category || 'other');
  formData.append('description', metadata.description || '');

  const response = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};
```

2. **List Endpoint**

```typescript
const fetchDocuments = async () => {
  const response = await apiClient.get<Document[]>('/documents');
  return response.data;
};
```

3. **Download Endpoint**

```typescript
const handleDownload = async (documentId: string) => {
  const response = await apiClient.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  // Handle blob download
};
```

4. **Delete Endpoint**

```typescript
const handleDelete = async (documentId: string) => {
  await apiClient.delete(`/documents/${documentId}`);
};
```

## Accessibility

All components include:

- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader friendly
- High contrast support

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- Lazy loading with dynamic imports
- Optimized PDF rendering
- Image optimization ready
- Minimal bundle size impact

## Testing

Run tests with:

```bash
pnpm test
```

## Contributing

When adding new features:

1. Follow existing component patterns
2. Add TypeScript types
3. Include accessibility features
4. Test on mobile devices
5. Update this README

## License

Part of the Chioma project - Open Source
