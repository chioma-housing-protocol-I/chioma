/**
 * Deterministic property dataset used exclusively by E2E / integration tests.
 *
 * Rules:
 *  - IDs are stable strings so assertions on `data-property-id` are predictable.
 *  - Prices are numeric (backend entity shape) so adapter formatting is exercised.
 *  - The dataset is intentionally small (6 items) to keep assertions fast.
 *  - Each fixture covers a distinct filter scenario:
 *      • "prop-1"  – apartment, $1 500,  city: New York,  amenities: Gym + Pool
 *      • "prop-2"  – house,     $3 200,  city: London,    amenities: Parking
 *      • "prop-3"  – apartment, $800,    city: Berlin,    amenities: WiFi
 *      • "prop-4"  – house,     $5 000,  city: New York,  amenities: Pool + Parking
 *      • "prop-5"  – commercial,$2 200,  city: Tokyo,     amenities: Gym
 *      • "prop-6"  – apartment, $1 100,  city: London,    amenities: WiFi + Gym
 */

import type { Property, PropertyImage, PropertyAmenity } from '@/types';

function makeImage(url: string, primary = false): PropertyImage {
  return {
    id: `img-${Math.random().toString(36).slice(2)}`,
    url,
    isPrimary: primary,
    order: 0,
  };
}

function makeAmenity(name: string): PropertyAmenity {
  return { id: `am-${name.toLowerCase()}`, name };
}

export const E2E_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    title: 'Manhattan Studio',
    description: 'A cozy studio in the heart of Midtown Manhattan.',
    address: '10 West 57th Street',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    price: 1500,
    currency: 'USD',
    bedrooms: 0,
    bathrooms: 1,
    area: 45,
    type: 'apartment',
    status: 'published',
    isFurnished: true,
    hasParking: false,
    petsAllowed: false,
    images: [
      makeImage(
        'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
        true,
      ),
    ],
    amenities: [makeAmenity('Gym'), makeAmenity('Pool')],
    ownerId: 'owner-1',
    owner: {
      id: 'owner-1',
      email: 'sarah@example.com',
      name: 'Sarah Okafor',
      role: 'user',
      isVerified: true,
      createdAt: '',
      updatedAt: '',
    },
    verificationStatus: 'verified',
    latitude: 40.7648,
    longitude: -73.9808,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'prop-2',
    title: 'Kensington Townhouse',
    description: 'Spacious townhouse near Hyde Park.',
    address: '5 Kensington High Street',
    city: 'London',
    state: 'England',
    country: 'UK',
    price: 3200,
    currency: 'USD',
    bedrooms: 3,
    bathrooms: 2,
    area: 140,
    type: 'house',
    status: 'published',
    isFurnished: false,
    hasParking: true,
    petsAllowed: true,
    images: [
      makeImage(
        'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
        true,
      ),
    ],
    amenities: [makeAmenity('Parking')],
    ownerId: 'owner-2',
    owner: {
      id: 'owner-2',
      email: 'david@example.com',
      name: 'David Ibrahim',
      role: 'user',
      isVerified: true,
      createdAt: '',
      updatedAt: '',
    },
    verificationStatus: null,
    latitude: 51.5014,
    longitude: -0.1919,
    createdAt: '2025-01-02T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
  },
  {
    id: 'prop-3',
    title: 'Berlin Shared Studio',
    description: 'Affordable co-living space in Neukölln.',
    address: 'Karl-Marx-Strasse 40',
    city: 'Berlin',
    state: 'Berlin',
    country: 'Germany',
    price: 800,
    currency: 'USD',
    bedrooms: 1,
    bathrooms: 1,
    area: 30,
    type: 'apartment',
    status: 'published',
    isFurnished: true,
    hasParking: false,
    petsAllowed: false,
    images: [
      makeImage(
        'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg',
        true,
      ),
    ],
    amenities: [makeAmenity('WiFi')],
    ownerId: 'owner-3',
    owner: {
      id: 'owner-3',
      email: 'emm@example.com',
      name: 'Emmanuel K.',
      role: 'user',
      isVerified: false,
      createdAt: '',
      updatedAt: '',
    },
    verificationStatus: null,
    latitude: 52.4811,
    longitude: 13.4357,
    createdAt: '2025-01-03T00:00:00.000Z',
    updatedAt: '2025-01-03T00:00:00.000Z',
  },
  {
    id: 'prop-4',
    title: 'Upper East Side Penthouse',
    description: 'Luxury penthouse with rooftop terrace.',
    address: '900 Park Avenue',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    price: 5000,
    currency: 'USD',
    bedrooms: 4,
    bathrooms: 3,
    area: 280,
    type: 'house',
    status: 'published',
    isFurnished: true,
    hasParking: true,
    petsAllowed: false,
    images: [
      makeImage(
        'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg',
        true,
      ),
    ],
    amenities: [makeAmenity('Pool'), makeAmenity('Parking')],
    ownerId: 'owner-4',
    owner: {
      id: 'owner-4',
      email: 'james@example.com',
      name: 'James Obi',
      role: 'user',
      isVerified: true,
      createdAt: '',
      updatedAt: '',
    },
    verificationStatus: 'verified',
    latitude: 40.7735,
    longitude: -73.9565,
    createdAt: '2025-01-04T00:00:00.000Z',
    updatedAt: '2025-01-04T00:00:00.000Z',
  },
  {
    id: 'prop-5',
    title: 'Shibuya Office Suite',
    description: 'Modern commercial space in Shibuya.',
    address: '2-21-1 Dogenzaka',
    city: 'Tokyo',
    state: 'Tokyo',
    country: 'Japan',
    price: 2200,
    currency: 'USD',
    bedrooms: 0,
    bathrooms: 1,
    area: 60,
    type: 'commercial',
    status: 'published',
    isFurnished: false,
    hasParking: false,
    petsAllowed: false,
    images: [
      makeImage(
        'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg',
        true,
      ),
    ],
    amenities: [makeAmenity('Gym')],
    ownerId: 'owner-5',
    owner: {
      id: 'owner-5',
      email: 'chioma@example.com',
      name: 'Chioma N.',
      role: 'user',
      isVerified: false,
      createdAt: '',
      updatedAt: '',
    },
    verificationStatus: null,
    latitude: 35.662,
    longitude: 139.7038,
    createdAt: '2025-01-05T00:00:00.000Z',
    updatedAt: '2025-01-05T00:00:00.000Z',
  },
  {
    id: 'prop-6',
    title: 'Notting Hill Flat',
    description: 'Charming flat near Portobello Road.',
    address: '12 Portobello Road',
    city: 'London',
    state: 'England',
    country: 'UK',
    price: 1100,
    currency: 'USD',
    bedrooms: 1,
    bathrooms: 1,
    area: 55,
    type: 'apartment',
    status: 'published',
    isFurnished: true,
    hasParking: false,
    petsAllowed: true,
    images: [
      makeImage(
        'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
        true,
      ),
    ],
    amenities: [makeAmenity('WiFi'), makeAmenity('Gym')],
    ownerId: 'owner-6',
    owner: {
      id: 'owner-6',
      email: 'grace@example.com',
      name: 'Grace A.',
      role: 'user',
      isVerified: true,
      createdAt: '',
      updatedAt: '',
    },
    verificationStatus: 'verified',
    latitude: 51.5137,
    longitude: -0.2013,
    createdAt: '2025-01-06T00:00:00.000Z',
    updatedAt: '2025-01-06T00:00:00.000Z',
  },
];

/** Convenience: all 6 properties as a PaginatedResponse-shaped object */
export const E2E_PAGINATED_RESPONSE = {
  data: E2E_PROPERTIES,
  total: E2E_PROPERTIES.length,
  page: 1,
  limit: 12,
  totalPages: 1,
};
