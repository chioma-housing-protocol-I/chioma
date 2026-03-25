import { FileUtils } from '../file.utils';

describe('FileUtils', () => {
  describe('validateFileType', () => {
    it('should return true for allowed types', () => {
      const file = { mimetype: 'image/png' };
      expect(
        FileUtils.validateFileType(file, ['image/png', 'image/jpeg']),
      ).toBe(true);
    });

    it('should return false for restricted types', () => {
      const file = { mimetype: 'application/pdf' };
      expect(FileUtils.validateFileType(file, ['image/png'])).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate within max size', () => {
      const file = { size: 1024 }; // 1KB
      expect(FileUtils.validateFileSize(file, 2048)).toBe(true);
      expect(FileUtils.validateFileSize(file, 512)).toBe(false);
    });
  });

  describe('generateFileName', () => {
    it('should preserve original extension', () => {
      const name = FileUtils.generateFileName('portrait.png');
      expect(name.endsWith('.png')).toBe(true);
    });

    it('should handle multiple dots', () => {
      const name = FileUtils.generateFileName('data.archive.tar.gz');
      // getFileExtension currently returns 'gz'
      expect(name.endsWith('.gz')).toBe(true);
    });
  });

  describe('getFileExtension', () => {
    it('should extract correct extensions', () => {
      expect(FileUtils.getFileExtension('main.ts')).toBe('ts');
      expect(FileUtils.getFileExtension('.gitignore')).toBe('gitignore');
      expect(FileUtils.getFileExtension('README')).toBe('');
    });
  });
});
