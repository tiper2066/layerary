'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, Maximize2 } from 'lucide-react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

interface DiagramCardProps {
  diagram: {
    id: string
    title: string
    description?: string | null
    thumbnailUrl?: string | null
    width: number
    height: number
    createdAt: Date
    updatedAt: Date
  }
  onEdit: () => void
  onDelete: () => void
}

export function DiagramCard({ diagram, onEdit, onDelete }: DiagramCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageUrlRef = useRef<string | null>(null)

  // thumbnailUrl이 변경될 때만 imageLoaded 상태 초기화
  useEffect(() => {
    if (!diagram.thumbnailUrl) {
      setImageLoaded(false)
      imageUrlRef.current = null
      return
    }

    // 이미지 URL이 변경된 경우에만 리셋
    if (imageUrlRef.current !== diagram.thumbnailUrl) {
      imageUrlRef.current = diagram.thumbnailUrl
      setImageLoaded(false)

      // 이미 로드된 이미지인지 확인 (브라우저 캐시)
      const img = new window.Image()
      img.onload = () => {
        setImageLoaded(true)
      }
      img.onerror = () => {
        setImageLoaded(true)
      }
      img.src = getImageSrc(diagram.thumbnailUrl)

      // 이미 로드된 경우 즉시 상태 업데이트
      if (img.complete && img.naturalHeight > 0) {
        setImageLoaded(true)
      }
    }
  }, [diagram.thumbnailUrl])

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

  const thumbnailSrc = diagram.thumbnailUrl ? getImageSrc(diagram.thumbnailUrl) : null

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden w-[320px] h-[230px] flex flex-col">
      <div className="relative flex-1 bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        {thumbnailSrc ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <Image
              src={thumbnailSrc}
              alt={diagram.title}
              fill
              className={`object-contain transition-opacity duration-300 ${
                !imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              sizes="320px"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                console.error('Image load error for:', diagram.thumbnailUrl)
                console.error('Proxied URL:', thumbnailSrc)
                setImageLoaded(true)
              }}
              onLoadingComplete={() => {
                setImageLoaded(true)
              }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Maximize2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">미리보기 없음</p>
            </div>
          </div>
        )}
        
        {/* 호버 시 액션 버튼 */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4 border-t">
        <h3 className="font-semibold text-lg truncate text-center">{diagram.title}</h3>
      </CardContent>
    </Card>
  )
}

