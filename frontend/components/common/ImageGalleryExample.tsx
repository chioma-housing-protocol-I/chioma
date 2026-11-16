'use client';

import React, { useState } from 'react';
import { ImageGallery, GalleryImage } from './ImageGallery';
import { Grid3x3, Grid2x2, LayoutGrid } from 'lucide-react';

// Sample images data
const sampleImages: GalleryImage[] = [
  {
    id: '1',
    src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
    alt: 'Modern living room with large windows',
    caption: 'Spacious living room with natural lighting',
    thumbnail:
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '2',
    src: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&h=800&fit=crop',
    alt: 'Contemporary kitchen design',
    caption: 'Modern kitchen with stainless steel appliances',
    thumbnail:
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '3',
    src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
    alt: 'Elegant bedroom interior',
    caption: 'Master bedroom with minimalist design',
    thumbnail:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '4',
    src: 'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1200&h=800&fit=crop',
    alt: 'Luxurious bathroom',
    caption: 'Spa-like bathroom with modern fixtures',
    thumbnail:
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '5',
    src: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&h=800&fit=crop',
    alt: 'Outdoor patio area',
    caption: 'Beautiful outdoor living space',
    thumbnail:
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '6',
    src: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&h=800&fit=crop',
    alt: 'Home office setup',
    caption: 'Productive workspace with natural light',
    thumbnail:
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '7',
    src: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
    alt: 'Dining room',
    caption: 'Elegant dining area for family gatherings',
    thumbnail:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '8',
    src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
    alt: 'Guest bedroom',
    caption: 'Comfortable guest room with cozy decor',
    thumbnail:
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
  {
    id: '9',
    src: 'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=1200&h=800&fit=crop',
    alt: 'Garden view',
    caption: 'Beautifully landscaped backyard',
    thumbnail:
      'https://images.unsplash.com/photo-1600585152915-d208bec867a1?w=400&h=300&fit=crop',
    width: 1200,
    height: 800,
  },
];

export const ImageGalleryExample: React.FC = () => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [columns, setColumns] = useState(3);
  const [showCaptions, setShowCaptions] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<
    'square' | 'video' | 'portrait' | 'auto'
  >('auto');

  const handleFavorite = (imageId: string) => {
    setFavoriteIds((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId],
    );
  };

  const handleShare = async (image: GalleryImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: image.alt,
          text: image.caption,
          url: image.src,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(image.src);
      alert('Image URL copied to clipboard!');
    }
  };

  const handleDownload = async (image: GalleryImage) => {
    try {
      const response = await fetch(image.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.alt.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Property Gallery
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Browse through beautiful property images
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 mb-8">
          <div className="flex flex-wrap items-center gap-6">
            {/* Column Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Columns:
              </span>
              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1">
                <button
                  onClick={() => setColumns(2)}
                  className={`p-2 rounded transition-colors ${
                    columns === 2
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                  title="2 columns"
                >
                  <Grid2x2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setColumns(3)}
                  className={`p-2 rounded transition-colors ${
                    columns === 3
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                  title="3 columns"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setColumns(4)}
                  className={`p-2 rounded transition-colors ${
                    columns === 4
                      ? 'bg-blue-600 text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                  title="4 columns"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Aspect Ratio Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Aspect Ratio:
              </span>
              <select
                value={aspectRatio}
                onChange={(e) =>
                  setAspectRatio(
                    e.target.value as 'square' | 'video' | 'portrait' | 'auto',
                  )
                }
                className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm"
              >
                <option value="auto">Auto</option>
                <option value="square">Square</option>
                <option value="video">Video (16:9)</option>
                <option value="portrait">Portrait (3:4)</option>
              </select>
            </div>

            {/* Show Captions Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCaptions}
                onChange={(e) => setShowCaptions(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Show Captions
              </span>
            </label>

            {/* Favorites Counter */}
            <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {favoriteIds.length} Favorites
              </span>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <ImageGallery
          images={sampleImages}
          columns={columns}
          gap={4}
          showCaptions={showCaptions}
          enableLightbox={true}
          enableZoom={true}
          enableDownload={true}
          enableShare={true}
          enableFavorites={true}
          aspectRatio={aspectRatio}
          onFavorite={handleFavorite}
          onShare={handleShare}
          onDownload={handleDownload}
          favoriteIds={favoriteIds}
        />

        {/* Gallery Stats */}
        <div className="mt-8 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Gallery Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {sampleImages.length}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Total Images
              </p>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {favoriteIds.length}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Favorites
              </p>
            </div>
            <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {columns}
              </p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Columns
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
