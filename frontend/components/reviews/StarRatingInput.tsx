'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  maxStars?: number;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRatingInput({
  value,
  onChange,
  maxStars = 5,
  readOnly = false,
  size = 'md',
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const handleMouseEnter = (index: number) => {
    if (!readOnly) setHoverValue(index);
  };

  const handleMouseLeave = () => {
    if (!readOnly) setHoverValue(null);
  };

  const handleClick = (index: number) => {
    if (!readOnly) onChange(index);
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hoverValue ?? value);

        return (
          <button
            key={index}
            type="button"
            className={`
              transition-all duration-200 focus:outline-hidden
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}
            `}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
            disabled={readOnly}
            aria-label={`Rate ${starValue} stars`}
            title={`${starValue} Stars`}
          >
            <Star
              className={`
                ${starSizes[size]}
                ${
                  isFilled
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-gray-300'
                }
                transition-colors duration-200
              `}
            />
          </button>
        );
      })}
    </div>
  );
}
