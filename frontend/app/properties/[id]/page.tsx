import { notFound } from 'next/navigation'
import Image from 'next/image'
import ImageGallery from '@/components/properties/ImageGallery'
import AmenitiesList, { Amenity } from '@/components/properties/AmenitiesList'
import { MapPin, User, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/Properties-navbar'
import Footer from '@/components/Footer'

interface PropertyData {
    id: string
    title: string
    description: string
    price: string
    location: string
    status: 'AVAILABLE' | 'RENTED'
    images: string[]
    amenities: Amenity[]
    owner: {
        name: string
        avatar?: string
        contactInfo?: string
    }
    rentalUnits: {
        total: number
        available: number
    }
}

// Mock function for API call
async function getProperty(id: string): Promise<PropertyData | null> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (id === '1') {
        return {
            id: '1',
            title: 'Luxury 2-Bed Apartment',
            description: 'Experience premium living in this beautifully designed luxury apartment. Featuring modern architecture, high-end finishing, and breathtaking views of the city skyline. Perfectly suited for professionals and small families seeking comfort and elegance in the heart of Victoria Island.',
            price: '₦2,500,000',
            location: '101 Adeola Odeku St, Victoria Island, Lagos',
            status: 'AVAILABLE',
            images: [
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
                'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&h=800&fit=crop',
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop'
            ],
            amenities: [
                { name: 'High-Speed WiFi' },
                { name: 'Air Conditioning' },
                { name: 'Swimming Pool' },
                { name: '24/7 Security' },
                { name: 'Fully Fitted Kitchen' },
                { name: 'Backup Power' },
                { name: 'Dedicated Parking' }
            ],
            owner: {
                name: 'Sarah Okafor',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
                contactInfo: 'Verified Landlord'
            },
            rentalUnits: {
                total: 10,
                available: 2
            }
        }
    } else if (id === '2') {
        return {
            id: '2',
            title: 'Modern Loft in Lekki',
            description: 'A spacious and modern loft located in a serene environment. It offers an open floor plan, large windows allowing natural light, and top-tier security. Ideal for singles or couples looking for a chic urban sanctuary.',
            price: '₦3,800,000',
            location: 'Block 4, Admiralty Way, Lekki Phase 1',
            status: 'RENTED',
            images: [
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
                'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop'
            ],
            amenities: [
                { name: 'Internet' },
                { name: 'AC' },
                { name: 'Gym' },
                { name: 'Inverter' }
            ],
            owner: {
                name: 'David Ibrahim',
            },
            rentalUnits: {
                total: 4,
                available: 0
            }
        }
    }

    return null
}

export default async function PropertyDetailsPage({ params }: { params: { id: string } }) {
    const property = await getProperty(params.id)

    if (!property) {
        notFound()
    }

    const isRented = property.status === 'RENTED'

    return (
        <>
            <Navbar />
            <main className="min-h-screen bg-white pb-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

                    {/* Header section with title, location, gallery */}
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-sans text-gray-900 mb-4 tracking-tight">
                            {property.title}
                        </h1>
                        <div className="flex items-center text-gray-600 mb-8 text-lg font-medium">
                            <MapPin className="w-5 h-5 mr-2 text-brand-blue" />
                            <span>{property.location}</span>
                        </div>

                        <ImageGallery images={property.images} title={property.title} />
                    </div>

                    {/* Details 2-column layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative items-start">

                        {/* Left Column (Main Content - roughly 66%) */}
                        <div className="lg:col-span-8 flex flex-col gap-10">

                            {/* Units Status */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Rental Units</h3>
                                    <p className="text-gray-600 mt-1">Smart Contract execution enabled for transparent leasing.</p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-center">
                                        <span className="block text-2xl font-black text-gray-900">{property.rentalUnits.total}</span>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
                                    </div>
                                    <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 text-center">
                                        <span className={`block text-2xl font-black ${property.rentalUnits.available > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {property.rentalUnits.available}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available</span>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-4">About this property</h3>
                                <p className="text-gray-600 leading-relaxed text-lg">
                                    {property.description}
                                </p>
                            </div>

                            {/* Amenities */}
                            <hr className="border-gray-100" />
                            <AmenitiesList amenities={property.amenities} />
                            <hr className="border-gray-100" />

                            {/* Landlord Info */}
                            <div className="flex items-center gap-6 p-6 rounded-2xl bg-neutral-50 border border-neutral-100">
                                <div className="w-16 h-16 rounded-full bg-linear-to-tr from-brand-blue to-blue-400 overflow-hidden flex items-center justify-center shrink-0">
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
                                    <h4 className="text-xl font-bold text-gray-900 mb-1">Managed by {property.owner.name}</h4>
                                    <div className="flex items-center text-sm font-medium text-green-700 bg-green-100/50 px-3 py-1 rounded-full w-fit">
                                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                                        {property.owner.contactInfo || 'Verified Source'}
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Right Column (Sticky CTA - roughly 33%) */}
                        <div className="lg:col-span-4 sticky top-24 lg:top-32 w-full">
                            <div className="glass shadow-2xl rounded-3xl p-6 sm:p-8 bg-white/90 backdrop-blur-xl border border-white/50">

                                {/* Price */}
                                <div className="mb-8 pb-6 border-b border-gray-100">
                                    <span className="block text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">Rent Price</span>
                                    <div className="flex items-end gap-2 text-brand-blue font-extrabold text-4xl">
                                        {property.price}
                                        <span className="text-lg font-medium text-gray-500 mb-1">/year</span>
                                    </div>
                                </div>

                                {/* Status Badges */}
                                {isRented && (
                                    <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold text-center border border-red-100 flex items-center justify-center">
                                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                                        Property Not Available
                                    </div>
                                )}
                                {!isRented && (
                                    <div className="mb-6 bg-green-50 text-green-700 px-4 py-3 rounded-xl font-bold text-center border border-green-100 flex items-center justify-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                                        Available for Smart Lease
                                    </div>
                                )}

                                {/* Action Button */}
                                <button
                                    disabled={isRented}
                                    className={`w-full py-4 rounded-full font-bold text-lg transition-all transform duration-200 
                    ${isRented
                                            ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0'
                                        }`}
                                >
                                    {isRented ? 'Currently Rented' : 'Initialize Rent Agreement'}
                                </button>

                                {!isRented && (
                                    <p className="text-center text-xs text-gray-500 mt-4 font-medium flex items-center justify-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4" />
                                        Powered by secure Smart Contracts
                                    </p>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
            <Footer />
        </>
    )
}
