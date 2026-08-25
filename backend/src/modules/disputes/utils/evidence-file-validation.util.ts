/**
 * Content-based validation for dispute evidence uploads.
 *
 * The client-declared MIME type is never trusted: the actual file content is
 * sniffed by magic bytes and must match one of the allowed evidence types.
 */

/** Default maximum evidence file size (10MB); configurable via env. */
export const DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** MIME types accepted as dispute evidence. */
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

type SniffedType = (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];

interface MagicSignature {
  mime: SniffedType;
  bytes: number[];
  offset?: number;
}

const MAGIC_SIGNATURES: MagicSignature[] = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  {
    mime: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  // GIF87a
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  // GIF89a
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  // %PDF
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  // Legacy OLE2 container (.doc)
  {
    mime: 'application/msword',
    bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  },
  // ZIP container (.docx) — PK\x03\x04
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bytes: [0x50, 0x4b, 0x03, 0x04],
  },
];

function matchesSignature(buffer: Buffer, signature: MagicSignature): boolean {
  const offset = signature.offset ?? 0;
  if (buffer.length < offset + signature.bytes.length) {
    return false;
  }
  return signature.bytes.every((byte, i) => buffer[offset + i] === byte);
}

/**
 * Heuristic for `text/plain`, which has no magic bytes: the sample must not
 * contain NUL bytes and must be predominantly printable/whitespace.
 */
function looksLikePlainText(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return false;
  }
  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  let printable = 0;
  for (const byte of sample) {
    if (byte === 0x00) {
      return false;
    }
    // Tab, LF, CR, or printable ASCII / extended range.
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d || byte >= 0x20) {
      printable++;
    }
  }
  return printable / sample.length > 0.95;
}

/**
 * Determine the actual content type of an uploaded buffer from its magic
 * bytes. Returns `null` when the content matches no allowed evidence type.
 */
export function sniffEvidenceFileType(buffer: Buffer): SniffedType | null {
  for (const signature of MAGIC_SIGNATURES) {
    if (matchesSignature(buffer, signature)) {
      return signature.mime;
    }
  }
  return looksLikePlainText(buffer) ? 'text/plain' : null;
}

export interface EvidenceFileValidationResult {
  isValid: boolean;
  /** Content type established by sniffing, when valid. */
  detectedType?: SniffedType;
  error?: string;
}

/**
 * Validate an uploaded evidence file by content, not by its declared MIME
 * header. A file passes only when its sniffed content type is allowed and
 * its size is within the cap.
 */
export function validateEvidenceFile(
  file: {
    buffer?: Buffer;
    size?: number;
  },
  maxSizeBytes: number = DEFAULT_EVIDENCE_MAX_FILE_SIZE_BYTES,
): EvidenceFileValidationResult {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    return {
      isValid: false,
      error: 'File content is missing or could not be read for validation',
    };
  }

  const size = file.size ?? file.buffer.length;
  if (size > maxSizeBytes) {
    return {
      isValid: false,
      error: `File size too large. Maximum size is ${Math.floor(maxSizeBytes / (1024 * 1024))}MB`,
    };
  }

  const detectedType = sniffEvidenceFileType(file.buffer);
  if (!detectedType) {
    return {
      isValid: false,
      error:
        'Invalid file type. Only images, PDFs, and documents are allowed (content did not match an allowed type)',
    };
  }

  return { isValid: true, detectedType };
}
