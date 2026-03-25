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
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
      <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full bg-blue-600 blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-1000" />

      <h2 className="text-2xl font-black text-white mb-8 relative z-10 flex items-center gap-3">
        <span className="h-10 w-1 pt-1.5 bg-blue-500 rounded-full inline-block" />
        Submit Maintenance Request
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 relative z-10 text-white"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-3 text-[10px] font-black uppercase tracking-widest text-blue-200/40">
            Target Property
            <select
              required
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              {properties.map((property) => (
                <option
                  key={property.id}
                  value={property.id}
                  className="bg-slate-900"
                >
                  {property.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-3 text-[10px] font-black uppercase tracking-widest text-blue-200/40">
            Issue Category
            <select
              required
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
              className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              {ISSUE_CATEGORIES.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-3 text-[10px] font-black uppercase tracking-widest text-blue-200/40">
          Priority Level
          <select
            required
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as typeof priority)
            }
            className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
          >
            {PRIORITY_LEVELS.map((option) => (
              <option key={option} value={option} className="bg-slate-900">
                {PRIORITY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-3 text-[10px] font-black uppercase tracking-widest text-blue-200/40">
          Detailed Description
          <textarea
            required
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Help our maintenance team understand the issue..."
            rows={5}
            className="bg-white/5 border border-white/10 rounded-3xl px-5 py-5 text-sm text-white placeholder:text-blue-200/20 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
          />
        </label>

        <div className="space-y-4">
          <label className="flex flex-col gap-3 text-[10px] font-black uppercase tracking-widest text-blue-200/40">
            Supporting Media (Photos/Videos)
            <div className="relative group/file">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              />
              <div className="border-2 border-dashed border-white/10 rounded-3xl px-6 py-10 bg-white/5 text-center group-hover/file:bg-white/10 group-hover/file:border-blue-500/30 transition-all">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover/file:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <p className="text-sm font-bold text-white mb-1">
                  Click to upload or drag & drop
                </p>
                <p className="text-[10px] text-blue-200/40 font-bold uppercase">
                  PNG, JPG or MP4 (Max 10MB each)
                </p>
              </div>
            </div>
          </label>

          {filePreview.length > 0 && (
            <div className="rounded-2xl border border-white/5 p-4 bg-white/[0.02]">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-200/40 mb-3">
                Selected Files ({filePreview.length})
              </p>
              <ul className="space-y-2">
                {filePreview.map((file) => (
                  <li
                    key={file}
                    className="flex items-center gap-2 text-xs font-bold text-blue-100/60"
                  >
                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.2)] hover:bg-blue-500 hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-500 transform hover:-translate-y-1"
        >
          {isSubmitting ? 'Processing Request...' : 'Finalize and Submit'}
        </button>
      </form>
    </div>
  );
}
