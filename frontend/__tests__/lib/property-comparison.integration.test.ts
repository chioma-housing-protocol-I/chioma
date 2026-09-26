import { describe, it, expect, beforeEach } from 'vitest';
import type { Property } from '@/types';
import {
  addToComparison,
  buildComparisonCsv,
  buildComparisonData,
  buildComparisonJson,
  buildShareUrl,
  clearSavedComparisons,
  decodeSharePayload,
  deleteSavedComparison,
  encodeSharePayload,
  filterProperties,
  isInComparison,
  listSavedComparisons,
  loadSavedComparison,
  MAX_COMPARISON_PROPERTIES,
  removeFromComparison,
  resolveSharedComparison,
  saveComparison,
} from '@/lib/property-comparison';

const mockProperties: Property[] = [
  {
    id: 'prop-1',
    title: 'Lagos Waterfront Apartment',
    description: 'Modern apartment with ocean views in Victoria Island',
    address: '12 Ahmadu Bello Way',
    city: 'Lagos',
    state: 'LA',
    country: 'Nigeria',
    price: 1200,
    bedrooms: 2,
    bathrooms: 1,
    area: 900,
    squareFeet: 900,
    type: 'apartment',
    propertyType: 'apartment',
    status: 'published',
    images: [],
    amenities: [
      { id: 'a1', name: 'Pool' },
      { id: 'a2', name: 'Gym' },
    ],
    ownerId: 'landlord-1',
    landlordId: 'landlord-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'prop-2',
    title: 'Abuja Family House',
    description: 'Spacious house near the city center',
    address: '8 Independence Avenue',
    city: 'Abuja',
    state: 'FC',
    country: 'Nigeria',
    price: 2500,
    bedrooms: 3,
    bathrooms: 2,
    area: 1800,
    squareFeet: 1800,
    type: 'house',
    propertyType: 'house',
    status: 'published',
    images: [],
    amenities: [
      { id: 'a3', name: 'Parking' },
      { id: 'a4', name: 'Garden' },
    ],
    ownerId: 'landlord-2',
    landlordId: 'landlord-2',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'prop-3',
    title: 'Lagos Studio Flat',
    description: 'Compact studio for young professionals',
    address: '5 Admiralty Way',
    city: 'Lagos',
    state: 'LA',
    country: 'Nigeria',
    price: 800,
    bedrooms: 1,
    bathrooms: 1,
    area: 450,
    squareFeet: 450,
    type: 'other',
    propertyType: 'other',
    status: 'rented',
    images: [],
    amenities: [{ id: 'a5', name: 'Gym' }],
    ownerId: 'landlord-3',
    landlordId: 'landlord-3',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

describe('property comparison integration', () => {
  beforeEach(() => {
    clearSavedComparisons();
  });

  describe('filtering and selection workflow', () => {
    it('filters properties by city, price, bedrooms, status, and search query', () => {
      const filtered = filterProperties(
        mockProperties,
        {
          city: 'Lagos',
          minPrice: 700,
          maxPrice: 1300,
          bedrooms: 2,
          status: 'published',
        },
        'waterfront',
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('prop-1');
    });

    it('selects, deduplicates, and enforces comparison limits', () => {
      let selected: string[] = [];

      const first = addToComparison(selected, 'prop-1');
      expect(first.added).toBe(true);
      selected = first.selectedIds;

      const duplicate = addToComparison(selected, 'prop-1');
      expect(duplicate.added).toBe(false);
      expect(duplicate.error).toBe('Property already selected');

      selected = addToComparison(selected, 'prop-2').selectedIds;
      selected = addToComparison(selected, 'prop-3').selectedIds;

      expect(isInComparison(selected, 'prop-2')).toBe(true);
      expect(removeFromComparison(selected, 'prop-2')).toEqual([
        'prop-1',
        'prop-3',
      ]);

      selected = ['p1', 'p2', 'p3', 'p4'];
      const overflow = addToComparison(
        selected,
        'p5',
        MAX_COMPARISON_PROPERTIES,
      );
      expect(overflow.added).toBe(false);
      expect(overflow.error).toContain(String(MAX_COMPARISON_PROPERTIES));
    });
  });

  describe('comparison data retrieval', () => {
    it('builds accurate comparison rows and amenity matrix', () => {
      const data = buildComparisonData(mockProperties, ['prop-1', 'prop-2']);

      expect(data).not.toBeNull();
      expect(data?.properties).toHaveLength(2);
      expect(data?.rows).toEqual([
        {
          label: 'Location',
          values: {
            'prop-1': 'Lagos, LA',
            'prop-2': 'Abuja, FC',
          },
        },
        {
          label: 'Price',
          values: {
            'prop-1': 1200,
            'prop-2': 2500,
          },
        },
        {
          label: 'Bedrooms',
          values: {
            'prop-1': 2,
            'prop-2': 3,
          },
        },
        {
          label: 'Bathrooms',
          values: {
            'prop-1': 1,
            'prop-2': 2,
          },
        },
        {
          label: 'Square Feet',
          values: {
            'prop-1': 900,
            'prop-2': 1800,
          },
        },
      ]);

      expect(data?.amenityMatrix).toEqual(
        expect.arrayContaining([
          {
            amenity: 'Garden',
            byPropertyId: { 'prop-1': false, 'prop-2': true },
          },
          {
            amenity: 'Gym',
            byPropertyId: { 'prop-1': true, 'prop-2': false },
          },
          {
            amenity: 'Pool',
            byPropertyId: { 'prop-1': true, 'prop-2': false },
          },
        ]),
      );
    });

    it('returns null when no valid properties are selected', () => {
      expect(buildComparisonData(mockProperties, [])).toBeNull();
      expect(buildComparisonData(mockProperties, ['missing-id'])).toBeNull();
    });
  });

  describe('export formats', () => {
    it('exports CSV with escaped values and amenity rows', () => {
      const data = buildComparisonData(mockProperties, ['prop-1', 'prop-2']);
      const csv = buildComparisonCsv(data!);

      expect(csv).toContain(
        '"Field","Lagos Waterfront Apartment","Abuja Family House"',
      );
      expect(csv).toContain('"Price","1200","2500"');
      expect(csv).toContain('"Pool","Yes","No"');
    });

    it('exports JSON with property metadata and comparison rows', () => {
      const data = buildComparisonData(mockProperties, ['prop-1', 'prop-2']);
      const json = buildComparisonJson(data!);
      const parsed = JSON.parse(json) as {
        propertyCount: number;
        properties: Array<{ id: string; title: string }>;
        rows: unknown[];
      };

      expect(parsed.propertyCount).toBe(2);
      expect(parsed.properties.map((property) => property.id)).toEqual([
        'prop-1',
        'prop-2',
      ]);
      expect(parsed.rows).toHaveLength(5);
    });
  });

  describe('saved comparisons', () => {
    it('persists, lists, loads, and deletes saved comparisons', () => {
      const saved = saveComparison('Weekend shortlist', ['prop-1', 'prop-3']);

      expect(saved.name).toBe('Weekend shortlist');
      expect(listSavedComparisons()).toHaveLength(1);
      expect(loadSavedComparison(saved.id)?.propertyIds).toEqual([
        'prop-1',
        'prop-3',
      ]);

      deleteSavedComparison(saved.id);
      expect(listSavedComparisons()).toHaveLength(0);
      expect(loadSavedComparison(saved.id)).toBeNull();
    });

    it('rejects invalid save requests', () => {
      expect(() => saveComparison('', ['prop-1'])).toThrow(
        'Comparison name is required',
      );
      expect(() => saveComparison('Empty list', [])).toThrow(
        'At least one property is required',
      );
    });
  });

  describe('sharing', () => {
    it('encodes and decodes share payloads consistently', () => {
      const payload = {
        v: 1 as const,
        ids: ['prop-1', 'prop-2'],
        name: 'Share me',
      };
      const encoded = encodeSharePayload(payload);
      const decoded = decodeSharePayload(encoded);

      expect(decoded).toEqual(payload);
      expect(decodeSharePayload('invalid-token')).toBeNull();
    });

    it('builds share URLs and resolves shared comparison data', () => {
      const payload = { v: 1 as const, ids: ['prop-1', 'prop-2'] };
      const url = buildShareUrl('/properties/compare', payload);

      expect(url).toContain('/properties/compare?share=');

      const encoded = url.split('share=')[1] ?? '';
      const decoded = decodeSharePayload(encoded);
      const resolved = resolveSharedComparison(mockProperties, decoded!);

      expect(resolved?.properties.map((property) => property.id)).toEqual([
        'prop-1',
        'prop-2',
      ]);
    });
  });

  describe('end-to-end comparison flow', () => {
    it('filters, selects, exports, saves, and shares a comparison', () => {
      const filtered = filterProperties(
        mockProperties,
        { city: 'Lagos', status: 'published' },
        '',
      );
      expect(filtered.map((property) => property.id)).toEqual(['prop-1']);

      let selected: string[] = [];
      for (const property of filtered) {
        const result = addToComparison(selected, property.id);
        selected = result.selectedIds;
      }

      const comparison = buildComparisonData(mockProperties, selected);
      expect(comparison?.properties[0]?.title).toBe(
        'Lagos Waterfront Apartment',
      );

      const csv = buildComparisonCsv(comparison!);
      const json = buildComparisonJson(comparison!);
      expect(csv.length).toBeGreaterThan(0);
      expect(JSON.parse(json).propertyCount).toBe(1);

      const saved = saveComparison('Lagos picks', selected);
      expect(loadSavedComparison(saved.id)?.propertyIds).toEqual(['prop-1']);

      const shareUrl = buildShareUrl('/compare', {
        v: 1,
        ids: selected,
        name: saved.name,
      });
      const shareToken = shareUrl.split('share=')[1] ?? '';
      const shared = decodeSharePayload(shareToken);

      expect(shared?.name).toBe('Lagos picks');
      expect(
        resolveSharedComparison(mockProperties, shared!)?.properties[0]?.id,
      ).toBe('prop-1');
    });
  });
});
