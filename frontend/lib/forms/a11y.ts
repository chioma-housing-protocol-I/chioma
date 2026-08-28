import type { FieldError } from 'react-hook-form';

/**
 * Wires a react-hook-form field to its error message for assistive tech:
 * `aria-invalid` flags the field, and `aria-describedby` points at the
 * paragraph rendering `error.message` (give that paragraph `id={fieldErrorId(name)}`).
 */
export function fieldErrorId(name: string): string {
  return `${name}-error`;
}

export function fieldA11yProps(name: string, error?: FieldError) {
  return {
    id: name,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? fieldErrorId(name) : undefined,
  } as const;
}
