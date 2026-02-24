'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
  title?: string
}

export default function ImageGallery({ images, title = 'Property Image' }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-[400px] md:h-[500px] lg:h-[600px] bg-neutral-200 rounded-3xl animate-pulse flex items-center justify-center">
        <span className="text-neutral-400 font-medium">No images available</span>
      </div>
    )
  }

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Feature Image */}
      <div className="relative w-full h-[300px] md:h-[450px] lg:h-[550px] rounded-3xl overflow-hidden group">
        <Image
          src={images[activeIndex]}
          alt={`${title} - view ${activeIndex + 1}`}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          priority
        />
        
        {/* Navigation Arrows overlay */}
        {images.length > 1 && (
          <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={handlePrevious}
              className="bg-white/80 hover:bg-white text-neutral-800 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="bg-white/80 hover:bg-white text-neutral-800 p-2 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative h-20 w-28 md:h-24 md:w-36 flex-shrink-0 rounded-xl overflow-hidden cursor-pointer snap-start transition-all duration-300 ${
                activeIndex === idx
                  ? 'ring-2 ring-brand-blue ring-offset-2 opacity-100'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
