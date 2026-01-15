'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { changeSvgColors, changeCiColorSet, changeAllSvgColors } from '@/lib/svg-utils'

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
  concept?: string | null // CI/BI 타입이 여기에 저장됨
}

interface CiBiCardProps {
  post: Post
  isSelected: boolean
  selectedColor?: string // 선택된 색상
  onClick: (postId: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  showActions?: boolean
}

export function CiBiCard({
  post,
  isSelected,
  selectedColor,
  onClick,
  onEdit,
  onDelete,
  showActions = false,
}: CiBiCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [svgContent, setSvgContent] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [thumbnailSize, setThumbnailSize] = useState<{ width: number; height: number } | null>(null)
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

  // 썸네일 크기 측정 (선택 전에 한 번만)
  useEffect(() => {
    if (!imageInfo?.thumbnailUrl || selectedColor) return
    
    const img = new window.Image()
    img.onload = () => {
      setThumbnailSize({ width: img.width, height: img.height })
    }
    img.onerror = () => {
      // 썸네일이 없으면 원본 이미지 크기 측정
      if (imageInfo.url) {
        const originalImg = new window.Image()
        originalImg.onload = () => {
          setThumbnailSize({ width: originalImg.width, height: originalImg.height })
        }
        originalImg.src = getImageSrc(imageInfo.url)
      }
    }
    img.src = getImageSrc(imageInfo.thumbnailUrl)
  }, [imageInfo?.thumbnailUrl, imageInfo?.url, selectedColor])

  // 색상이 변경된 경우 SVG 로드 및 색상 적용
  useEffect(() => {
    if (!selectedColor || !imageInfo?.url) {
      setSvgContent(null)
      // 색상이 없으면 로드 상태를 리셋하지 않음 (일반 이미지 로드가 처리)
      return
    }

    // SVG 파일만 색상 변경 가능
    if (!imageInfo.url.toLowerCase().endsWith('.svg') && !imageInfo.url.includes('.svg')) {
      setSvgContent(null)
      return
    }

    // SVG 로드 및 색상 변경
    const loadAndChangeColor = async () => {
      try {
        const imageUrl = getImageSrc(imageInfo.url)
        const response = await fetch(imageUrl)
        if (!response.ok) throw new Error('SVG 로드 실패')
        
        const svgText = await response.text()
        
        let modifiedSvg: string
        
        // CI 컬러 세트인 경우
        if (selectedColor === 'CI_COLOR_SET' && post.concept === 'CI') {
          modifiedSvg = changeCiColorSet(svgText, '#0060A9', '#999B9E')
        } else {
          // 일반 색상 변경 - 모든 텍스트 요소의 색상을 선택한 색상으로 변경
          modifiedSvg = changeAllSvgColors(svgText, selectedColor)
        }
        
        // 썸네일 크기가 있으면 SVG에 동일한 크기 적용
        if (thumbnailSize) {
          modifiedSvg = modifiedSvg.replace(
            /<svg([^>]*?)>/i,
            (match, attrs) => {
              // 기존 width, height 제거
              let newAttrs = attrs.replace(/\s+(width|height)=["'][^"']*["']/gi, '')
              // 썸네일과 동일한 크기로 설정
              newAttrs += ` width="${thumbnailSize.width}" height="${thumbnailSize.height}"`
              return `<svg${newAttrs}>`
            }
          )
        }
        
        const base64Svg = btoa(unescape(encodeURIComponent(modifiedSvg)))
        setSvgContent(`data:image/svg+xml;base64,${base64Svg}`)
        setImageLoaded(true) // SVG는 즉시 로드됨
        setError(false)
      } catch (err) {
        console.error('SVG 색상 변경 실패:', err)
        setSvgContent(null)
        setError(true)
        setImageLoaded(false)
      }
    }

    loadAndChangeColor()
  }, [selectedColor, imageInfo?.url, post.concept, thumbnailSize])

  // 이미지 URL이 변경되면 로드 상태 리셋하고 이미 로드된 이미지인지 확인
  useEffect(() => {
    if (!imageInfo) {
      setImageLoaded(false)
      setError(false)
      return
    }

    // 색상이 선택되지 않았거나 SVG가 아닌 경우 일반 이미지 로드
    if (!selectedColor || !svgContent) {
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
    }
  }, [imageInfo?.url, imageInfo?.thumbnailUrl, selectedColor, svgContent])

  if (!imageInfo) {
    return null
  }

  // 표시할 이미지 URL 결정
  const displayImageUrl = svgContent 
    ? svgContent 
    : imageInfo.thumbnailUrl 
      ? getImageSrc(imageInfo.thumbnailUrl)
      : getImageSrc(imageInfo.url)

  // White 색상이 선택된 경우 배경을 검정으로 변경
  const isWhiteSelected = selectedColor === '#FFFFFF' || selectedColor === '#FFF' || selectedColor?.toLowerCase() === 'white'
  const cardBackgroundColor = isWhiteSelected ? 'bg-black' : 'bg-card dark:bg-white'

  return (
    <div
      className={`
        relative group cursor-pointer
        ${cardBackgroundColor} border dark:border-4 rounded-lg overflow-hidden
        transition-all duration-200
        ${isSelected ? 'border-penta-blue dark:border-penta-sky' : 'hover:shadow-md'}
        h-[136px] w-full flex items-center justify-center p-10
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
        <div className="relative w-full max-w-full" style={{ height: '50px', maxHeight: '50px' }}>
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
            unoptimized={!!svgContent} // SVG 색상 변경된 경우 최적화 비활성화
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
