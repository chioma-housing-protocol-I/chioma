export const SEP29_PROFILE_VERSION = '1.0';
export const SEP29_PROFILE_DATA_KEY = 'chioma_profile';
export const MAX_DATA_HASH_LENGTH = 128;

export interface OnChainProfileMap {
  version: string;
  type: number;
  updated: number;
  data_hash: string;
}

export function encodeProfileMapToScValXdr(profile: OnChainProfileMap): string {
  const entries = [
    encodeScMapEntry(
      encodeScValSymbol('version'),
      encodeScValSymbol(profile.version),
    ),
    encodeScMapEntry(encodeScValSymbol('type'), encodeScValU32(profile.type)),
    encodeScMapEntry(
      encodeScValSymbol('updated'),
      encodeScValU64(profile.updated),
    ),
    encodeScMapEntry(
      encodeScValSymbol('data_hash'),
      encodeScValBytes(Buffer.from(profile.data_hash, 'utf8')),
    ),
  ];

  return encodeScValMap(entries).toString('base64');
}

export function decodeProfileMapFromScValXdr(
  xdrBase64: string,
): OnChainProfileMap {
  const buffer = Buffer.from(xdrBase64, 'base64');
  const { value, offset } = decodeScVal(buffer, 0);

  if (offset !== buffer.length) {
    throw new Error('Invalid SCVal map');
  }

  if (value.type !== ScValType.Map) {
    throw new Error('Invalid SCVal map');
  }

  const result: Partial<OnChainProfileMap> = {};

  value.map.forEach((entry) => {
    if (entry.key.type !== ScValType.Symbol) {
      return;
    }

    const key = entry.key.symbol;
    const val = entry.value;

    if (key === 'version' && val.type === ScValType.Symbol) {
      result.version = val.symbol;
      return;
    }

    if (key === 'type' && val.type === ScValType.U32) {
      result.type = val.u32;
      return;
    }

    if (key === 'updated' && val.type === ScValType.U64) {
      result.updated = Number(val.u64);
      return;
    }

    if (key === 'data_hash' && val.type === ScValType.Bytes) {
      result.data_hash = Buffer.from(val.bytes).toString('utf8');
    }
  });

  if (
    result.version === undefined ||
    result.type === undefined ||
    result.updated === undefined ||
    result.data_hash === undefined
  ) {
    throw new Error('Missing required SEP-29 profile fields');
  }

  return result as OnChainProfileMap;
}

enum ScValType {
  U32 = 3,
  U64 = 5,
  Bytes = 13,
  Symbol = 15,
  Map = 17,
}

type DecodedScVal =
  | { type: ScValType.U32; u32: number }
  | { type: ScValType.U64; u64: bigint }
  | { type: ScValType.Bytes; bytes: Uint8Array }
  | { type: ScValType.Symbol; symbol: string }
  | {
      type: ScValType.Map;
      map: Array<{ key: DecodedScVal; value: DecodedScVal }>;
    };

function encodeScValSymbol(value: string): Buffer {
  return Buffer.concat([writeU32(ScValType.Symbol), writeString(value)]);
}

function encodeScValU32(value: number): Buffer {
  return Buffer.concat([writeU32(ScValType.U32), writeU32(value)]);
}

function encodeScValU64(value: number): Buffer {
  return Buffer.concat([writeU32(ScValType.U64), writeU64(BigInt(value))]);
}

function encodeScValBytes(value: Uint8Array): Buffer {
  return Buffer.concat([writeU32(ScValType.Bytes), writeOpaque(value)]);
}

function encodeScValMap(entries: Buffer[]): Buffer {
  return Buffer.concat([writeU32(ScValType.Map), writeArray(entries)]);
}

function encodeScMapEntry(key: Buffer, value: Buffer): Buffer {
  return Buffer.concat([key, value]);
}

function decodeScVal(buffer: Buffer, offset: number) {
  const { value: type, offset: offsetAfterType } = readU32(buffer, offset);

  switch (type) {
    case ScValType.Symbol: {
      const { value: symbol, offset: next } = readString(
        buffer,
        offsetAfterType,
      );
      return { value: { type: ScValType.Symbol, symbol }, offset: next };
    }
    case ScValType.U32: {
      const { value: u32, offset: next } = readU32(buffer, offsetAfterType);
      return { value: { type: ScValType.U32, u32 }, offset: next };
    }
    case ScValType.U64: {
      const { value: u64, offset: next } = readU64(buffer, offsetAfterType);
      return { value: { type: ScValType.U64, u64 }, offset: next };
    }
    case ScValType.Bytes: {
      const { value: bytes, offset: next } = readOpaque(
        buffer,
        offsetAfterType,
      );
      return { value: { type: ScValType.Bytes, bytes }, offset: next };
    }
    case ScValType.Map: {
      const { value: entries, offset: next } = readArray(
        buffer,
        offsetAfterType,
      );
      const map = entries.map((entry) => {
        const { value: key, offset: afterKey } = decodeScVal(entry, 0);
        const { value: value, offset: afterValue } = decodeScVal(
          entry,
          afterKey,
        );
        if (afterValue !== entry.length) {
          throw new Error('Invalid SCMapEntry');
        }
        return { key, value };
      });
      return { value: { type: ScValType.Map, map }, offset: next };
    }
    default:
      throw new Error('Unsupported SCVal type');
  }
}

function writeU32(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function writeU64(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  const high = Number((value >> 32n) & 0xffffffffn);
  const low = Number(value & 0xffffffffn);
  buffer.writeUInt32BE(high, 0);
  buffer.writeUInt32BE(low, 4);
  return buffer;
}

function writeString(value: string): Buffer {
  return writeOpaque(Buffer.from(value, 'utf8'));
}

function writeOpaque(value: Uint8Array): Buffer {
  const length = value.length;
  const padding = (4 - (length % 4)) % 4;
  const buffer = Buffer.alloc(4 + length + padding);
  buffer.writeUInt32BE(length, 0);
  Buffer.from(value).copy(buffer, 4);
  return buffer;
}

function writeArray(entries: Buffer[]): Buffer {
  const length = entries.length;
  const body = Buffer.concat(entries);
  return Buffer.concat([writeU32(length), body]);
}

function readU32(buffer: Buffer, offset: number) {
  if (offset + 4 > buffer.length) {
    throw new Error('Invalid XDR buffer');
  }
  return { value: buffer.readUInt32BE(offset), offset: offset + 4 };
}

function readU64(buffer: Buffer, offset: number) {
  if (offset + 8 > buffer.length) {
    throw new Error('Invalid XDR buffer');
  }
  const high = BigInt(buffer.readUInt32BE(offset));
  const low = BigInt(buffer.readUInt32BE(offset + 4));
  return { value: (high << 32n) + low, offset: offset + 8 };
}

function readOpaque(buffer: Buffer, offset: number) {
  const { value: length, offset: afterLength } = readU32(buffer, offset);
  const end = afterLength + length;
  if (end > buffer.length) {
    throw new Error('Invalid XDR buffer');
  }
  const padding = (4 - (length % 4)) % 4;
  const bytes = buffer.subarray(afterLength, end);
  return { value: bytes, offset: end + padding };
}

function readString(buffer: Buffer, offset: number) {
  const { value, offset: next } = readOpaque(buffer, offset);
  return { value: Buffer.from(value).toString('utf8'), offset: next };
}

function readArray(buffer: Buffer, offset: number) {
  const { value: length, offset: afterLength } = readU32(buffer, offset);
  let current = afterLength;
  const entries: Buffer[] = [];

  for (let i = 0; i < length; i += 1) {
    const { value: entry, offset: next } = readScMapEntry(buffer, current);
    entries.push(entry);
    current = next;
  }

  return { value: entries, offset: current };
}

function readScMapEntry(buffer: Buffer, offset: number) {
  const start = offset;
  const { offset: afterKey } = decodeScVal(buffer, offset);
  const { offset: afterValue } = decodeScVal(buffer, afterKey);
  return { value: buffer.subarray(start, afterValue), offset: afterValue };
}
