'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

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
  subtitle?: string | null
  thumbnailUrl?: string | null
  images?: PostImage[] | null | any // Prisma JSON 필드는 any 타입일 수 있음
  fileUrl?: string
}

interface PostCardProps {
  post: Post
  categorySlug?: string
  onClick?: (postId: string) => void
}

export function PostCard({ post, categorySlug, onClick }: PostCardProps) {
  const router = useRouter()

  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // 첫 번째 이미지 정보 추출 (썸네일 우선)
  const getFirstImageInfo = () => {
    // images가 JSON 타입일 수 있으므로 타입 확인
    let images: PostImage[] = []
    
    if (post.images) {
      // 이미 배열인 경우 (Prisma가 이미 파싱한 경우)
      if (Array.isArray(post.images)) {
        images = post.images as PostImage[]
      } 
      // 문자열인 경우 (JSON 문자열)
      else if (typeof post.images === 'string') {
        try {
          const parsed = JSON.parse(post.images)
          images = Array.isArray(parsed) ? parsed : []
        } catch {
          images = []
        }
      }
      // 객체인 경우 (Prisma JsonValue 타입)
      else if (typeof post.images === 'object' && post.images !== null) {
        // Prisma가 반환하는 JsonValue는 이미 파싱된 배열일 수 있음
        const parsed = post.images as any
        if (Array.isArray(parsed)) {
          images = parsed
        } else {
          images = []
        }
      }
    }

    if (images.length > 0) {
      // order로 정렬
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
    
    // fallback: post의 thumbnailUrl 또는 fileUrl 사용
    const fallbackUrl = post.thumbnailUrl || post.fileUrl
    if (fallbackUrl) {
      return {
        url: fallbackUrl,
        thumbnailUrl: undefined,
        blurDataURL: undefined,
      }
    }
    
    // 최종 fallback
    return {
      url: '/placeholder.png',
      thumbnailUrl: undefined,
      blurDataURL: undefined,
    }
  }

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

  // 게시물의 모든 이미지 가져오기
  const getAllImages = (): PostImage[] => {
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
        const parsed = post.images as any
        if (Array.isArray(parsed)) {
          images = parsed
        }
      }
    }

    if (images.length > 0) {
      return [...images].sort((a, b) => (a.order || 0) - (b.order || 0))
    }
    
    return []
  }

  const handleClick = () => {
    // 게시물의 모든 이미지 프리로드 (원본 이미지)
    const allImages = getAllImages()
    if (allImages.length > 0) {
      allImages.forEach((image) => {
        const img = new Image()
        const imageUrl = getImageSrc(image.url)
        img.src = imageUrl
      })
    }
    
    // 네비게이션
    if (onClick) {
      onClick(post.id)
    } else if (categorySlug) {
      router.push(`/${categorySlug}/${post.id}`)
    }
  }

  const imageInfo = getFirstImageInfo()
  // 썸네일이 있으면 썸네일 사용, 없으면 원본 사용 (기존 이미지 호환)
  const displayImageUrl = imageInfo.thumbnailUrl || imageInfo.url || '/placeholder.png'
  const blurDataURL = imageInfo.blurDataURL

  // 이미지 URL이 변경되면 로드 상태 리셋하고 이미 로드된 이미지인지 확인
  useEffect(() => {
    setImageLoaded(false)
    
    // 이미지가 이미 로드되어 있는지 확인 (캐시된 이미지)
    if (imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setImageLoaded(true)
      }
    }
  }, [displayImageUrl])

  return (
    <div
      className="w-[285px] cursor-pointer group flex-shrink-0"
      onClick={handleClick}
    >
      <div className="relative w-full overflow-hidden rounded-lg bg-muted">
        {/* Blur-up Placeholder */}
        {blurDataURL && !imageLoaded && (
          <img
            src={blurDataURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'blur(10px)',
              transform: 'scale(1.1)',
            }}
            aria-hidden="true"
          />
        )}
        {/* 메인 이미지 */}
        <img
          ref={imgRef}
          key={displayImageUrl} // 이미지 URL 변경 시 재로드 보장
          src={getImageSrc(displayImageUrl)}
          alt={post.title}
          className={`w-full h-auto object-cover transition-all duration-300 group-hover:brightness-50 ${
            blurDataURL && !imageLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
          decoding="async"
          onLoad={() => {
            setImageLoaded(true)
          }}
          onError={() => {
            setImageLoaded(true)
          }}
        />
        {/* 호버 시 어두운 오버레이 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
        {/* 호버 시 좌측 하단에 제목과 부제목 표시 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <h3 className="font-medium text-sm text-white line-clamp-2 drop-shadow-lg">
            {post.title}
          </h3>
          {post.subtitle && (
            <p className="text-xs text-white/90 mt-1 line-clamp-1 drop-shadow-lg">
              {post.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

