/**
 * Mock Property Data
 */

export interface Property {
  id: number | string;
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
  latitude: number;
  longitude: number;
  amenities: string[];
}

export const MOCK_PROPERTIES: Property[] = [
  {
    id: 1,
    title: 'Luxury 2-Bed Apartment',
    price: '$2,500',
    location: '101 Park Avenue, Manhattan, New York',
    category: 'Stand alone apartment',
    beds: 2,
    baths: 2,
    sqft: 1200,
    manager: 'Sarah Okafor',
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
    verified: true,
    latitude: 40.7128,
    longitude: -74.006,
    amenities: ['Gym', 'Pool', 'Parking', 'WiFi'],
  },
  {
    id: 2,
    title: 'Modern Loft in Kensington',
    price: '$3,800',
    location: 'High Street Kensington, London',
    category: 'Studio apartment',
    beds: 1,
    baths: 1,
    sqft: 850,
    manager: 'David Ibrahim',
    image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
    verified: true,
    latitude: 51.5014,
    longitude: -0.1919,
    amenities: ['Elevator', 'Smart Home', 'Terrace'],
  },
  {
    id: 3,
    title: 'Boutique Hotel Suite',
    price: '$1,500',
    location: 'Shibuya City, Tokyo, Japan',
    category: 'Hotel rooms',
    beds: 1,
    baths: 1,
    sqft: 400,
    manager: 'Chioma N.',
    image: 'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg',
    verified: false,
    latitude: 35.662,
    longitude: 139.7038,
    amenities: ['Room Service', 'Spa', 'Daily Cleaning'],
  },
  {
    id: 4,
    title: 'Exquisite 4-Bed Penthouse',
    price: '$15,000',
    location: 'Palm Jumeirah, Dubai, UAE',
    category: 'Stand alone apartment',
    beds: 4,
    baths: 5,
    sqft: 3200,
    manager: 'James Obi',
    image: 'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg',
    verified: true,
    latitude: 25.1124,
    longitude: 55.139,
    amenities: ['Private Beach', 'Infinity Pool', 'Helipad'],
  },
  {
    id: 5,
    title: 'Shared Living Hub',
    price: '$800',
    location: 'Neukölln, Berlin, Germany',
    category: 'Rooms in shared apartment',
    beds: 1,
    baths: 2,
    sqft: 300,
    manager: 'Emmanuel K.',
    image: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
    verified: false,
    latitude: 52.4811,
    longitude: 13.4357,
    amenities: ['Co-working Space', 'Shared Kitchen', 'Events'],
  },
  {
    id: 6,
    title: 'Student Residence Hall Block A',
    price: '$500',
    location: 'University District, Boston, MA',
    category: 'Student residence',
    beds: 1,
    baths: 1,
    sqft: 200,
    manager: 'Grace A.',
    image: 'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg',
    verified: true,
    latitude: 42.3601,
    longitude: -71.0589,
    amenities: ['Library', 'Cafeteria', 'High-Speed WiFi'],
  },
  {
    id: 7,
    title: 'Cozy Airbnb Escape',
    price: '$1,200',
    location: 'Santorini, Greece',
    category: 'Airbnb',
    beds: 2,
    baths: 1,
    sqft: 900,
    manager: 'Elena V.',
    image: 'https://images.pexels.com/photos/1579253/pexels-photo-1579253.jpeg',
    verified: true,
    latitude: 36.3932,
    longitude: 25.4615,
    amenities: ['Ocean View', 'Hot Tub', 'Breakfast Included'],
  },
  {
    id: 8,
    title: 'Grand City Hotel',
    price: '$4,500',
    location: 'Las Vegas Blvd, NV',
    category: 'Hotel',
    beds: 3,
    baths: 3,
    sqft: 1500,
    manager: 'MGM Corp',
    image: 'https://images.pexels.com/photos/1438761/pexels-photo-1438761.jpeg',
    verified: true,
    latitude: 36.1147,
    longitude: -115.1728,
    amenities: ['Casino', 'Valet', '24/7 Security'],
  },
];
