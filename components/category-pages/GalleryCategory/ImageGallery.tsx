'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ZoomIn } from 'lucide-react'
import Image from 'next/image'

interface PostImage {
  url: string
  thumbnailUrl?: string
  blurDataURL?: string
  name: string
  order: number
}

interface ImageGalleryProps {
  images: PostImage[]
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [imageDimensions, setImageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map())

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

  // 이미지 크기 미리 로드
  useEffect(() => {
    // sortedImages를 기반으로 이미지 크기 로드
    sortedImages.forEach((image, index) => {
      const img = new window.Image()
      img.onload = () => {
        setImageDimensions(prev => {
          const newMap = new Map(prev)
          newMap.set(index, {
            width: img.naturalWidth,
            height: img.naturalHeight,
          })
          return newMap
        })
      }
      img.src = getImageSrc(image.url)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]) // images prop이 변경될 때만 실행

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index))
  }

  return (
    <div className="space-y-4 pt-20 pr-6 pb-6 pl-6 md:pt-6 flex flex-col items-center">
      {sortedImages.map((image, index) => {
        const isExpanded = expandedIndex === index
        const isLoaded = loadedImages.has(index)
        const blurDataURL = image.blurDataURL
        const dimensions = imageDimensions.get(index)

        return (
          <div key={index} className="relative group w-full flex justify-center">
            <div
              className={cn(
                'relative transition-all duration-300',
                isExpanded ? 'cursor-zoom-out w-full' : 'cursor-zoom-in w-[600px]'
              )}
              onClick={() => setExpandedIndex(isExpanded ? null : index)}
            >
              {/* Blur-up Placeholder */}
              {blurDataURL && !isLoaded && (
                <div className="absolute inset-0">
                  <Image
                    src={blurDataURL}
                    alt=""
                    fill
                    className="object-contain"
                    style={{
                      filter: 'blur(10px)',
                      transform: 'scale(1.1)',
                    }}
                    aria-hidden="true"
                    unoptimized // blur placeholder는 최적화 불필요
                  />
                </div>
              )}
              {/* 메인 이미지 (원본) */}
              {dimensions ? (
                <div 
                  className={cn(
                    'relative transition-all duration-300',
                    isExpanded ? 'w-full' : 'w-[600px]'
                  )}
                  style={{
                    aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                  }}
                >
                  <Image
                    src={getImageSrc(image.url)}
                    alt={image.name || `Image ${index + 1}`}
                    width={dimensions.width}
                    height={dimensions.height}
                    className={cn(
                      'object-contain transition-opacity duration-300',
                      blurDataURL && !isLoaded ? 'opacity-0' : 'opacity-100',
                      isExpanded ? 'w-full h-auto' : 'w-full h-auto max-w-[600px]'
                    )}
                    style={{ cursor: isExpanded ? 'zoom-out' : 'zoom-in' }}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    priority={index === 0}
                    onLoad={() => handleImageLoad(index)}
                    onLoadingComplete={() => handleImageLoad(index)}
                    sizes={isExpanded ? '100vw' : '600px'}
                  />
                </div>
              ) : (
                // 이미지 크기를 아직 모를 때는 fill 사용
                <div 
                  className={cn(
                    'relative transition-all duration-300',
                    isExpanded ? 'w-full' : 'w-[600px]'
                  )}
                  style={{ aspectRatio: '4 / 3', minHeight: '300px' }}
                >
                  <Image
                    src={getImageSrc(image.url)}
                    alt={image.name || `Image ${index + 1}`}
                    fill
                    className={cn(
                      'object-contain transition-opacity duration-300',
                      blurDataURL && !isLoaded ? 'opacity-0' : 'opacity-100'
                    )}
                    style={{ cursor: isExpanded ? 'zoom-out' : 'zoom-in' }}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    priority={index === 0}
                    onLoad={() => handleImageLoad(index)}
                    onLoadingComplete={() => handleImageLoad(index)}
                    sizes={isExpanded ? '100vw' : '600px'}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

