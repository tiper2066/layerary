'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ZoomIn } from 'lucide-react'

interface PostImage {
  url: string
  name: string
  order: number
}

interface ImageGalleryProps {
  images: PostImage[]
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // images가 JSON 타입일 수 있으므로 타입 확인 및 변환
  let validImages: PostImage[] = []
  
  if (images) {
    // 이미 배열인 경우 (Prisma가 이미 파싱한 경우)
    if (Array.isArray(images)) {
      validImages = images as PostImage[]
    } 
    // 문자열인 경우 (JSON 문자열)
    else if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images)
        validImages = Array.isArray(parsed) ? parsed : []
      } catch {
        validImages = []
      }
    }
    // 객체인 경우 (Prisma JsonValue 타입)
    else if (typeof images === 'object' && images !== null) {
      // Prisma가 반환하는 JsonValue는 이미 파싱된 배열일 수 있음
      const parsed = images as any
      if (Array.isArray(parsed)) {
        validImages = parsed
      } else {
        validImages = []
      }
    }
  }

  if (!validImages || validImages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        이미지가 없습니다.
      </div>
    )
  }

  // order로 정렬
  const sortedImages = [...validImages].sort((a, b) => (a.order || 0) - (b.order || 0))

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = (url: string) => {
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  return (
    <div className="space-y-4 pt-20 pr-6 pb-6 pl-6 md:pt-6 flex flex-col items-center">
      {sortedImages.map((image, index) => {
        const isExpanded = expandedIndex === index

        return (
          <div key={index} className="relative group w-full flex justify-center">
            <div
              className={cn(
                'relative transition-all duration-300',
                isExpanded ? 'cursor-zoom-out w-full' : 'cursor-zoom-in w-[600px]'
              )}
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
            >
              <img
                src={getImageSrc(image.url)}
                alt={image.name || `Image ${index + 1}`}
                className="w-full h-auto object-contain"
                style={{ cursor: isExpanded ? 'zoom-out' : 'zoom-in' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

