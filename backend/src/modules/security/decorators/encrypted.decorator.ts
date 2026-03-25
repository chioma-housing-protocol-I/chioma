import { Column, ColumnOptions } from 'typeorm';
import { EncryptionTransformer } from '../transformers/encryption.transformer';

/**
 * A TypeORM property decorator that transparently encrypts strings or objects
 * to AES-256-GCM when writing to the database, and decrypts on reads.
 *
 * It automatically coerces the database column type to 'text'.
 */
export function Encrypted(options?: ColumnOptions): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    Column({
      type: 'text',
      ...options,
      transformer: EncryptionTransformer,
    })(target, propertyKey);
  };
}
