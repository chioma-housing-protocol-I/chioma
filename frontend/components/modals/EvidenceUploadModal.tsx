'use client';

import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileUp, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { BaseModal } from './BaseModal';
import { Uploader } from '@/components/ui/Uploader';

const schema = z.object({
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export interface EvidenceUploadData {
  disputeId: string;
  files: File[];
  description?: string;
}

interface EvidenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  disputeId: string;
  disputeTitle?: string;
  onUpload?: (data: EvidenceUploadData) => Promise<void>;
}

export const EvidenceUploadModal: React.FC<EvidenceUploadModalProps> = ({
  isOpen,
  onClose,
  disputeId,
  disputeTitle,
  onUpload,
}) => {
  const [files, setFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { description: '' },
  });

  const description = useWatch({
    control,
    name: 'description',
    defaultValue: '',
  });

  const handleClose = () => {
    reset();
    setFiles([]);
    setFileError(null);
    onClose();
  };

  const handleFilesSelected = (selected: File[]) => {
    setFiles(selected);
    setFileError(null);
  };

  const onFormSubmit = async (values: FormValues) => {
    if (files.length === 0) {
      setFileError('Please select at least one file to upload');
      return;
    }
    if (!onUpload) return;

    try {
      await onUpload({
        disputeId,
        files,
        description: values.description || undefined,
      });
      toast.success('Evidence uploaded successfully');
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload evidence',
      );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Evidence"
      subtitle={
        disputeTitle
          ? `For: ${disputeTitle}`
          : `Dispute #${disputeId.slice(0, 8)}`
      }
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="evidence-upload-form"
            disabled={isSubmitting || files.length === 0}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FileUp size={18} />
                Upload Evidence
              </>
            )}
          </button>
        </div>
      }
    >
      <form
        id="evidence-upload-form"
        onSubmit={handleSubmit(onFormSubmit)}
        noValidate
        className="space-y-6"
      >
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 flex items-start gap-3">
          <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Upload photos, receipts, or documents that support your case. All
            parties will be able to view submitted evidence.
          </p>
        </div>

        {/* File Upload */}
        <div>
          <Uploader
            label="Evidence Files *"
            accept="image/*,application/pdf,.doc,.docx"
            multiple
            onFilesSelected={handleFilesSelected}
            maxFiles={10}
            description="Drag and drop or click to upload (max 10 files)"
          />
          {fileError && (
            <p className="text-xs text-red-500 mt-2">{fileError}</p>
          )}
          <p className="text-xs text-neutral-500 mt-2">
            Supported: Images, PDF, Word. Max 10MB per file.
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Description (optional)
          </label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Briefly describe what this evidence shows..."
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            ) : (
              <span />
            )}
            <p className="text-xs text-neutral-500 ml-auto">
              {description?.length ?? 0}/500
            </p>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
