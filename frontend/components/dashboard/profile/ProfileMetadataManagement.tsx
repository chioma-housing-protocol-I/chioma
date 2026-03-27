'use client';

import { useState, useMemo } from 'react';
import { Plus, User, Download, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProfileMetadataList } from './ProfileMetadataList';
import {
  ProfileMetadataForm,
  type ProfileMetadataFormValues,
} from './ProfileMetadataForm';
import { ProfileMetadataDetail } from './ProfileMetadataDetail';
import { ProfileMetadataHistory } from './ProfileMetadataHistory';
import { ProfileMetadataPreview } from './ProfileMetadataPreview';

interface MetadataField {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'url' | 'email' | 'phone' | 'select';
  label: string;
  isPublic: boolean;
  isCustom: boolean;
  updatedAt: string;
  updatedBy?: string;
}

interface ProfileMetadataManagementProps {
  userId: string;
}

const DEFAULT_FIELDS: MetadataField[] = [
  {
    id: 'bio',
    key: 'bio',
    value: '',
    type: 'text',
    label: 'Bio',
    isPublic: true,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'location',
    key: 'location',
    value: '',
    type: 'text',
    label: 'Location',
    isPublic: true,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'website',
    key: 'website',
    value: '',
    type: 'url',
    label: 'Website',
    isPublic: true,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'phone',
    key: 'phone',
    value: '',
    type: 'phone',
    label: 'Phone',
    isPublic: false,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'company',
    key: 'company',
    value: '',
    type: 'text',
    label: 'Company',
    isPublic: true,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'jobTitle',
    key: 'jobTitle',
    value: '',
    type: 'text',
    label: 'Job Title',
    isPublic: true,
    isCustom: false,
    updatedAt: new Date().toISOString(),
  },
];

export function ProfileMetadataManagement({
  userId,
}: ProfileMetadataManagementProps) {
  const [metadata, setMetadata] = useState<MetadataField[]>(DEFAULT_FIELDS);
  const [showForm, setShowForm] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const selectedField = useMemo(
    () => metadata.find((f) => f.id === selectedFieldId),
    [metadata, selectedFieldId],
  );

  const publicFields = useMemo(
    () => metadata.filter((f) => f.isPublic),
    [metadata],
  );

  const customFields = useMemo(
    () => metadata.filter((f) => f.isCustom),
    [metadata],
  );

  const handleAddField = async (data: ProfileMetadataFormValues) => {
    try {
      const newField: MetadataField = {
        id: `field_${Date.now()}`,
        ...data,
        isCustom: true,
        updatedAt: new Date().toISOString(),
      };
      setMetadata([...metadata, newField]);
      toast.success('Field added successfully');
      setShowForm(false);
    } catch {
      toast.error('Failed to add field');
    }
  };

  const handleUpdateField = async (
    id: string,
    data: Partial<ProfileMetadataFormValues>,
  ) => {
    try {
      setMetadata(
        metadata.map((f) =>
          f.id === id
            ? { ...f, ...data, updatedAt: new Date().toISOString() }
            : f,
        ),
      );
      toast.success('Field updated successfully');
      setEditingFieldId(null);
    } catch {
      toast.error('Failed to update field');
    }
  };

  const handleDeleteField = async (id: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    try {
      setMetadata(metadata.filter((f) => f.id !== id));
      if (selectedFieldId === id) setSelectedFieldId(null);
      toast.success('Field deleted successfully');
    } catch {
      toast.error('Failed to delete field');
    }
  };

  const handleExportMetadata = () => {
    const data = {
      userId,
      exportedAt: new Date().toISOString(),
      metadata: metadata.map(({ id, key, value, label, isPublic }) => ({
        id,
        key,
        value,
        label,
        isPublic,
      })),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-metadata-${userId}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Metadata exported');
  };

  const handleImportMetadata = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        JSON.parse(content);
        // In a real app, you'd merge/update the metadata
        toast.success('Metadata imported successfully');
      } catch {
        toast.error('Invalid metadata file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/5 text-teal-400 rounded-3xl flex items-center justify-center border border-white/10 shadow-lg">
            <User size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Profile Metadata
            </h1>
            <p className="text-blue-200/60 mt-1">
              Manage and customize your profile information.
            </p>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            Add Field
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <ProfileMetadataForm
            field={
              editingFieldId
                ? metadata.find((f) => f.id === editingFieldId)
                : undefined
            }
            onSubmit={(data) => {
              if (editingFieldId) {
                handleUpdateField(editingFieldId, data);
              } else {
                handleAddField(data);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingFieldId(null);
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Total Fields
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {metadata.length}
          </h3>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Public Fields
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {publicFields.length}
          </h3>
        </div>
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          <p className="text-xs text-blue-200/60 uppercase tracking-wider">
            Custom Fields
          </p>
          <h3 className="text-2xl font-bold text-white mt-1">
            {customFields.length}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-4 sticky top-6">
            <h2 className="text-lg font-bold text-white">Metadata Fields</h2>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleExportMetadata}
                className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
              >
                <Download size={14} />
                Export
              </button>
              <label className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer">
                <Upload size={14} />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleImportMetadata(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <ProfileMetadataList
              fields={metadata}
              selectedId={selectedFieldId}
              onSelect={setSelectedFieldId}
              onEdit={(id) => {
                setEditingFieldId(id);
                setShowForm(true);
              }}
              onDelete={handleDeleteField}
            />
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedField ? (
            <>
              <ProfileMetadataDetail
                field={selectedField}
                onUpdate={(data) => handleUpdateField(selectedField.id, data)}
              />
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {showHistory ? 'Hide History' : 'View History'}
              </button>
              {showHistory && (
                <ProfileMetadataHistory fieldId={selectedField.id} />
              )}
            </>
          ) : (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 flex items-center justify-center min-h-[400px]">
              <p className="text-blue-200/60">Select a field to view details</p>
            </div>
          )}
        </div>
      </div>

      <ProfileMetadataPreview fields={publicFields} />
    </div>
  );
}
