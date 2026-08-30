/**
 * Adapter utilities that bridge the backend `Property` entity shape
 * and the `PropertyCard` display shape used in the UI.
 *
 * The backend returns snake_case / camelCase entity fields (price as number,
 * bedrooms, area, owner object, images array, etc.) whereas PropertyCard
 * expects a flat, display-friendly shape with formatted price strings.
 */

import type { Property } from '@/types';

/** Shape that PropertyCard.tsx consumes directly. */
export interface PropertyCardShape {
  id: string | number;
  title: string;
  price: string;
  location: string;
  category: string;
  beds: number;
  baths: number;
  sqft: number;
  manager: string;
  image: string;
  verified: boolean;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  description?: string;
  images?: string[];
}

/**
 * Format a numeric price into a display string (e.g. 2500 → "$2,500").
 * Falls back gracefully when the value is missing or zero.
 */
function formatPrice(price: number | undefined, currency = 'USD'): string {
  if (!price) return 'N/A';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${price.toLocaleString()}`;
  }
}

/**
 * Resolve the primary image URL from a property's images array.
 * Prefers `isPrimary: true`; falls back to the first image; then a placeholder.
 */
function resolvePrimaryImage(property: Property): string {
  const { images } = property;
  if (!images || images.length === 0) {
    return 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg';
  }
  const primary = images.find((img) => img.isPrimary);
  return (primary ?? images[0]).url;
}

/**
 * Derive a human-readable manager/owner name from the property.
 * Uses `owner.name` if available; falls back to "Property Manager".
 */
function resolveManagerName(property: Property): string {
  // Support both `owner` (new) and `landlord` (legacy alias)
  const owner =
    property.owner ??
    (property as unknown as { landlord?: { name?: string } }).landlord;
  return owner?.name ?? 'Property Manager';
}

/**
 * Map a backend `Property` to a `PropertyCardShape` suitable for rendering
 * in `PropertyCard`.
 */
export function toPropertyCardShape(property: Property): PropertyCardShape {
  const currency = property.currency ?? 'USD';

  // Prefer the new `type` field; fall back to legacy `propertyType`
  const rawType =
    property.type ??
    (property as { propertyType?: string }).propertyType ??
    'apartment';
  const category = rawType.charAt(0).toUpperCase() + rawType.slice(1);

  // Prefer the new `area` field; fall back to legacy `squareFeet`
  const sqft =
    property.area ?? (property as { squareFeet?: number }).squareFeet ?? 0;

  const allImageUrls = (property.images ?? []).map((img) => img.url);

  const amenityNames = (property.amenities ?? []).map((a) => a.name);

  // Build a single address string from available parts
  const locationParts = [
    property.address,
    property.city,
    property.state,
    property.country,
  ].filter(Boolean);
  const location = locationParts.join(', ') || 'Location not specified';

  return {
    id: property.id,
    title: property.title,
    price: formatPrice(property.price, currency),
    location,
    category,
    beds: property.bedrooms ?? 0,
    baths: property.bathrooms ?? 0,
    sqft,
    manager: resolveManagerName(property),
    image: resolvePrimaryImage(property),
    verified: property.verificationStatus === 'verified',
    latitude: property.latitude,
    longitude: property.longitude,
    amenities: amenityNames,
    description: property.description,
    images: allImageUrls.length > 0 ? allImageUrls : undefined,
  };
}
