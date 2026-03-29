'use client';

import { useState } from 'react';
import { Copy, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKeyGenerateProps {
  keyName: string;
  generatedKey: string;
  onDone: () => void;
}

export function ApiKeyGenerate({ keyName, generatedKey, onDone }: ApiKeyGenerateProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = [
      `API Key: ${keyName}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Key: ${generatedKey}`,
      ``,
      `Keep this key secret. You will not be able to view it again.`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyName.replace(/\s+/g, '-').toLowerCase()}-api-key.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Key downloaded');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Save your key now</p>
          <p className="text-xs text-amber-300/70 mt-1">
            This is the only time your full API key will be shown. Copy or download it before
            closing this dialog — it cannot be recovered afterwards.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Your new API key — <span className="text-blue-200/60">{keyName}</span>
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-emerald-300 font-mono break-all">
            {generatedKey}
          </code>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white'
          }`}
        >
          {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Key'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      <button
        onClick={onDone}
        className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200/60 hover:text-white rounded-xl font-semibold text-sm transition-all"
      >
        I&apos;ve saved the key — Done
      </button>
    </div>
  );
}
