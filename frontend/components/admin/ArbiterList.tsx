'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Arbiter {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'on-leave';
  experience: number; // years
  totalCases: number;
  resolvedCases: number;
  rating: number; // 0-5
  resolutionTime: number; // hours average
  activeCases: number;
  joinDate: string;
}

interface ArbiterListProps {
  arbiters: Arbiter[];
  onAssign?: (arbiterId: string) => void;
  onUpdateStatus?: (arbiterId: string, status: string) => void;
  onViewDetails?: (arbiterId: string) => void;
  loading?: boolean;
}

export function ArbiterList({
  arbiters,
  onAssign,
  onUpdateStatus,
  onViewDetails,
  loading = false,
}: ArbiterListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredArbiters = useMemo(() => {
    let filtered = arbiters.filter((arbiter) => {
      const matchesSearch =
        arbiter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arbiter.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || arbiter.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'cases':
          return b.totalCases - a.totalCases;
        case 'active':
          return b.activeCases - a.activeCases;
        default:
          return 0;
      }
    });

    return filtered;
  }, [arbiters, searchTerm, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredArbiters.length / itemsPerPage);
  const paginatedArbiters = filteredArbiters.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on-leave':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-64">
          <label className="text-sm font-medium">Search</label>
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Sort By</label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="rating">Rating</SelectItem>
              <SelectItem value="cases">Total Cases</SelectItem>
              <SelectItem value="active">Active Cases</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Per Page</label>
          <Select value={itemsPerPage.toString()} onValueChange={(value) => {
            setItemsPerPage(parseInt(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Total Cases</TableHead>
              <TableHead>Resolved</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Avg. Resolution</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  Loading arbiters...
                </TableCell>
              </TableRow>
            ) : paginatedArbiters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  No arbiters found
                </TableCell>
              </TableRow>
            ) : (
              paginatedArbiters.map((arbiter) => (
                <TableRow key={arbiter.id}>
                  <TableCell className="font-medium">{arbiter.name}</TableCell>
                  <TableCell>{arbiter.email}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(arbiter.status)}>
                      {arbiter.status.charAt(0).toUpperCase() + arbiter.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{arbiter.experience} yrs</TableCell>
                  <TableCell>{arbiter.totalCases}</TableCell>
                  <TableCell>{arbiter.resolvedCases}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{arbiter.activeCases}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {arbiter.rating}⭐
                    </div>
                  </TableCell>
                  <TableCell>{arbiter.resolutionTime}h</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {arbiter.status === 'active' && onAssign && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onAssign(arbiter.id)}
                        >
                          Assign
                        </Button>
                      )}
                      {onViewDetails && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails(arbiter.id)}
                        >
                          Details
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
          {Math.min(currentPage * itemsPerPage, filteredArbiters.length)} of{' '}
          {filteredArbiters.length}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  onClick={() => setCurrentPage(pageNum)}
                  className="w-8 h-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
