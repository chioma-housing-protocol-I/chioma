import { apiClient } from '../api-client';

export interface FileMetadata {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  s3Key: string;
  createdAt: string;
  updatedAt: string;
}

export const storageApi = {
  listFiles: async (): Promise<FileMetadata[]> => {
    const response = await apiClient.get<FileMetadata[]>('/storage');
    return response.data;
  },

  getUploadUrl: async (
    fileName: string,
    fileSize: number,
    fileType: string,
  ): Promise<{ url: string; key: string }> => {
    const response = await apiClient.post<{ url: string; key: string }>(
      '/storage/upload-url',
      {
        fileName,
        fileSize,
        fileType,
      },
    );
    return response.data;
  },

  getDownloadUrl: async (key: string): Promise<string> => {
    const urlResponse = await apiClient.get<{ url: string }>(
      `/storage/download-url?key=${encodeURIComponent(key)}`,
    );
    return urlResponse.data.url;
  },

  updateMetadata: async (
    key: string,
    fileName: string,
  ): Promise<FileMetadata> => {
    const response = await apiClient.patch<FileMetadata>(
      `/storage?key=${encodeURIComponent(key)}`,
      { fileName },
    );
    return response.data;
  },

  deleteFile: async (key: string): Promise<void> => {
    await apiClient.delete(`/storage?key=${encodeURIComponent(key)}`);
  },

  uploadToS3: async (url: string, file: File): Promise<void> => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
  },
};
