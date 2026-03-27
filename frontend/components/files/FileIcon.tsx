import {
  FileIcon as LucideFileIcon,
  FileText,
  Image as ImageIcon,
  FileArchive,
  Music,
  Video,
  FileSpreadsheet,
  FileCode,
  FileDigit,
  Presentation,
} from 'lucide-react';
import React from 'react';

interface Props {
  fileType: string;
  size?: number;
  className?: string;
}

export const FileIcon: React.FC<Props> = ({
  fileType,
  size = 24,
  className,
}) => {
  if (fileType.startsWith('image/'))
    return <ImageIcon size={size} className={className || 'text-purple-500'} />;
  if (fileType.startsWith('video/'))
    return <Video size={size} className={className || 'text-red-500'} />;
  if (fileType.startsWith('audio/'))
    return <Music size={size} className={className || 'text-pink-500'} />;

  if (fileType === 'application/pdf')
    return <FileText size={size} className={className || 'text-red-600'} />;

  if (
    fileType.includes('spreadsheet') ||
    fileType.includes('excel') ||
    fileType.includes('csv')
  )
    return (
      <FileSpreadsheet size={size} className={className || 'text-green-600'} />
    );

  if (
    fileType.includes('word') ||
    fileType.includes('officedocument.wordprocessingml')
  )
    return <FileText size={size} className={className || 'text-blue-600'} />;

  if (fileType.includes('presentation') || fileType.includes('powerpoint'))
    return (
      <Presentation size={size} className={className || 'text-orange-500'} />
    );

  if (
    fileType.includes('zip') ||
    fileType.includes('rar') ||
    fileType.includes('tar') ||
    fileType.includes('gzip')
  )
    return (
      <FileArchive size={size} className={className || 'text-yellow-600'} />
    );

  if (
    fileType.includes('javascript') ||
    fileType.includes('typescript') ||
    fileType.includes('html') ||
    fileType.includes('css') ||
    fileType.includes('json')
  )
    return <FileCode size={size} className={className || 'text-gray-500'} />;

  return (
    <LucideFileIcon size={size} className={className || 'text-gray-400'} />
  );
};
