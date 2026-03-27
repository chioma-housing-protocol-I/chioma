import React, { useState } from 'react';
import { X, Share2, Copy, Link, Check, Users, Shield } from 'lucide-react';
import { FileMetadata, storageApi } from '../../lib/api/storage';
import toast from 'react-hot-toast';

interface Props {
  file: FileMetadata | null;
  onClose: () => void;
}

export const FileShare: React.FC<Props> = ({ file, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [loading, setLoading] = useState(false);

  if (!file) return null;

  const generateLink = async () => {
    setLoading(true);
    try {
      const url = await storageApi.getDownloadUrl(file.s3Key);
      setShareLink(url);
      setCopied(false);
    } catch (error) {
      toast.error('Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/20">
          <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Share2 size={20} className="text-brand-blue" />
            Share File
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors text-neutral-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          <div className="flex items-center gap-4 mb-8 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <div className="w-12 h-12 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center shadow-sm">
              <Share2 size={24} className="text-brand-blue" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-neutral-900 dark:text-white truncate">
                {file.fileName}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium uppercase tracking-tighter">
                Private Share
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Link size={16} className="text-brand-blue" />
                Public Link
              </label>
              {shareLink ? (
                <div className="flex gap-2">
                  <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm text-neutral-600 dark:text-neutral-400 truncate font-mono">
                    {shareLink}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="p-3 bg-brand-blue hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center shrink-0"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateLink}
                  disabled={loading}
                  className="w-full py-4 bg-brand-blue hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  {loading ? 'Generating...' : 'Generate Share Link'}
                </button>
              )}
              <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium italic">
                The link will expire in 120 seconds for security purposes.
              </p>
            </div>

            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700 opacity-50 pointer-events-none">
              <label className="block text-sm font-black text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Users size={16} className="text-brand-blue" />
                Share with Users
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm text-neutral-400 italic">
                  Advanced sharing coming soon...
                </div>
              </div>
            </div>

            <div className="opacity-50 pointer-events-none">
              <label className="block text-sm font-black text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Shield size={16} className="text-brand-blue" />
                Role Permissions
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 rounded-2xl text-sm text-neutral-400 italic">
                  Role-based access coming soon...
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-8 py-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white font-black rounded-2xl transition-all border border-neutral-200 dark:border-neutral-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
