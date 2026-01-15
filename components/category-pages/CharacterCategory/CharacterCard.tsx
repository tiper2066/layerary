'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface PostImage {
  url: string
  thumbnailUrl?: string
  blurDataURL?: string
  name: string
  order: number
}

interface Post {
  id: string
  title: string
  thumbnailUrl?: string | null
  images?: PostImage[] | null | any
  fileUrl?: string
  concept?: string | null // 캐릭터 타입이 여기에 저장됨
}

interface CharacterCardProps {
  post: Post
  isSelected: boolean
  onClick: (postId: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  showActions?: boolean
}

export function CharacterCard({
  post,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  showActions = false,
}: CharacterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)

  // 첫 번째 이미지 정보 추출
  const getFirstImageInfo = () => {
    let images: PostImage[] = []

    if (post.images) {
      if (Array.isArray(post.images)) {
        images = post.images as PostImage[]
      } else if (typeof post.images === 'string') {
        try {
          const parsed = JSON.parse(post.images)
          images = Array.isArray(parsed) ? parsed : []
        } catch {
          images = []
        }
      } else if (typeof post.images === 'object' && post.images !== null) {
        const parsed = post.images as unknown as PostImage[]
        if (Array.isArray(parsed)) {
          images = parsed
        }
      }
    }

    if (images.length > 0) {
      const sortedImages = [...images].sort((a, b) => (a.order || 0) - (b.order || 0))
      const firstImage = sortedImages[0]
      if (firstImage && firstImage.url) {
        return {
          url: firstImage.url,
          thumbnailUrl: firstImage.thumbnailUrl,
          blurDataURL: firstImage.blurDataURL,
        }
      }
    }

    const fallbackUrl = post.thumbnailUrl || post.fileUrl
    return fallbackUrl
      ? {
          url: fallbackUrl,
          thumbnailUrl: undefined,
          blurDataURL: undefined,
        }
      : null
  }

  const imageInfo = getFirstImageInfo()

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = (url: string) => {
    if (!url || url === '/placeholder.png') {
      return '/placeholder.png'
    }
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // 이미지 URL이 변경되면 로드 상태 리셋하고 이미 로드된 이미지인지 확인
  useEffect(() => {
    if (!imageInfo) {
      setImageLoaded(false)
      setError(false)
      return
    }

    // 이미지 로드 상태를 리셋하지 않고, 이미지가 로드되면 업데이트
    setError(false)

    // 이미 로드된 이미지인지 확인 (캐시된 경우)
    const img = new window.Image()
    const imageUrl = imageInfo.thumbnailUrl 
      ? getImageSrc(imageInfo.thumbnailUrl) 
      : getImageSrc(imageInfo.url)
    
    img.onload = () => {
      setImageLoaded(true)
      setError(false)
    }
    img.onerror = () => {
      setError(true)
      setImageLoaded(false)
    }
    img.src = imageUrl

    // 이미 로드된 경우 즉시 상태 업데이트
    if (img.complete && img.naturalHeight > 0) {
      setImageLoaded(true)
      setError(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageInfo?.url, imageInfo?.thumbnailUrl]) // imageInfo 객체는 매 렌더링마다 새로 생성되므로 필요한 값만 의존성에 포함

  if (!imageInfo) {
    return null
  }

  // 표시할 이미지 URL 결정
  const displayImageUrl = imageInfo.thumbnailUrl 
    ? getImageSrc(imageInfo.thumbnailUrl)
    : getImageSrc(imageInfo.url)

  return (
    <div
      className={`
        relative group cursor-pointer
        bg-card dark:bg-white border dark:border-4 rounded-lg overflow-hidden
        transition-all duration-200
        ${isSelected ? 'border-penta-blue dark:border-penta-sky' : 'hover:shadow-md'}
        h-[250px] w-full flex items-center justify-center p-10
      `}
      onClick={() => onClick(post.id)}      
    >
      {/* Blur placeholder */}
      {imageInfo.blurDataURL && !imageLoaded && (
        <div className="absolute inset-0">
          <Image
            src={imageInfo.blurDataURL}
            alt=""
            fill
            className="object-cover"
            style={{
              filter: 'blur(10px)',
              transform: 'scale(1.1)',
            }}
            aria-hidden="true"
            unoptimized // blur placeholder는 최적화 불필요
          />
        </div>
      )}

      {/* 메인 이미지 */}
      <div
        ref={imgRef}
        className={`
          relative w-full h-full flex items-center justify-center
          transition-opacity duration-300
          ${imageLoaded ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <div className="relative w-full max-w-full" style={{ height: '168px', maxHeight: '168px' }}>
          <Image
            src={displayImageUrl}
            alt={post.title}
            fill
            className="object-contain"
            onLoad={() => {
              setImageLoaded(true)
              setError(false)
            }}
            onError={() => {
              setError(true)
              setImageLoaded(false)
            }}
            sizes="285px"
          />
        </div>
      </div>

      {/* 에러 상태 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-xs text-muted-foreground">이미지 로드 실패</span>
        </div>
      )}

      {/* 수정/삭제 버튼 (호버 시 표시) */}
      {showActions && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(post.id)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(post.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
