'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MaintenancePriority } from '@/lib/query/hooks/use-landlord-maintenance';
import { useAuthStore } from '@/store/authStore';

interface MaintenanceFormProps {
  propertyId?: string;
  propertyName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function MaintenanceForm({
  propertyId,
  propertyName,
  onSuccess,
  onCancel,
  className = '',
}: MaintenanceFormProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as MaintenancePriority,
    propertyId: propertyId || '',
    propertyName: propertyName || '',
  });
  const [photos, setPhotos] = useState<File[]>([]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos].slice(0, 5)); // Max 5 photos
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;

    setIsSubmitting(true);
    try {
      // In a real implementation, this would call the API
      // For now, we'll simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/user/maintenance');
      }
    } catch (error) {
      console.error('Failed to submit maintenance request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div className="bg-white rounded-3xl p-8 border border-neutral-100 shadow-sm">
        <h2 className="text-2xl font-bold text-neutral-900 mb-6">
          New Maintenance Request
        </h2>

        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="text-sm font-medium text-neutral-700"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
              className="w-full"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-neutral-700"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about the maintenance issue..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              required
              className="min-h-[150px] resize-none"
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <label
              htmlFor="priority"
              className="text-sm font-medium text-neutral-700"
            >
              Priority
            </label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Property */}
          {!propertyId && (
            <div className="space-y-2">
              <label
                htmlFor="property"
                className="text-sm font-medium text-neutral-700"
              >
                Property
              </label>
              <Input
                id="property"
                placeholder="Property name or address"
                value={formData.propertyName}
                onChange={(e) =>
                  handleInputChange('propertyName', e.target.value)
                }
                className="w-full"
              />
            </div>
          )}

          {/* Photo Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              Photos (Optional)
            </label>
            <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 mb-1">
                  Click to upload photos
                </p>
                <p className="text-xs text-neutral-400">
                  PNG, JPG up to 5MB each (max 5 photos)
                </p>
              </label>
            </div>

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <div className="w-20 h-20 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !formData.title.trim() ||
            !formData.description.trim()
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </div>
    </form>
  );
}
