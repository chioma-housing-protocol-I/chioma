'use client';

import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  DEFAULT_PROPERTIES,
  ISSUE_CATEGORIES,
  PRIORITY_LABELS,
  PRIORITY_LEVELS,
} from './config';
import { MaintenancePropertyOption, SubmitMaintenanceInput } from './types';

interface MaintenanceRequestFormProps {
  properties?: MaintenancePropertyOption[];
  isSubmitting: boolean;
  onSubmit: (input: SubmitMaintenanceInput) => Promise<boolean>;
}

export default function MaintenanceRequestForm({
  properties = DEFAULT_PROPERTIES,
  isSubmitting,
  onSubmit,
}: MaintenanceRequestFormProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '');
  const [category, setCategory] = useState(ISSUE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(PRIORITY_LEVELS[2]);
  const [files, setFiles] = useState<File[]>([]);

  const filePreview = useMemo(
    () =>
      files.map((file) => `${file.name} (${Math.round(file.size / 1024)}KB)`),
    [files],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const success = await onSubmit({
      propertyId,
      category,
      description,
      priority,
      files,
    });

    if (success) {
      setDescription('');
      setPriority(PRIORITY_LEVELS[2]);
      setFiles([]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
      <h2 className="text-lg font-bold text-neutral-900 mb-4">
        Submit Maintenance Request
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Property
            <select
              required
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
            >
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Issue Category
            <select
              required
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
            >
              {ISSUE_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
          Priority
          <select
            required
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as typeof priority)
            }
            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white"
          >
            {PRIORITY_LEVELS.map((option) => (
              <option key={option} value={option}>
                {PRIORITY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
          Description
          <textarea
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the issue with as much detail as possible..."
            rows={5}
            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white resize-y"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
          Upload Photos or Videos
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="border border-dashed border-gray-300 rounded-lg px-3 py-2.5 bg-gray-50 file:mr-3 file:rounded-md file:border-0 file:bg-[#1e40af] file:px-3 file:py-1.5 file:text-white file:cursor-pointer"
          />
        </label>

        {filePreview.length > 0 && (
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Files selected
            </p>
            <ul className="space-y-1 text-xs text-gray-700">
              {filePreview.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto bg-[#1e40af] text-white font-semibold rounded-lg px-5 py-2.5 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
