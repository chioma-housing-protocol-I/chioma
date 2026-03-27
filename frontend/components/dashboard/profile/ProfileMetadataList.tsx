'use client';

import { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

interface MetadataField {
  id: string;
  key: string;
  value: string;
  label: string;
  isPublic: boolean;
  isCustom: boolean;
  updatedAt: string;
}

interface ProfileMetadataListProps {
  fields: MetadataField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProfileMetadataList({
  fields,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: ProfileMetadataListProps) {
  const [search, setSearch] = useState('');

  const filteredFields = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return fields.filter(
      (field) =>
        normalizedSearch.length === 0 ||
        field.label.toLowerCase().includes(normalizedSearch) ||
        field.key.toLowerCase().includes(normalizedSearch),
    );
  }, [search, fields]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40"
          size={16}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fields..."
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-blue-200/40 focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
        />
      </div>

      {filteredFields.length === 0 ? (
        <div className="text-center py-8 text-blue-200/60 text-sm">
          {fields.length === 0 ? 'No fields yet' : 'No matching fields'}
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredFields.map((field) => {
            const isSelected = selectedId === field.id;

            return (
              <button
                key={field.id}
                onClick={() => onSelect(field.id)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'bg-teal-500/10 border-teal-500/40'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">
                      {field.label}
                    </p>
                    <p className="text-xs text-blue-200/60 mt-0.5 truncate">
                      {field.value || 'Empty'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {field.isPublic && (
                      <Eye size={14} className="text-teal-400" />
                    )}
                    {!field.isPublic && (
                      <EyeOff size={14} className="text-blue-200/60" />
                    )}
                    {field.isCustom && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 border border-white/20 text-blue-200/80">
                        Custom
                      </span>
                    )}
                  </div>
                </div>

                {field.isCustom && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(field.id);
                      }}
                      className="flex-1 p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs transition-all"
                      title="Edit"
                    >
                      <Edit2 size={12} className="mx-auto" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(field.id);
                      }}
                      className="flex-1 p-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 hover:bg-rose-500/20 text-xs transition-all"
                      title="Delete"
                    >
                      <Trash2 size={12} className="mx-auto" />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
