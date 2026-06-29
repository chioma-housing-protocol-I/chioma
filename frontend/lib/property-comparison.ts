import type { Property } from '@/types';
import type { PropertyFilter } from '@/store/property-store';
import {
  readStorage,
  writeStorage,
  removeStorage,
} from '@/lib/persistence/storage';
import { z } from 'zod';

export const MAX_COMPARISON_PROPERTIES = 4;
export const COMPARISON_STORAGE_NAMESPACE = 'property-comparison';
const SAVED_COMPARISONS_KEY = 'saved';
const SAVED_COMPARISONS_VERSION = 1;

export interface ComparisonRow {
  label: string;
  values: Record<string, string | number>;
}

export interface ComparisonAmenityRow {
  amenity: string;
  byPropertyId: Record<string, boolean>;
}

export interface ComparisonData {
  properties: Property[];
  rows: ComparisonRow[];
  amenityMatrix: ComparisonAmenityRow[];
}

export interface SavedComparison {
  id: string;
  name: string;
  propertyIds: string[];
  createdAt: string;
}

export interface ShareComparisonPayload {
  v: 1;
  ids: string[];
  name?: string;
}

const savedComparisonSchema = z.object({
  id: z.string(),
  name: z.string(),
  propertyIds: z.array(z.string()),
  createdAt: z.string(),
});

const savedComparisonsSchema = z.array(savedComparisonSchema);

const sharePayloadSchema = z.object({
  v: z.literal(1),
  ids: z.array(z.string()).min(1),
  name: z.string().optional(),
});

function escapeCsvValue(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function propertyMatchesSearch(property: Property, searchQuery: string): boolean {
  const query = normalizeSearch(searchQuery);
  if (!query) return true;

  const haystack = [
    property.title,
    property.description,
    property.address,
    property.city,
    property.state,
    property.country,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

export function filterProperties(
  properties: Property[],
  filters: PropertyFilter,
  searchQuery = '',
): Property[] {
  return properties.filter((property) => {
    if (filters.city && property.city !== filters.city) {
      return false;
    }

    if (
      filters.propertyType &&
      property.propertyType !== filters.propertyType
    ) {
      return false;
    }

    if (filters.status && property.status !== filters.status) {
      return false;
    }

    if (filters.minPrice !== undefined && property.price < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice !== undefined && property.price > filters.maxPrice) {
      return false;
    }

    if (
      filters.bedrooms !== undefined &&
      property.bedrooms !== filters.bedrooms
    ) {
      return false;
    }

    return propertyMatchesSearch(property, searchQuery);
  });
}

export function addToComparison(
  selectedIds: string[],
  propertyId: string,
  max = MAX_COMPARISON_PROPERTIES,
): { selectedIds: string[]; added: boolean; error?: string } {
  if (selectedIds.includes(propertyId)) {
    return { selectedIds, added: false, error: 'Property already selected' };
  }

  if (selectedIds.length >= max) {
    return {
      selectedIds,
      added: false,
      error: `Cannot compare more than ${max} properties`,
    };
  }

  return { selectedIds: [...selectedIds, propertyId], added: true };
}

export function removeFromComparison(
  selectedIds: string[],
  propertyId: string,
): string[] {
  return selectedIds.filter((id) => id !== propertyId);
}

export function isInComparison(
  selectedIds: string[],
  propertyId: string,
): boolean {
  return selectedIds.includes(propertyId);
}

export function buildComparisonData(
  properties: Property[],
  selectedIds: string[],
): ComparisonData | null {
  if (selectedIds.length === 0) {
    return null;
  }

  const selected = selectedIds
    .map((id) => properties.find((property) => property.id === id))
    .filter((property): property is Property => property !== undefined);

  if (selected.length === 0) {
    return null;
  }

  const amenityNames = Array.from(
    new Set(
      selected.flatMap((property) =>
        property.amenities.map((amenity) => amenity.name),
      ),
    ),
  ).sort();

  const rows: ComparisonRow[] = [
    {
      label: 'Location',
      values: Object.fromEntries(
        selected.map((property) => [
          property.id,
          `${property.city}, ${property.state}`,
        ]),
      ),
    },
    {
      label: 'Price',
      values: Object.fromEntries(
        selected.map((property) => [property.id, property.price]),
      ),
    },
    {
      label: 'Bedrooms',
      values: Object.fromEntries(
        selected.map((property) => [property.id, property.bedrooms]),
      ),
    },
    {
      label: 'Bathrooms',
      values: Object.fromEntries(
        selected.map((property) => [property.id, property.bathrooms]),
      ),
    },
    {
      label: 'Square Feet',
      values: Object.fromEntries(
        selected.map((property) => [property.id, property.squareFeet]),
      ),
    },
  ];

  const amenityMatrix: ComparisonAmenityRow[] = amenityNames.map(
    (amenity) => ({
      amenity,
      byPropertyId: Object.fromEntries(
        selected.map((property) => [
          property.id,
          property.amenities.some((item) => item.name === amenity),
        ]),
      ),
    }),
  );

  return {
    properties: selected,
    rows,
    amenityMatrix,
  };
}

export function buildComparisonCsv(data: ComparisonData): string {
  const headers = [
    'Field',
    ...data.properties.map((property) => property.title),
  ];
  const lines = [headers.map(escapeCsvValue).join(',')];

  for (const row of data.rows) {
    lines.push(
      [
        row.label,
        ...data.properties.map((property) => row.values[property.id] ?? ''),
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  }

  for (const amenityRow of data.amenityMatrix) {
    lines.push(
      [
        amenityRow.amenity,
        ...data.properties.map((property) =>
          amenityRow.byPropertyId[property.id] ? 'Yes' : 'No',
        ),
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  }

  return lines.join('\n');
}

export function buildComparisonJson(data: ComparisonData): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      propertyCount: data.properties.length,
      properties: data.properties.map((property) => ({
        id: property.id,
        title: property.title,
        city: property.city,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFeet: property.squareFeet,
      })),
      rows: data.rows,
      amenityMatrix: data.amenityMatrix,
    },
    null,
    2,
  );
}

function readSavedComparisons(): SavedComparison[] {
  const stored = readStorage<SavedComparison[]>(
    COMPARISON_STORAGE_NAMESPACE,
    SAVED_COMPARISONS_KEY,
    {
      schema: savedComparisonsSchema,
      version: SAVED_COMPARISONS_VERSION,
    },
  );

  return stored ?? [];
}

function writeSavedComparisons(comparisons: SavedComparison[]): void {
  writeStorage(
    COMPARISON_STORAGE_NAMESPACE,
    SAVED_COMPARISONS_KEY,
    comparisons,
    SAVED_COMPARISONS_VERSION,
  );
}

export function saveComparison(
  name: string,
  propertyIds: string[],
): SavedComparison {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('Comparison name is required');
  }

  if (propertyIds.length === 0) {
    throw new Error('At least one property is required');
  }

  const saved: SavedComparison = {
    id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: trimmedName,
    propertyIds: [...propertyIds],
    createdAt: new Date().toISOString(),
  };

  const comparisons = readSavedComparisons();
  comparisons.push(saved);
  writeSavedComparisons(comparisons);

  return saved;
}

export function listSavedComparisons(): SavedComparison[] {
  return readSavedComparisons();
}

export function loadSavedComparison(id: string): SavedComparison | null {
  return readSavedComparisons().find((comparison) => comparison.id === id) ?? null;
}

export function deleteSavedComparison(id: string): void {
  const comparisons = readSavedComparisons().filter(
    (comparison) => comparison.id !== id,
  );
  writeSavedComparisons(comparisons);
}

export function clearSavedComparisons(): void {
  removeStorage(COMPARISON_STORAGE_NAMESPACE, SAVED_COMPARISONS_KEY);
}

export function encodeSharePayload(payload: ShareComparisonPayload): string {
  const validated = sharePayloadSchema.parse(payload);
  return encodeBase64Url(JSON.stringify(validated));
}

export function decodeSharePayload(encoded: string): ShareComparisonPayload | null {
  try {
    const json = decodeBase64Url(encoded);
    const parsed = sharePayloadSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(
  basePath: string,
  payload: ShareComparisonPayload,
): string {
  const encoded = encodeSharePayload(payload);
  const separator = basePath.includes('?') ? '&' : '?';
  return `${basePath}${separator}share=${encoded}`;
}

export function resolveSharedComparison(
  properties: Property[],
  payload: ShareComparisonPayload,
): ComparisonData | null {
  return buildComparisonData(properties, payload.ids);
}
