import { notFound } from 'next/navigation';
import Image from 'next/image';
import ImageGallery from '@/components/properties/ImageGallery';
import { MapPin, User, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import AmenitiesList, {
  type Amenity,
} from '@/components/properties/AmenitiesList';
import { ReviewList } from '@/components/reviews/ReviewList';
import type { Review } from '@/components/reviews/ReviewCard';
import type { RatingStats } from '@/components/reviews/RatingSummary';

interface PropertyData {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  status: 'AVAILABLE' | 'RENTED';
  images: string[];
  amenities: Amenity[];
  owner: {
    name: string;
    avatar?: string;
    contactInfo?: string;
  };
  rentalUnits: {
    total: number;
    available: number;
  };
  reviews: Review[];
  ratingStats: RatingStats;
}

// Mock function for API call
async function getProperty(id: string): Promise<PropertyData | null> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (id === '1') {
    return {
      id: '1',
      title: 'Luxury 2-Bed Apartment',
      description:
        'Experience premium living in this beautifully designed luxury apartment. Featuring modern architecture, high-end finishing, and breathtaking views of the city skyline. Perfectly suited for professionals and small families seeking comfort and elegance in the heart of Victoria Island.',
      price: '₦2,500,000',
      location: '101 Adeola Odeku St, Victoria Island, Lagos',
      status: 'AVAILABLE',
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
      ],
      amenities: [
        { name: 'High-Speed WiFi' },
        { name: 'Air Conditioning' },
        { name: 'Swimming Pool' },
        { name: '24/7 Security' },
        { name: 'Fully Fitted Kitchen' },
        { name: 'Backup Power' },
        { name: 'Dedicated Parking' },
      ],
      owner: {
        name: 'Sarah Okafor',
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        contactInfo: 'Verified Landlord',
      },
      rentalUnits: {
        total: 10,
        available: 2,
      },
      reviews: [
        {
          id: '1',
          rating: 5,
          comment:
            'Absolutely stunning property! The location is perfect, and the amenities are top-notch. The landlord was very responsive and made the move-in process seamless. Highly recommend!',
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 3,
          ).toISOString(), // 3 days ago
          author: {
            id: 'u1',
            name: 'Michael T.',
            isVerified: true,
            role: 'TENANT',
          },
        },
        {
          id: '2',
          rating: 4,
          comment:
            'Great apartment with beautiful views. Slightly pricey, but the 24/7 power and security make it worth it.',
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 15,
          ).toISOString(), // 15 days ago
          author: {
            id: 'u2',
            name: 'Jane Doe',
            isVerified: false,
            role: 'TENANT',
          },
        },
      ],
      ratingStats: {
        average: 4.5,
        total: 2,
        distribution: {
          5: 1,
          4: 1,
          3: 0,
          2: 0,
          1: 0,
        },
      },
    };
  } else if (id === '2') {
    return {
      id: '2',
      title: 'Modern Loft in Lekki',
      description:
        'A spacious and modern loft located in a serene environment. It offers an open floor plan, large windows allowing natural light, and top-tier security. Ideal for singles or couples looking for a chic urban sanctuary.',
      price: '₦3,800,000',
      location: 'Block 4, Admiralty Way, Lekki Phase 1',
      status: 'RENTED',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
      ],
      amenities: [
        { name: 'Internet' },
        { name: 'AC' },
        { name: 'Gym' },
        { name: 'Inverter' },
      ],
      owner: {
        name: 'David Ibrahim',
      },
      rentalUnits: {
        total: 4,
        available: 0,
      },
      reviews: [],
      ratingStats: {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    };
  } else if (id === '3') {
    return {
      id: '3',
      title: 'Serviced Studio Flat',
      description:
        'A cozy and efficiently designed studio apartment perfect for individuals. Located in the prestigious Ikoyi area with easy access to business districts and entertainment centers. Fully serviced with weekly cleaning and maintenance.',
      price: '₦1,500,000',
      location: 'Glover Road, Ikoyi, Lagos',
      status: 'AVAILABLE',
      images: [
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
      ],
      amenities: [
        { name: 'High-Speed WiFi' },
        { name: 'Air Conditioning' },
        { name: 'Housekeeping Service' },
        { name: '24/7 Security' },
        { name: 'Kitchenette' },
        { name: 'Laundry Service' },
      ],
      owner: {
        name: 'Chioma N.',
      },
      rentalUnits: {
        total: 8,
        available: 3,
      },
      reviews: [],
      ratingStats: {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    };
  } else if (id === '4') {
    return {
      id: '4',
      title: 'Exquisite 4-Bed Duplex',
      description:
        'A magnificent duplex offering luxury living at its finest. Situated in the exclusive Banana Island, this property features spacious rooms, modern amenities, and unparalleled security. Perfect for families seeking the ultimate living experience.',
      price: '₦15,000,000',
      location: 'Banana Island, Ikoyi',
      status: 'AVAILABLE',
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&h=800&fit=crop',
      ],
      amenities: [
        { name: 'High-Speed WiFi' },
        { name: 'Central Air Conditioning' },
        { name: 'Swimming Pool' },
        { name: '24/7 Security' },
        { name: 'Gourmet Kitchen' },
        { name: 'Backup Power' },
        { name: 'Multiple Parking Spaces' },
        { name: 'Garden' },
        { name: 'Home Theater' },
      ],
      owner: {
        name: 'James Obi',
      },
      rentalUnits: {
        total: 2,
        available: 1,
      },
      reviews: [],
      ratingStats: {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    };
  } else if (id === '5') {
    return {
      id: '5',
      title: 'Cozy 1-Bed Apartment',
      description:
        'A comfortable and affordable one-bedroom apartment in the heart of Yaba. Close to major universities and tech hubs, making it ideal for students and young professionals. The area offers vibrant nightlife and easy access to public transportation.',
      price: '₦800,000',
      location: 'Yaba, Mainland, Lagos',
      status: 'AVAILABLE',
      images: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&h=800&fit=crop',
      ],
      amenities: [
        { name: 'WiFi' },
        { name: 'Air Conditioning' },
        { name: 'Security' },
        { name: 'Kitchen' },
        { name: 'Parking' },
      ],
      owner: {
        name: 'Emmanuel K.',
      },
      rentalUnits: {
        total: 12,
        available: 4,
      },
      reviews: [],
      ratingStats: {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    };
  } else if (id === '6') {
    return {
      id: '6',
      title: 'Penthouse with Sea View',
      description:
        'An exclusive penthouse offering breathtaking sea views and luxury living. Located in the prestigious Eko Atlantic City, this property features modern architecture, high-end finishes, and access to private beaches. Perfect for those who desire the ultimate coastal living experience.',
      price: '₦8,500,000',
      location: 'Eko Atlantic City, Lagos',
      status: 'AVAILABLE',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&h=800&fit=crop',
      ],
      amenities: [
        { name: 'High-Speed WiFi' },
        { name: 'Central Air Conditioning' },
        { name: 'Infinity Pool' },
        { name: '24/7 Concierge' },
        { name: 'Smart Home System' },
        { name: 'Backup Power' },
        { name: 'Private Elevator' },
        { name: 'Rooftop Terrace' },
        { name: 'Beach Access' },
      ],
      owner: {
        name: 'Grace A.',
      },
      rentalUnits: {
        total: 3,
        available: 1,
      },
      reviews: [],
      ratingStats: {
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      },
    };
  }

  return null;
}

export default async function PropertyDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) {
    notFound();
  }

  const isRented = property.status === 'RENTED';

  return (
    <>
      <Navbar theme="dark" />
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Breadcrumbs */}
          <Breadcrumbs className="mb-8" />

          {/* Header section with title, location, gallery */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-4 tracking-tight">
              {property.title}
            </h1>
            <div className="flex items-start sm:items-center text-blue-200/80 mb-6 sm:mb-8 text-base sm:text-lg font-medium gap-2">
              <MapPin className="w-5 h-5 shrink-0 text-blue-400 mt-0.5 sm:mt-0" />
              <span>{property.location}</span>
            </div>

            <ImageGallery images={property.images} title={property.title} />
          </div>

          {/* Details 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative items-start">
            {/* Left Column (Main Content - roughly 66%) */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              {/* Units Status */}
              <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div>
                  <h3 className="text-xl font-bold text-white">Rental Units</h3>
                  <p className="text-blue-200/70 mt-1">
                    Smart Contract execution enabled for transparent leasing.
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl shadow-sm text-center">
                    <span className="block text-2xl font-black text-white">
                      {property.rentalUnits.total}
                    </span>
                    <span className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
                      Total
                    </span>
                  </div>
                  <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl shadow-sm text-center">
                    <span
                      className={`block text-2xl font-black ${property.rentalUnits.available > 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {property.rentalUnits.available}
                    </span>
                    <span className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
                      Available
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  About this property
                </h3>
                <p className="text-blue-200/80 leading-relaxed text-lg">
                  {property.description}
                </p>
              </div>

              {/* Amenities */}
              <hr className="border-white/10" />
              <AmenitiesList amenities={property.amenities} />
              <hr className="border-white/10" />

              {/* Landlord Info */}
              <div className="flex items-center gap-6 p-6 rounded-2xl backdrop-blur-xl bg-slate-800/50 border border-white/10 shadow-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                  {property.owner.avatar ? (
                    <Image
                      src={property.owner.avatar}
                      alt={property.owner.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="text-white w-8 h-8" />
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    Managed by {property.owner.name}
                  </h4>
                  <div className="flex items-center text-sm font-medium text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full w-fit">
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    {property.owner.contactInfo || 'Verified Source'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (Sticky CTA - roughly 33%) */}
            <div className="lg:col-span-4 sticky top-24 lg:top-32 w-full">
              <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 shadow-2xl rounded-3xl p-5 sm:p-8">
                {/* Price */}
                <div className="mb-8 pb-6 border-b border-white/10">
                  <span className="block text-sm font-semibold text-blue-200/70 mb-1 uppercase tracking-wider">
                    Rent Price
                  </span>
                  <div className="flex items-end gap-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-extrabold text-4xl">
                    {property.price}
                    <span className="text-lg font-medium text-blue-200/70 mb-1">
                      /year
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                {isRented && (
                  <div className="mb-6 bg-red-500/20 text-red-300 px-4 py-3 rounded-xl font-bold text-center border border-red-400/30 flex items-center justify-center backdrop-blur-sm">
                    <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                    Property Not Available
                  </div>
                )}
                {!isRented && (
                  <div className="mb-6 bg-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl font-bold text-center border border-emerald-400/30 flex items-center justify-center backdrop-blur-sm">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2" />
                    Available for Smart Lease
                  </div>
                )}

                {/* Action Button */}
                <button
                  disabled={isRented}
                  className={`w-full py-4 rounded-full font-bold text-lg transition-all transform duration-200 
                    ${
                      isRented
                        ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed border border-white/10'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0'
                    }`}
                >
                  {isRented ? 'Currently Rented' : 'Initialize Rent Agreement'}
                </button>

                {!isRented && (
                  <p className="text-center text-xs text-blue-200/70 mt-4 font-medium flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Powered by secure Smart Contracts
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reviews Section at the bottom */}
          <div className="mt-20 pt-10 border-t border-white/10">
            <ReviewList
              reviews={property.reviews}
              stats={property.ratingStats}
              title="Tenant Reviews"
              subtitle="See what past and current tenants say about this property"
              onSubmitReview={async () => {
                // In a real client component, this would call an API route.
                // Since this is a server component handling client clicks via server actions is tricky inline.
                // We will just simulate a delay for UI purposes here.
                'use server';
                await new Promise((res) => setTimeout(res, 800));
              }}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
