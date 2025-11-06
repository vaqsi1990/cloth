'use client'

import React, { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'gold' | 'silver' | 'default'
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  color = 'default',
}) => {
  const [hoverRating, setHoverRating] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }

  const getColorClasses = (isFilled: boolean) => {
    if (!isFilled) {
      return 'fill-gray-200 text-gray-300'
    }
    
    switch (color) {
      case 'gold':
        return 'fill-amber-500 text-amber-500'
      case 'silver':
        return 'fill-gray-400 text-gray-400'
      default:
        return 'fill-yellow-400 text-yellow-400'
    }
  }

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value)
    }
  }

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHoverRating(value)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverRating(0)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          onMouseLeave={handleMouseLeave}
          disabled={readonly}
          className={`${sizeClasses[size]} ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } transition-all duration-150`}
        >
          <Star
            className={`${sizeClasses[size]} ${getColorClasses(star <= displayRating)} transition-colors`}
          />
        </button>
      ))}
    </div>
  )
}

export default StarRating

