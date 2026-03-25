export class FileUtils {
  /**
   * Validates if a file type is allowed
   */
  static validateFileType(
    file: { mimetype: string },
    allowedTypes: string[],
  ): boolean {
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Validates if a file size is within limits (maxSize in bytes)
   */
  static validateFileSize(file: { size: number }, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * Generates a unique filename while preserving extension
   */
  static generateFileName(originalName: string): string {
    const ext = this.getFileExtension(originalName);
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    return `${timestamp}-${random}${ext ? '.' + ext : ''}`;
  }

  /**
   * Extracts file extension from filename
   */
  static getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop() || '' : '';
  }
}
