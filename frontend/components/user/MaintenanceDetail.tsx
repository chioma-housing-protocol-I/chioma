'use client';

import React, { useState } from 'react';
import {
  Calendar,
  FileText,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  Phone,
  Mail,
  AlertTriangle,
  Wrench,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useLandlordMaintenanceDetail,
  useAddMaintenanceComment,
  useUpdateMaintenance,
  useScheduleMaintenance,
} from '@/lib/query/hooks/use-landlord-maintenance-detail';
import {
  MaintenanceStatus,
  MaintenancePriority,
} from '@/lib/query/hooks/use-landlord-maintenance';
import { format, formatDistanceToNow } from 'date-fns';
import { useDateFnsLocale } from '@/lib/utils/date-fns-locale';
import { useAuthStore } from '@/store/authStore';

interface MaintenanceDetailProps {
  requestId: string;
  className?: string;
}

export function MaintenanceDetail({
  requestId,
  className = '',
}: MaintenanceDetailProps) {
  const { user } = useAuthStore();
  const dateFnsLocale = useDateFnsLocale();
  const [newComment, setNewComment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<MaintenanceStatus | ''>(
    '',
  );
  const [selectedPriority, setSelectedPriority] = useState<
    MaintenancePriority | ''
  >('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const {
    data: request,
    isLoading,
    error,
  } = useLandlordMaintenanceDetail(requestId);
  const addCommentMutation = useAddMaintenanceComment();
  const updateMutation = useUpdateMaintenance();
  const scheduleMutation = useScheduleMaintenance();

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !request || addCommentMutation.isPending) return;

    addCommentMutation.mutate(
      { requestId: request.id, content: newComment.trim() },
      {
        onSuccess: () => setNewComment(''),
      },
    );
  };

  const handleStatusUpdate = () => {
    if (!selectedStatus || !request || updateMutation.isPending) return;
    updateMutation.mutate({
      requestId: request.id,
      data: { status: selectedStatus },
    });
    setSelectedStatus('');
  };

  const handlePriorityUpdate = () => {
    if (!selectedPriority || !request || updateMutation.isPending) return;
    updateMutation.mutate({
      requestId: request.id,
      data: { priority: selectedPriority },
    });
    setSelectedPriority('');
  };

  const handleSchedule = () => {
    if (
      !scheduleDate ||
      !scheduleTime ||
      !request ||
      scheduleMutation.isPending
    )
      return;
    scheduleMutation.mutate({
      requestId: request.id,
      date: scheduleDate,
      time: scheduleTime,
    });
    setScheduleDate('');
    setScheduleTime('');
  };

  if (isLoading) {
    return (
      <div
        className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 p-8 ${className}`}
      >
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mr-3" />
          <span className="text-neutral-500">
            Loading maintenance details...
          </span>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div
        className={`bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 p-8 ${className}`}
      >
        <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-neutral-200 rounded-3xl">
          <Wrench className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
            Maintenance request not found
          </h3>
          <p className="text-neutral-500 mb-6">
            The maintenance request details could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = {
    OPEN: {
      color: 'bg-red-50 text-red-800 border-red-200',
      icon: AlertTriangle,
    },
    IN_PROGRESS: {
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: Clock,
    },
    COMPLETED: {
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: CheckCircle2,
    },
    CANCELLED: {
      color: 'bg-neutral-50 text-neutral-600 border-neutral-200',
      icon: XCircle,
    },
  } as const;

  const priorityConfig = {
    LOW: {
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      label: 'Low',
    },
    MEDIUM: {
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'Medium',
    },
    HIGH: {
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      label: 'High',
    },
    URGENT: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Urgent' },
  } as const;

  const StatusIcon = statusConfig[request.status]?.icon || Clock;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-neutral-50 rounded-3xl p-8 border border-neutral-200">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border">
                <StatusIcon size={20} className="text-blue-500" />
              </div>
              <div>
                <Badge
                  className={`font-semibold ${statusConfig[request.status]?.color || 'bg-neutral-100 text-neutral-800'}`}
                >
                  {request.status.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge
                  variant="outline"
                  className={`ml-2 ${priorityConfig[request.priority]?.color}`}
                >
                  {priorityConfig[request.priority]?.label}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-neutral-500 mt-1">
                  <Calendar size={14} />
                  <span>
                    Created{' '}
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                      locale: dateFnsLocale,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 tracking-tight mb-3">
              {request.requestId} - {request.title}
            </h1>
            <p className="text-lg text-neutral-700 leading-relaxed max-w-4xl">
              {request.description}
            </p>
            {request.deadline && (
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="flex items-baseline gap-2">
                  <Clock size={16} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    Deadline:{' '}
                    {format(
                      new Date(request.deadline),
                      'MMM d, yyyy • h:mm a',
                      { locale: dateFnsLocale },
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="text-right">
              <div className="text-sm text-neutral-500">Property</div>
              <div className="font-semibold text-neutral-900">
                {request.propertyName}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-neutral-500">Request ID</div>
              <div className="font-mono font-semibold">{request.requestId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant & Assignment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Info */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <User size={18} />
            Tenant Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <span className="font-semibold text-white text-sm">
                  {request.tenant.name.charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-semibold text-neutral-900">
                  {request.tenant.name}
                </div>
                <div className="text-sm text-neutral-500">Tenant</div>
              </div>
            </div>
            {request.tenant.email && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Mail size={14} className="text-neutral-400" />
                <span>{request.tenant.email}</span>
              </div>
            )}
            {request.tenant.phone && (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Phone size={14} className="text-neutral-400" />
                <span>{request.tenant.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Personnel */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Wrench size={18} />
            Assigned Personnel
          </h3>
          {request.assignedTo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center">
                  <span className="font-semibold text-white text-sm">
                    {request.assignedTo.name?.charAt(0) || 'A'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-neutral-900">
                    {request.assignedTo.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-neutral-500">
                    Maintenance Personnel
                  </div>
                </div>
              </div>
              {request.assignedTo.email && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Mail size={14} className="text-neutral-400" />
                  <span>{request.assignedTo.email}</span>
                </div>
              )}
              {request.assignedTo.phone && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Phone size={14} className="text-neutral-400" />
                  <span>{request.assignedTo.phone}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-neutral-500">
              <Wrench className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
              <p>No personnel assigned yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions Panel */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Update Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              Update Status
            </label>
            <div className="flex gap-2">
              <Select
                value={selectedStatus}
                onValueChange={(value) =>
                  setSelectedStatus(value as MaintenanceStatus)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </div>

          {/* Update Priority */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              Update Priority
            </label>
            <div className="flex gap-2">
              <Select
                value={selectedPriority}
                onValueChange={(value) =>
                  setSelectedPriority(value as MaintenancePriority)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handlePriorityUpdate}
                disabled={!selectedPriority || updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </div>

          {/* Schedule Maintenance */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              Schedule Maintenance
            </label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1"
              />
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-24"
              />
              <Button
                onClick={handleSchedule}
                disabled={
                  !scheduleDate || !scheduleTime || scheduleMutation.isPending
                }
              >
                {scheduleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Schedule'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Photos */}
      {request.photos.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 mb-6 flex items-center gap-2">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image size={20} />
            Photos ({request.photos.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {request.photos.map(
              (photo: {
                id: string;
                filename: string;
                url: string;
                uploadedAt: string;
              }) => (
                <div
                  key={photo.id}
                  className="group bg-white hover:bg-neutral-50 rounded-2xl p-6 border border-neutral-100 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-2">
                    <FileText
                      size={16}
                      className="text-neutral-400 mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="font-medium text-neutral-900 truncate mb-1"
                        title={photo.filename}
                      >
                        {photo.filename}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatDistanceToNow(new Date(photo.uploadedAt), {
                          addSuffix: true,
                          locale: dateFnsLocale,
                        })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start"
                  >
                    View Photo
                  </Button>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Comments */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
            <MessageCircle size={20} />
            Comments ({request.comments.length})
          </h2>
          {request.comments.length === 0 && (
            <span className="text-sm text-neutral-500">
              Be first to comment
            </span>
          )}
        </div>

        {/* Comments List */}
        <div className="space-y-4 mb-8">
          {request.comments.map(
            (comment: {
              id: string;
              author?: { id?: string; name?: string; role?: string };
              content: string;
              createdAt: string;
            }) => (
              <div
                key={comment.id}
                className="flex gap-4 p-6 bg-white rounded-2xl border border-neutral-100"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-white text-xs">
                    {(comment.author?.role || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-semibold text-neutral-900 truncate">
                      {comment.author?.name || 'Anonymous'}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {comment.author?.role || 'User'}
                    </Badge>
                    <span className="text-xs text-neutral-500">•</span>
                    <span className="text-xs text-neutral-500">
                      {formatDistanceToNow(new Date(comment.createdAt), {
                        addSuffix: true,
                        locale: dateFnsLocale,
                      })}
                    </span>
                  </div>
                  <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>

        {/* Add Comment Form */}
        {request.status !== 'COMPLETED' && request.status !== 'CANCELLED' && (
          <form
            onSubmit={handleSubmitComment}
            className="p-6 bg-neutral-50 rounded-2xl border-2 border-dashed border-neutral-200"
          >
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="font-semibold text-white text-xs">
                  {user?.firstName?.[0] || 'L'}
                </span>
              </div>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Add a comment or update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                  disabled={addCommentMutation.isPending}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewComment('')}
                    disabled={addCommentMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !newComment.trim() || addCommentMutation.isPending
                    }
                    className="font-semibold"
                  >
                    {addCommentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add Comment'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
