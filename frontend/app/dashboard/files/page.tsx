'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FilePlus, FolderPlus, RefreshCw } from 'lucide-react';
import { FileMetadata, storageApi } from '../../../lib/api/storage';
import { FileList } from '../../../components/files/FileList';
import { FileGrid } from '../../../components/files/FileGrid';
import { FileFilters } from '../../../components/files/FileFilters';
import { FileDetail } from '../../../components/files/FileDetail';
import { FileUpload } from '../../../components/files/FileUpload';
import { FileShare } from '../../../components/files/FileShare';
import toast from 'react-hot-toast';

export default function FilesPage() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await storageApi.listFiles();
      setFiles(data);
    } catch (error) {
      toast.error('Failed to fetch files');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Search
    if (search) {
      result = result.filter((f) =>
        f.fileName.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Filter Type
    if (filterType !== 'all') {
      result = result.filter((f) => {
        if (filterType === 'image') return f.fileType.startsWith('image/');
        if (filterType === 'pdf') return f.fileType === 'application/pdf';
        if (filterType === 'video') return f.fileType.startsWith('video/');
        if (filterType === 'audio') return f.fileType.startsWith('audio/');
        if (filterType === 'archive')
          return (
            f.fileType.includes('zip') ||
            f.fileType.includes('rar') ||
            f.fileType.includes('tar')
          );
        if (filterType === 'document')
          return (
            f.fileType.includes('word') ||
            f.fileType.includes('sheet') ||
            f.fileType.includes('excel') ||
            f.fileType.includes('pdf')
          );
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest')
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      if (sortBy === 'oldest')
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (sortBy === 'name') return a.fileName.localeCompare(b.fileName);
      if (sortBy === 'size') return b.fileSize - a.fileSize;
      return 0;
    });

    return result;
  }, [files, search, filterType, sortBy]);

  const handleDownload = async (file: FileMetadata) => {
    try {
      const url = await storageApi.getDownloadUrl(file.s3Key);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.fileName;
      link.click();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete "${file.fileName}"?`)) return;

    try {
      await storageApi.deleteFile(file.s3Key);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      if (selectedFile?.id === file.id) setSelectedFile(null);
      toast.success('File deleted');
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleRename = (file: FileMetadata) => {
    setSelectedFile(file);
    setRenameValue(file.fileName);
    setIsRenameOpen(true);
  };

  const submitRename = async () => {
    if (!selectedFile || !renameValue) return;
    try {
      const updated = await storageApi.updateMetadata(
        selectedFile.s3Key,
        renameValue,
      );
      setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setIsRenameOpen(false);
      setSelectedFile(updated);
      toast.success('File renamed');
    } catch (error) {
      toast.error('Failed to rename file');
    }
  };

  const handleShare = (file: FileMetadata) => {
    setSelectedFile(file);
    setIsShareOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">
              File Management
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">
              Organize, share, and manage your digital assets securely.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchFiles}
              className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm active:scale-95"
              title="Refresh"
            >
              <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 px-8 py-4 bg-brand-blue hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
            >
              <Upload size={20} />
              Upload Files
            </button>
          </div>
        </div>

        {/* Stats / Quick Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            { label: 'Total Files', value: files.length, color: 'blue' },
            {
              label: 'Total Storage',
              value: `${(files.reduce((a, b) => a + b.fileSize, 0) / (1024 * 1024)).toFixed(1)} MB`,
              color: 'purple',
            },
            {
              label: 'Images',
              value: files.filter((f) => f.fileType.startsWith('image/'))
                .length,
              color: 'green',
            },
            {
              label: 'Documents',
              value: files.filter((f) => f.fileType === 'application/pdf')
                .length,
              color: 'orange',
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-100 dark:border-neutral-700 shadow-sm"
            >
              <p className="text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className="text-3xl font-black text-neutral-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <FileFilters
          search={search}
          setSearch={setSearch}
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterType={filterType}
          setFilterType={setFilterType}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        {/* File List / Grid */}
        {loading && files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-100 dark:border-neutral-700">
            <RefreshCw
              className="animate-spin text-brand-blue mb-4"
              size={48}
            />
            <p className="text-neutral-600 dark:text-neutral-400 font-bold">
              Loading your files...
            </p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-neutral-800 rounded-3xl border border-dotted border-neutral-300 dark:border-neutral-700">
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-3xl flex items-center justify-center mb-6 text-neutral-400">
              <Upload size={40} />
            </div>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
              No files found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-xs text-center font-medium">
              {search || filterType !== 'all'
                ? "Try adjusting your filters or search terms to find what you're looking for."
                : 'Upload your first file to get started with the Chioma File Management system.'}
            </p>
            {!search && filterType === 'all' && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-8 py-4 bg-brand-blue hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20"
              >
                Upload My First File
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <FileGrid
            files={filteredFiles}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRename={handleRename}
            onShare={handleShare}
            onSelect={setSelectedFile}
          />
        ) : (
          <FileList
            files={filteredFiles}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onRename={handleRename}
            onShare={handleShare}
            onSelect={setSelectedFile}
          />
        )}
      </div>

      {/* Modals */}
      <FileUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchFiles}
      />

      {isShareOpen && (
        <FileShare file={selectedFile} onClose={() => setIsShareOpen(false)} />
      )}

      {selectedFile && !isShareOpen && !isRenameOpen && (
        <FileDetail
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRename={handleRename}
          onShare={handleShare}
        />
      )}

      {/* Rename Modal */}
      {isRenameOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-800 rounded-3xl w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white mb-6">
                Rename File
              </h2>
              <div className="mb-8">
                <label className="block text-sm font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-3">
                  New Name
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  autoFocus
                  className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl px-5 py-4 text-neutral-900 dark:text-white focus:ring-2 focus:ring-brand-blue outline-none font-bold"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsRenameOpen(false)}
                  className="flex-1 py-4 text-neutral-600 dark:text-neutral-400 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRename}
                  className="flex-1 py-4 bg-brand-blue hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20"
                >
                  Rename File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
