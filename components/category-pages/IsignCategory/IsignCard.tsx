'use client'

import { useState } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Post {
  id: string
  title: string
  concept?: string | null // 타입 (iSIGN, iSIGN PASS 등)
  tool?: string | null // 언어 (EN, KR, JP)
  producedAt?: Date | null // 제작일
  fileUrl?: string | null // PDF 파일 URL
}

interface IsignCardProps {
  post: Post
  isSelected: boolean
  onClick: (postId: string) => void
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  showActions?: boolean
}

export function IsignCard({
  post,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  showActions = false,
}: IsignCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false) // PDF 로딩 상태 추가

  // PDF 프록시 URL 생성
  const getProxyUrl = (fileUrl: string | null | undefined) => {
    if (!fileUrl) return null
    return `/api/posts/files?url=${encodeURIComponent(fileUrl)}`
  }

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    setPreviewOpen(true)
    setPdfLoading(true) // 다이얼로그 열 때 로딩 시작
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    if (!post.fileUrl || downloading) return

    try {
      setDownloading(true)
      // 프록시를 통해 PDF 다운로드
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
      
      // 파일명 생성: 제목_언어_제작일.pdf
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
      a.download = `${fileName}.pdf`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  const proxyUrl = getProxyUrl(post.fileUrl)

  return (
    <>
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
        {/* 제목 표시 (상단) */}
        <div className="flex-1 flex items-center justify-center px-4 py-4">
          <span className="text-2xl font-bold text-center">
            {post.title || 'N/A'}
          </span>
        </div>

        {/* 언어 표시 (중앙) */}
        <div className="flex-1 flex items-center justify-center mx-4 border-1 border-t">
          <span className="text-lg text-primary/60 font-semibold ">
            {post.tool || 'N/A'}
          </span>
        </div>

        {/* 버튼 영역 (하단) */}
        <div className="px-4 py-4 flex gap-2">
          {/* 미리보기 버튼 */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handlePreview}
            disabled={!post.fileUrl}
          >
            미리보기
          </Button>

          {/* 다운로드 버튼 */}
          <Button
            variant="default"
            size="sm"
            className="flex-1"
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

      {/* PDF 미리보기 다이얼로그 */}
      <Dialog open={previewOpen} onOpenChange={(open) => {
        setPreviewOpen(open)
        if (!open) {
          setPdfLoading(false) // 다이얼로그 닫을 때 로딩 상태 리셋
        }
      }}>
        <DialogContent className="flex flex-col gap-0 max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="px-6 py-6 flex-none">
            <DialogTitle>{post.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 relative">
            {proxyUrl ? (
              <>
                {pdfLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">PDF 로딩 중...</span>
                    </div>
                  </div>
                )}
                <iframe
                  src={`${proxyUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full min-h-[600px] border rounded"
                  title={`${post.title} 미리보기`}
                  onLoad={() => setPdfLoading(false)} // 로드 완료 시 로딩 상태 해제
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                PDF 파일이 없습니다.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
