'use client';

import React from 'react';
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
import Link from 'next/link';
import {
  Search,
  Filter,
  Loader2,
  Eye,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
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
  useLandlordMaintenance,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceRecord,
} from '@/lib/query/hooks/use-landlord-maintenance';
import { format, formatDistanceToNow } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';

interface MaintenanceListProps {
  className?: string;
}

export function MaintenanceList({ className = '' }: MaintenanceListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [statusFilter, setStatusFilter] = React.useState<
    MaintenanceStatus | 'ALL'
  >('ALL');
  const [priorityFilter, setPriorityFilter] = React.useState<
    MaintenancePriority | 'ALL'
  >('ALL');
  const [globalFilter, setGlobalFilter] = React.useState('');
  const dateFnsLocale = useDateFnsLocale();

  const {
    data: requests = [],
    isLoading,
    error,
  } = useLandlordMaintenance({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
    search: globalFilter,
  });

  const getStatusBadge = (status: MaintenanceStatus) => {
    const config = {
      OPEN: {
        variant: 'destructive' as const,
        icon: AlertTriangle,
        label: 'Open',
      },
      IN_PROGRESS: {
        variant: 'secondary' as const,
        icon: Clock,
        label: 'In Progress',
      },
      COMPLETED: {
        variant: 'default' as const,
        icon: CheckCircle2,
        label: 'Completed',
      },
      CANCELLED: {
        variant: 'outline' as const,
        icon: XCircle,
        label: 'Cancelled',
      },
    };
    const { variant, icon: Icon, label } = config[status];
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: MaintenancePriority) => {
    const config = {
      LOW: {
        className: 'bg-slate-100 text-slate-700 border-slate-200',
        label: 'Low',
      },
      MEDIUM: {
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        label: 'Medium',
      },
      HIGH: {
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'High',
      },
      URGENT: {
        className: 'bg-red-50 text-red-700 border-red-200',
        label: 'Urgent',
      },
    };
    const { className, label } = config[priority];
    return (
      <Badge variant="outline" className={className}>
        {label}
      </Badge>
    );
  };

  const columns = React.useMemo<ColumnDef<MaintenanceRecord>[]>(
    () => [
      {
        accessorKey: 'requestId',
        header: 'Request ID',
        cell: ({ row }) => (
          <div className="font-mono text-sm font-semibold">
            {row.getValue('requestId')}
          </div>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <div
            className="max-w-xs truncate font-medium"
            title={row.getValue('title')}
          >
            {row.getValue('title')}
          </div>
        ),
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
        cell: ({ row }) => <div>{row.getValue('tenantName')}</div>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
        filterFn: (row, _, value) => row.getValue('status') === value,
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => getPriorityBadge(row.getValue('priority')),
        filterFn: (row, _, value) => row.getValue('priority') === value,
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) => {
          const assigned = row.getValue(
            'assignedTo',
          ) as MaintenanceRecord['assignedTo'];
          return assigned ? (
            <div className="text-sm">{assigned.name}</div>
          ) : (
            <span className="text-sm text-neutral-400">Unassigned</span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <div className="text-sm text-neutral-500">
            {formatDistanceToNow(new Date(row.getValue('createdAt')), {
              addSuffix: true,
              locale: dateFnsLocale,
            })}
          </div>
        ),
        sortingFn: 'datetime',
      },
      {
        accessorKey: 'deadline',
        header: 'Deadline',
        cell: ({ row }) => {
          const deadline = row.getValue('deadline') as string | undefined;
          if (!deadline)
            return <span className="text-sm text-neutral-400">-</span>;
          const deadlineDate = new Date(deadline);
          const isOverdue = deadlineDate < new Date();
          return (
            <div
              className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-neutral-500'}`}
            >
              {format(deadlineDate, 'MMM d, yyyy', { locale: dateFnsLocale })}
            </div>
          );
        },
        sortingFn: 'datetime',
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href={`/landlords/maintenance/${row.original.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">View details</span>
            </Link>
          </Button>
        ),
      },
    ],
    [dateFnsLocale],
  );

  const table = useReactTable({
    data: requests,
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
          Failed to load maintenance requests
        </h3>
        <p className="text-neutral-500 mb-6 max-w-sm">
          There was an issue fetching maintenance requests. Please refresh the
          page.
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
              placeholder="Search requests..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(String(e.target.value))}
              className="pl-10 w-full"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as MaintenanceStatus | 'ALL')
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(value) =>
              setPriorityFilter(value as MaintenancePriority | 'ALL')
            }
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Priorities</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span>
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </span>
          <Filter className="w-4 h-4" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mr-3" />
            <span className="text-neutral-500">
              Loading maintenance requests...
            </span>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Wrench}
              title="No maintenance requests"
              description="All your properties are in good condition. Submit a request when you need repairs."
              actionLabel="Create Request"
              onAction={() => {
                // Navigate to create maintenance request page
                window.location.href = '/landlords/maintenance/new';
              }}
            />
          </div>
        ) : (
          <>
            <div className="px-6 py-5 border-b border-neutral-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900">
                Maintenance Requests
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
