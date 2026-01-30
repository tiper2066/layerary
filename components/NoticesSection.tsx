'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { File, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Attachment {
  url: string
  name: string
}

interface Notice {
  id: string
  title: string
  content: string
  isImportant: boolean
  viewCount: number
  attachments: Attachment[] | null
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string | null
    email: string
  }
}

interface NoticesSectionProps {
  notices: Array<{
    id: string
    title: string
    isImportant: boolean
    createdAt: string
    author: {
      name: string | null
    }
  }>
}

export function NoticesSection({ notices: initialNotices }: NoticesSectionProps) {
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null)
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleNoticeClick = async (noticeId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/notices/${noticeId}`)
      
      if (!response.ok) {
        throw new Error('공지사항을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setViewingNotice(data.notice)
      setIsDetailDialogOpen(true)
    } catch (error) {
      console.error('Error fetching notice:', error)
      toast.error('공지사항을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleFileDownload = async (fileUrl: string, fileName: string, fileId: string) => {
    try {
      setDownloadingFileId(fileId)
      const downloadUrl = `/api/notices/download?url=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(fileName)}`
      
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '파일 다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error('Error downloading file:', error)
      toast.error(error.message || '파일 다운로드에 실패했습니다.')
    } finally {
      setDownloadingFileId(null)
    }
  }

  return (
    <>
      <section>
        <Card className="py-0 pb-3 gap-3">
          <div className="pt-4 pb-4 pl-6 pr-6 border-b min-h-[65px] flex items-center">
            <h3 className="font-semibold">공지 사항</h3>
          </div>
          <CardContent className="p-6">
            {initialNotices.length > 0 ? (
              <div className="space-y-4">
                {initialNotices.map((notice) => (
                  <button
                    key={notice.id}
                    onClick={() => handleNoticeClick(notice.id)}
                    className="block w-full text-left p-4 rounded-lg hover:bg-accent transition-colors last:border-b-0"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap mr-2">
                        {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-base">{notice.title}</h3>
                          {notice.isImportant && (
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                              중요
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                등록된 공지사항이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 공지사항 상세 보기 다이얼로그 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewingNotice?.isImportant && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                  중요
                </span>
              )}
              {viewingNotice?.title}
            </DialogTitle>
            <DialogDescription>
              작성자: {viewingNotice?.author.name || viewingNotice?.author.email} | 
              작성일: {viewingNotice ? formatDate(viewingNotice.createdAt) : ''} | 
              조회수: {viewingNotice?.viewCount}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewingNotice?.attachments && viewingNotice.attachments.length > 0 && (
              <div className="p-3 border rounded-md bg-muted/50">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      첨부파일 ({viewingNotice.attachments.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {viewingNotice.attachments.map((attachment, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleFileDownload(
                          attachment.url,
                          attachment.name,
                          `${viewingNotice.id}-${idx}`
                        )}
                        disabled={downloadingFileId === `${viewingNotice.id}-${idx}`}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingFileId === `${viewingNotice.id}-${idx}` ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                            <span className="truncate">다운로드 중...</span>
                          </>
                        ) : (
                          <>
                            <File className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{attachment.name}</span>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm">
                {viewingNotice?.content}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDetailDialogOpen(false)}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

