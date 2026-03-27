'use client';

import { useState } from 'react';
import { Copy, Edit2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface MetadataField {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'url' | 'email' | 'phone' | 'select';
  label: string;
  isPublic: boolean;
  updatedAt: string;
}

interface ProfileMetadataDetailProps {
  field: MetadataField;
  onUpdate: (data: Partial<Pick<MetadataField, 'value' | 'isPublic'>>) => void;
}

export function ProfileMetadataDetail({
  field,
  onUpdate,
}: ProfileMetadataDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.value);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(field.value);
    toast.success('Copied to clipboard');
  };

  const handleTogglePublic = () => {
    onUpdate({ isPublic: !field.isPublic });
  };

  const handleSave = () => {
    if (editValue !== field.value) {
      onUpdate({ value: editValue });
    }
    setIsEditing(false);
  };

  const updatedDate = new Date(field.updatedAt);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{field.label}</h2>
          <p className="text-blue-200/60 mt-1 font-mono text-sm">{field.key}</p>
        </div>
        <button
          onClick={handleTogglePublic}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all ${
            field.isPublic
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-white/5 border-white/10 text-blue-200/60'
          }`}
          title={field.isPublic ? 'Make Private' : 'Make Public'}
        >
          {field.isPublic ? (
            <>
              <Eye size={14} />
              Public
            </>
          ) : (
            <>
              <EyeOff size={14} />
              Private
            </>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {isEditing ? (
          <>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold transition-all"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditValue(field.value);
                  setIsEditing(false);
                }}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 break-all">
              <p className="text-white text-sm">
                {field.value || 'No value set'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Copy size={16} />
                Copy
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Edit2 size={16} />
                Edit
              </button>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="text-xs text-blue-200/60">
          Last updated: {updatedDate.toLocaleString()}
        </p>
        <p className="text-xs text-blue-200/60 mt-1">
          Type: <span className="font-mono">{field.type}</span>
        </p>
      </div>
    </div>
  );
}
