'use client';

import { Eye } from 'lucide-react';

interface MetadataField {
  id: string;
  key: string;
  value: string;
  label: string;
  isPublic: boolean;
}

interface ProfileMetadataPreviewProps {
  fields: MetadataField[];
}

export function ProfileMetadataPreview({
  fields,
}: ProfileMetadataPreviewProps) {
  const publicFields = fields.filter((f) => f.isPublic && f.value);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4">
      <div className="flex items-center gap-2">
        <Eye size={20} className="text-teal-400" />
        <h3 className="text-lg font-bold text-white">Public Profile Preview</h3>
      </div>

      <p className="text-sm text-blue-200/60">
        This is how your profile appears to other users:
      </p>

      {publicFields.length === 0 ? (
        <div className="text-center py-8 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-blue-200/60">
            No public fields. Add fields and make them public to create your
            profile.
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
          <div className="space-y-4">
            {publicFields.map((field) => (
              <div
                key={field.id}
                className="border-b border-slate-700 pb-4 last:border-0"
              >
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  {field.label}
                </p>
                <p className="text-base text-slate-200 break-all">
                  {field.key === 'website' && field.value.startsWith('http') ? (
                    <a
                      href={field.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-400 hover:text-teal-300"
                    >
                      {field.value}
                    </a>
                  ) : field.key === 'email' ? (
                    <a
                      href={`mailto:${field.value}`}
                      className="text-teal-400 hover:text-teal-300"
                    >
                      {field.value}
                    </a>
                  ) : (
                    field.value
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-blue-200/60">
        Fields marked as &quot;Private&quot; are only visible to you and
        won&apos;t appear on your public profile.
      </p>
    </div>
  );
}
