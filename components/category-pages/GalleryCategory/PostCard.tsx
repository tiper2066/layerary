'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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
        const img = new window.Image()
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

  // post prop이 변경되면 로드 상태 리셋
  useEffect(() => {
    setImageLoaded(false)
    setImageDimensions(null)
  }, [post.id, displayImageUrl]) // displayImageUrl도 의존성에 추가

  // 이미지 크기 미리 로드하여 aspect ratio 계산
  useEffect(() => {
    if (!displayImageUrl || displayImageUrl === '/placeholder.png') {
      setImageDimensions(null)
      setImageLoaded(false)
      return
    }

    // 로드 상태 리셋
    setImageLoaded(false)
    setImageDimensions(null) // 크기도 리셋

    let isCancelled = false // cleanup을 위한 플래그

    const img = new window.Image()
    img.onload = () => {
      if (!isCancelled) {
        setImageDimensions({
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
        // 이미지 크기를 로드하면 이미지도 로드된 것으로 간주
        setImageLoaded(true)
      }
    }
    img.onerror = () => {
      if (!isCancelled) {
        setImageDimensions(null)
        setImageLoaded(true) // 에러가 나도 로드 상태로 표시
      }
    }
    img.src = getImageSrc(displayImageUrl)

    // cleanup 함수: 컴포넌트가 언마운트되거나 URL이 변경되면 취소
    return () => {
      isCancelled = true
      img.onload = null
      img.onerror = null
    }
  }, [displayImageUrl])

  // 추가 안전장치: 이미지 로드 타임아웃
  useEffect(() => {
    if (!displayImageUrl || displayImageUrl === '/placeholder.png') return
    if (imageLoaded) return

    const timeout = setTimeout(() => {
      // 5초 후에도 로드되지 않으면 강제로 로드 완료 처리
      setImageLoaded(true)
    }, 5000)

    return () => clearTimeout(timeout)
  }, [displayImageUrl, imageLoaded])

  return (
    <div
      className="w-[285px] cursor-pointer group flex-shrink-0"
      onClick={handleClick}
    >
      <div 
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-muted"
        style={{
          // 이미지 비율에 맞춰 높이 설정
          aspectRatio: imageDimensions 
            ? `${imageDimensions.width} / ${imageDimensions.height}`
            : '4 / 3', // 기본 비율 (이미지 로드 전)
        }}
      >
        {/* Blur-up Placeholder */}
        {blurDataURL && !imageLoaded && (
          <div className="absolute inset-0">
            <Image
              src={blurDataURL}
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
        <Image
          src={getImageSrc(displayImageUrl)}
          alt={post.title}
          fill
          className={`object-cover transition-all duration-300 group-hover:brightness-50 ${
            blurDataURL && !imageLoaded ? 'opacity-0' : 'opacity-100'
          }`}
          loading="lazy"
          onLoad={() => {
            setImageLoaded(true)
          }}
          onError={() => {
            setImageLoaded(true)
          }}
          onLoadingComplete={() => {
            // 추가 안전장치: 로딩 완료 시 확실히 상태 업데이트
            setImageLoaded(true)
          }}
          sizes="285px" // 카드 너비에 맞춤
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

