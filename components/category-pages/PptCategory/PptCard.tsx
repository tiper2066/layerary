'use client'

import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2, Download, Loader2, FileArchive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

interface Post {
  id: string
  title: string
  concept?: string | null // 타입 (가로, 세로)
  tool?: string | null // 언어 (EN, KR, JP)
  producedAt?: Date | null // 제작일
  fileUrl?: string | null // PPT 파일 URL
  thumbnailUrl?: string | null // 썸네일 이미지 URL (Supabase Storage)
}

interface PptCardProps {
  post: Post
  isSelected: boolean
  onClick: (postId: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  showActions?: boolean
}

export function PptCard({
  post,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  showActions = false,
}: PptCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageUrlRef = useRef<string | null>(null)

  // thumbnailUrl이 변경될 때만 imageLoaded 상태 초기화
  // 이미 로드된 이미지인지 확인하여 불필요한 리셋 방지
  useEffect(() => {
    if (!post.thumbnailUrl) {
      setImageLoaded(false)
      imageUrlRef.current = null
      return
    }

    // 이미지 URL이 변경된 경우에만 리셋
    if (imageUrlRef.current !== post.thumbnailUrl) {
      imageUrlRef.current = post.thumbnailUrl
      setImageLoaded(false)

      // 이미 로드된 이미지인지 확인 (브라우저 캐시)
      const img = new window.Image()
      img.onload = () => {
        setImageLoaded(true)
      }
      img.onerror = () => {
        // 에러가 발생해도 로딩 상태는 true로 설정하여 Skeleton이 계속 표시되지 않도록
        setImageLoaded(true)
      }
      img.src = post.thumbnailUrl

      // 이미 로드된 경우 즉시 상태 업데이트
      if (img.complete && img.naturalHeight > 0) {
        setImageLoaded(true)
      }
    }
  }, [post.thumbnailUrl])

  // PPT 프록시 URL 생성
  const getProxyUrl = (fileUrl: string | null | undefined) => {
    if (!fileUrl) return null
    return `/api/posts/files?url=${encodeURIComponent(fileUrl)}`
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    if (!post.fileUrl || downloading) return

    try {
      setDownloading(true)
      // 프록시를 통해 PPT 다운로드
      const proxyUrl = getProxyUrl(post.fileUrl)
      if (!proxyUrl) return

      const response = await fetch(proxyUrl)
      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // 파일명 생성: 제목_언어_제작일.ppt(x)
      let fileName = post.title
      if (post.tool) {
        fileName += `_${post.tool}`
      }
      if (post.producedAt) {
        const date = new Date(post.producedAt)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        fileName += `_${year}${month}${day}`
      }
      // 파일 확장자 추출
      const fileUrl = post.fileUrl || ''
      const extension = fileUrl.toLowerCase().endsWith('.pptx') ? 'pptx' : 'ppt'
      a.download = `${fileName}.${extension}`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      alert('다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className={`
        relative group cursor-pointer
        bg-card border rounded-lg overflow-hidden
        transition-all duration-200
        ${isSelected ? 'border-penta-blue dark:border-penta-sky' : 'hover:shadow-md'}
        w-[320px] h-[230px] flex flex-col
      `}
      onClick={() => onClick(post.id)}
    >
      {/* 썸네일 이미지 또는 FileArchive 아이콘 */}
      <div className="flex-1 relative bg-muted overflow-hidden">
        {post.thumbnailUrl ? (
          <>
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full" />
            )}
            <Image
              src={post.thumbnailUrl}
              alt={post.title}
              fill
              sizes="320px"
              className={`object-cover transition-opacity duration-300 ${
                !imageLoaded ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              onLoadingComplete={() => {
                // 추가 안전장치: 로딩 완료 시 확실히 상태 업데이트
                setImageLoaded(true)
              }}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <FileArchive className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* 제목 표시 */}
      <div className="px-4 py-2 border-t">
        <span className="text-sm font-semibold text-center block truncate">
          {post.title || 'N/A'}
        </span>
      </div>

      {/* 다운로드 버튼 */}
      <div className="px-4 py-3">
        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={handleDownload}
          disabled={!post.fileUrl || downloading}
        >
          {downloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              다운로드 중...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              다운로드
            </>
          )}
        </Button>
      </div>

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
