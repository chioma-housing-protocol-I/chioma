'use client';

import { Check, X, MapPin, Bed, Bath, Ruler, Info } from 'lucide-react';
import Image from 'next/image';
import { formatNumber } from '@/lib/utils/format';

interface Property {
  id: number;
  title: string;
  price: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  image: string;
  amenities: string[];
}

interface PropertyComparisonProps {
  properties: Property[];
}

export default function PropertyComparison({
  properties,
}: PropertyComparisonProps) {
  if (!properties || properties.length === 0) {
    return (
      <div className="text-center py-20 backdrop-blur-xl bg-slate-800/10 border border-white/5 rounded-[2.5rem]">
        <Info className="w-12 h-12 text-blue-200/20 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">
          No properties to compare
        </h3>
        <p className="text-blue-200/50">
          Add properties from search results to compare them side-by-side.
        </p>
      </div>
    );
  }

  const allAmenities = Array.from(
    new Set(properties.flatMap((p) => p.amenities)),
  ).sort();

  return (
    <div className="w-full overflow-hidden backdrop-blur-2xl bg-slate-900/50 border border-white/10 rounded-[2.5rem] shadow-2xl">
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="p-8 min-w-[250px] sticky left-0 bg-slate-900/80 backdrop-blur-md z-1">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    Compare
                  </h2>
                  <p className="text-blue-200/40 text-sm font-medium uppercase tracking-widest">
                    {properties.length} Properties
                  </p>
                </div>
              </th>
              {properties.map((p) => (
                <th key={p.id} className="p-8 min-w-[300px] align-top">
                  <div className="space-y-6 group">
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-110 duration-700"
                      />
                      <button className="absolute top-3 right-3 p-2 bg-slate-950/80 backdrop-blur-md rounded-full text-white/50 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-bold text-lg leading-tight line-clamp-1 group-hover:text-blue-400 transition-colors">
                        {p.title}
                      </h4>
                      <div className="text-emerald-400 font-extrabold text-2xl tracking-tight">
                        {p.price}
                        <span className="text-blue-200/30 text-sm font-medium ml-1">
                          /mo
                        </span>
                      </div>
                    </div>
                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 text-sm">
                      View Details
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {/* Basic Info Rows */}
            <ComparisonRow
              label="Location"
              icon={<MapPin className="w-4 h-4" />}
            >
              {properties.map((p) => (
                <td key={p.id} className="px-8 py-6 text-blue-200/70 text-sm">
                  {p.location}
                </td>
              ))}
            </ComparisonRow>

            <ComparisonRow label="Bedrooms" icon={<Bed className="w-4 h-4" />}>
              {properties.map((p) => (
                <td
                  key={p.id}
                  className="px-8 py-6 text-white font-bold text-lg"
                >
                  {p.beds}
                </td>
              ))}
            </ComparisonRow>

            <ComparisonRow
              label="Bathrooms"
              icon={<Bath className="w-4 h-4" />}
            >
              {properties.map((p) => (
                <td
                  key={p.id}
                  className="px-8 py-6 text-white font-bold text-lg"
                >
                  {p.baths}
                </td>
              ))}
            </ComparisonRow>

            <ComparisonRow
              label="Size (sqft)"
              icon={<Ruler className="w-4 h-4" />}
            >
              {properties.map((p) => (
                <td
                  key={p.id}
                  className="px-8 py-6 text-white font-bold text-lg"
                >
                  {formatNumber(p.sqft)}
                </td>
              ))}
            </ComparisonRow>

            {/* Amenities Section */}
            <tr className="bg-slate-800/30">
              <td
                colSpan={properties.length + 1}
                className="px-8 py-4 text-xs font-black text-blue-200/40 uppercase tracking-[0.2em]"
              >
                Amenities & Features
              </td>
            </tr>

            {allAmenities.map((amenity) => (
              <tr key={amenity} className="hover:bg-white/5 transition-colors">
                <td className="px-8 py-5 text-blue-200/70 font-medium text-sm sticky left-0 bg-slate-900/80 backdrop-blur-md z-1">
                  {amenity}
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="px-8 py-5">
                    {p.amenities.includes(amenity) ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-blue-200/20">
                        <X className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-8 py-6 font-bold text-white sticky left-0 bg-slate-900/80 backdrop-blur-md z-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
            {icon}
          </div>
          <span>{label}</span>
        </div>
      </td>
      {children}
    </tr>
  );
}
