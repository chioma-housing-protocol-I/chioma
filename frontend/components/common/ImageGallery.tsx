'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Share2,
  Maximize2,
  Grid3x3,
  Heart,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  thumbnail?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface ImageGalleryProps {
  images: GalleryImage[];
  className?: string;
  columns?: number;
  gap?: number;
  showCaptions?: boolean;
  enableLightbox?: boolean;
  enableZoom?: boolean;
  enableDownload?: boolean;
  enableShare?: boolean;
  enableFavorites?: boolean;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  onImageClick?: (image: GalleryImage, index: number) => void;
  onFavorite?: (imageId: string) => void;
  onShare?: (image: GalleryImage) => void;
  onDownload?: (image: GalleryImage) => void;
  favoriteIds?: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className,
  columns = 3,
  gap = 4,
  showCaptions = false,
  enableLightbox = true,
  enableZoom = true,
  enableDownload = true,
  enableShare = false,
  enableFavorites = false,
  aspectRatio = 'auto',
  onImageClick,
  onFavorite,
  onShare,
  onDownload,
  favoriteIds = [],
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isGridView, setIsGridView] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentImage = images[currentImageIndex];

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, currentImageIndex, zoomLevel]);

  const openLightbox = useCallback(
    (index: number) => {
      if (!enableLightbox) return;
      setCurrentImageIndex(index);
      setLightboxOpen(true);
      setZoomLevel(1);
      document.body.style.overflow = 'hidden';
    },
    [enableLightbox],
  );

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setZoomLevel(1);
    document.body.style.overflow = 'auto';
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoomLevel(1);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoomLevel(1);
  }, [images.length]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  const handleImageClick = useCallback(
    (image: GalleryImage, index: number) => {
      if (onImageClick) {
        onImageClick(image, index);
      } else if (enableLightbox) {
        openLightbox(index);
      }
    },
    [onImageClick, enableLightbox, openLightbox],
  );

  const handleDownloadImage = useCallback(
    async (image: GalleryImage) => {
      if (onDownload) {
        onDownload(image);
        return;
      }

      try {
        const response = await fetch(image.src);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = image.alt || `image-${image.id}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to download image:', error);
      }
    },
    [onDownload],
  );

  const handleShareImage = useCallback(
    (image: GalleryImage) => {
      if (onShare) {
        onShare(image);
        return;
      }

      if (navigator.share) {
        navigator.share({
          title: image.alt,
          text: image.caption,
          url: image.src,
        });
      }
    },
    [onShare],
  );

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square';
      case 'video':
        return 'aspect-video';
      case 'portrait':
        return 'aspect-[3/4]';
      default:
        return '';
    }
  };

  const getGridColumns = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-1 sm:grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  return (
    <>
      {/* Gallery Grid */}
      <div className={cn('w-full', className)}>
        <div
          className={cn('grid', getGridColumns())}
          style={{ gap: `${gap * 0.25}rem` }}
        >
          {images.map((image, index) => {
            const isFavorite = favoriteIds.includes(image.id);
            const isHovered = hoveredIndex === index;

            return (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative group cursor-pointer overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => handleImageClick(image, index)}
              >
                <div className={cn('relative', getAspectRatioClass())}>
                  <Image
                    src={image.thumbnail || image.src}
                    alt={image.alt}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                    sizes={`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${100 / columns}vw`}
                  />

                  {/* Overlay on Hover */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center"
                      >
                        <div className="flex items-center gap-3">
                          {enableFavorites && onFavorite && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onFavorite(image.id);
                              }}
                              className={cn(
                                'p-2 rounded-full transition-colors',
                                isFavorite
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30',
                              )}
                              aria-label="Favorite"
                            >
                              <Heart
                                className="w-5 h-5"
                                fill={isFavorite ? 'currentColor' : 'none'}
                              />
                            </button>
                          )}
                          <button
                            className="p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
                            aria-label="View full size"
                          >
                            <Maximize2 className="w-5 h-5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Caption */}
                {showCaptions && image.caption && (
                  <div className="p-3 bg-white dark:bg-neutral-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2">
                      {image.caption}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-50 p-2 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Top Controls */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                {currentImageIndex + 1} / {images.length}
              </div>

              {enableZoom && (
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomOut();
                    }}
                    className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="w-5 h-5" />
                  </button>
                  <span className="text-white text-sm font-medium px-2">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomIn();
                    }}
                    className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
              {enableDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadImage(currentImage);
                  }}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
                  aria-label="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              {enableShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShareImage(currentImage);
                  }}
                  className="p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevious();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Main Image */}
            <motion.div
              key={currentImageIndex}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: zoomLevel, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-[90vw] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                width={currentImage.width || 1920}
                height={currentImage.height || 1080}
                className="max-w-full max-h-[80vh] object-contain"
                priority
              />
            </motion.div>

            {/* Caption in Lightbox */}
            {currentImage.caption && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl px-6 py-3 bg-white/10 backdrop-blur-sm rounded-lg text-white text-center">
                <p className="text-sm">{currentImage.caption}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
