'use client';

import React from 'react';
import Link from 'next/link';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  Search,
  Filter,
  Loader2,
  Eye,
  Download,
  Trash2,
  Archive,
  FileText,
  FolderOpen,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useLandlordDocuments,
  DocumentStatus,
  DocumentType,
  DocumentRecord,
  useDeleteDocument,
  useArchiveDocument,
} from '@/lib/query/hooks/use-landlord-documents';
import { formatDistanceToNow } from 'date-fns';

interface DocumentsListProps {
  className?: string;
  onViewDocument?: (document: DocumentRecord) => void;
}

export function DocumentsList({
  className = '',
  onViewDocument,
}: DocumentsListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [statusFilter, setStatusFilter] = React.useState<
    DocumentStatus | 'ALL'
  >('ALL');
  const [typeFilter, setTypeFilter] = React.useState<DocumentType | 'ALL'>(
    'ALL',
  );
  const [globalFilter, setGlobalFilter] = React.useState('');

  const {
    data: documents = [],
    isLoading,
    error,
  } = useLandlordDocuments({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
    search: globalFilter,
  });

  const deleteMutation = useDeleteDocument();
  const archiveMutation = useArchiveDocument();

  const getStatusBadge = (status: DocumentStatus) => {
    const config = {
      ACTIVE: { variant: 'default' as const, label: 'Active' },
      ARCHIVED: { variant: 'secondary' as const, label: 'Archived' },
      EXPIRED: { variant: 'destructive' as const, label: 'Expired' },
    };
    const { variant, label } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeBadge = (type: DocumentType) => {
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
    const { className, label } = config[type];
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDelete = (doc: DocumentRecord) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${doc.name}"? This action cannot be undone.`,
      )
    ) {
      deleteMutation.mutate(doc.id);
    }
  };

  const handleArchive = (doc: DocumentRecord) => {
    if (window.confirm(`Are you sure you want to archive "${doc.name}"?`)) {
      archiveMutation.mutate(doc.id);
    }
  };

  const handleDownload = (doc: DocumentRecord) => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.name;
    link.click();
  };

  const columns = React.useMemo<ColumnDef<DocumentRecord>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Document Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-neutral-500" />
            </div>
            <div className="min-w-0">
              <div
                className="font-medium text-neutral-900 truncate max-w-xs"
                title={row.getValue('name')}
              >
                {row.getValue('name')}
              </div>
              {row.original.description && (
                <div className="text-xs text-neutral-500 truncate max-w-xs">
                  {row.original.description}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => getTypeBadge(row.getValue('type')),
        filterFn: (row, _, value) => row.getValue('type') === value,
      },
      {
        accessorKey: 'propertyName',
        header: 'Property',
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue('propertyName')}</div>
        ),
      },
      {
        accessorKey: 'tenantName',
        header: 'Tenant',
        cell: ({ row }) => {
          const tenant = row.getValue('tenantName') as string | undefined;
          return tenant ? (
            <div>{tenant}</div>
          ) : (
            <span className="text-sm text-neutral-400">-</span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
        filterFn: (row, _, value) => row.getValue('status') === value,
      },
      {
        accessorKey: 'fileSize',
        header: 'Size',
        cell: ({ row }) => (
          <div className="text-sm text-neutral-500">
            {formatFileSize(row.getValue('fileSize'))}
          </div>
        ),
      },
      {
        accessorKey: 'uploadedAt',
        header: 'Uploaded',
        cell: ({ row }) => (
          <div className="text-sm text-neutral-500">
            {formatDistanceToNow(new Date(row.getValue('uploadedAt')), {
              addSuffix: true,
            })}
          </div>
        ),
        sortingFn: 'datetime',
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            {onViewDocument ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => onViewDocument(row.original)}
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">View</span>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link href={`/landlords/documents/${row.original.id}`}>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">View</span>
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDownload(row.original)}
            >
              <Download className="h-4 w-4" />
              <span className="sr-only">Download</span>
            </Button>
            {row.original.status === 'ACTIVE' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => handleArchive(row.original)}
                disabled={archiveMutation.isPending}
              >
                <Archive className="h-4 w-4" />
                <span className="sr-only">Archive</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleDelete(row.original)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        ),
      },
    ],
    [onViewDocument, deleteMutation.isPending, archiveMutation.isPending],
  );

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-neutral-200 rounded-3xl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Failed to load documents
        </h3>
        <p className="text-neutral-500 mb-6 max-w-sm">
          There was an issue fetching your documents. Please refresh the page.
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white/50 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              placeholder="Search documents..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(String(e.target.value))}
              className="pl-10 w-full"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as DocumentStatus | 'ALL')
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as DocumentType | 'ALL')
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="LEASE">Lease</SelectItem>
              <SelectItem value="INSPECTION">Inspection</SelectItem>
              <SelectItem value="RECEIPT">Receipt</SelectItem>
              <SelectItem value="CONTRACT">Contract</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
          <Filter className="w-4 h-4" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mr-3" />
            <span className="text-neutral-500">Loading documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Upload}
              title="No documents yet"
              description="Upload your first document to get started managing your property files."
              actionLabel="Upload Document"
              onAction={() => {
                // Trigger upload dialog - implementation depends on your upload mechanism
                const uploadButton = document.querySelector(
                  '[data-upload-trigger]',
                ) as HTMLButtonElement;
                uploadButton?.click();
              }}
            />
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-neutral-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                Documents
              </h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="text-neutral-500 font-semibold uppercase text-xs tracking-wider"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="hover:bg-neutral-50/50 border-b border-neutral-50 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <td
                        colSpan={columns.length}
                        className="h-24 text-center p-4"
                      >
                        No results.
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-500">
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
