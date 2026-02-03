'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, FileImage } from 'lucide-react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

interface EdmCardProps {
  edm: {
    id: string
    title: string
    description?: string | null
    thumbnailUrl?: string | null
    imageWidth: number
    imageHeight: number
    createdAt: Date
    updatedAt: Date
  }
  onEdit: () => void
  onDelete: () => void
}

export function EdmCard({ edm, onEdit, onDelete }: EdmCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!edm.thumbnailUrl) {
      setImageLoaded(false)
      imageUrlRef.current = null
      return
    }

    if (imageUrlRef.current !== edm.thumbnailUrl) {
      imageUrlRef.current = edm.thumbnailUrl
      setImageLoaded(false)

      const img = new window.Image()
      img.onload = () => setImageLoaded(true)
      img.onerror = () => setImageLoaded(true)
      img.src = getImageSrc(edm.thumbnailUrl)

      if (img.complete && img.naturalHeight > 0) {
        setImageLoaded(true)
      }
    }
  }, [edm.thumbnailUrl])

  const getImageSrc = (url: string) => {
    if (!url || url === '/placeholder.png') return '/placeholder.png'
    // Supabase Storage: 공개 URL이라 직접 사용
    if (url.startsWith('http') && url.includes('supabase.co')) return url
    return url
  }

  const thumbnailSrc = edm.thumbnailUrl ? getImageSrc(edm.thumbnailUrl) : null

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
              alt={edm.title}
              fill
              className={`object-contain transition-opacity duration-300 ${
                !imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              sizes="320px"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileImage className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">미리보기 없음</p>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>
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
        <h3 className="font-semibold text-lg truncate text-center">{edm.title}</h3>
      </CardContent>
    </Card>
  )
}
