'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Pencil, Trash2, Upload, X, File, Paperclip } from 'lucide-react'
import { TableRowSkeleton } from '@/components/ui/table-row-skeleton'

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

const attachmentSchema = z.object({
  url: z.string(),
  name: z.string(),
})

const noticeSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  content: z.string().min(1, '내용을 입력해주세요.'),
  isImportant: z.boolean().default(false),
  attachments: z.array(attachmentSchema).optional().nullable(),
})

type NoticeFormValues = z.infer<typeof noticeSchema>

export default function NoticesPage() {
  const router = useRouter()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null)
  const [viewingNotice, setViewingNotice] = useState<Notice | null>(null)
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadedAttachments, setUploadedAttachments] = useState<Attachment[]>([])
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)

  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: '',
      content: '',
      isImportant: false,
      attachments: null,
    },
  })

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notices')
      
      if (response.status === 403) {
        // 다음 틱에서 리다이렉트 (렌더링 완료 후)
        setTimeout(() => {
          router.push('/')
        }, 0)
        return
      }

      if (!response.ok) {
        throw new Error('공지사항 목록을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setNotices(data.notices)
    } catch (error) {
      console.error('Error fetching notices:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchNotices()
  }, [fetchNotices])

  const handleOpenCreateDialog = () => {
    setEditingNotice(null)
    setSelectedFiles([])
    setUploadedAttachments([])
    // 다음 틱에서 form 초기화 (렌더링 완료 후)
    setTimeout(() => {
      form.reset({
        title: '',
        content: '',
        isImportant: false,
        attachments: null,
      })
    }, 0)
    setIsDialogOpen(true)
  }

  const handleOpenEditDialog = (notice: Notice) => {
    setEditingNotice(notice)
    setSelectedFiles([])
    setUploadedAttachments(notice.attachments || [])
    // 다음 틱에서 form 초기화 (렌더링 완료 후)
    setTimeout(() => {
      form.reset({
        title: notice.title,
        content: notice.content,
        isImportant: notice.isImportant,
        attachments: notice.attachments || null,
      })
    }, 0)
    setIsDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      // Dialog가 닫힐 때 상태 초기화
      setEditingNotice(null)
      setSelectedFiles([])
      setUploadedAttachments([])
    }
  }

  const handleCloseDialog = () => {
    handleDialogOpenChange(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])
    }
    // 같은 파일을 다시 선택할 수 있도록 input 초기화
    e.target.value = ''
  }


  const handleRemoveFile = (index: number, isUploaded: boolean) => {
    if (isUploaded) {
      setUploadedAttachments((prev) => prev.filter((_, i) => i !== index))
      setTimeout(() => {
        const newAttachments = uploadedAttachments.filter((_, i) => i !== index)
        form.setValue('attachments', newAttachments.length > 0 ? newAttachments : null)
      }, 0)
    } else {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const onSubmit = async (values: NoticeFormValues) => {
    try {
      setSubmitting(true)

      // 선택된 파일들을 업로드
      const attachmentsToUpload = [...uploadedAttachments]
      
      if (selectedFiles.length > 0) {
        setUploading(true)
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)

          const uploadResponse = await fetch('/api/admin/notices/upload', {
            method: 'POST',
            body: formData,
          })

          const uploadResponseData = await uploadResponse.json()

          if (!uploadResponse.ok) {
            throw new Error(uploadResponseData.error || `파일 업로드에 실패했습니다: ${file.name}`)
          }

          return {
            url: uploadResponseData.fileUrl,
            name: uploadResponseData.fileName,
          }
        })

        const uploadedFiles = await Promise.all(uploadPromises)
        attachmentsToUpload.push(...uploadedFiles)
        setUploading(false)
      }

      values.attachments = attachmentsToUpload.length > 0 ? attachmentsToUpload : null

      if (editingNotice) {
        // 수정
        const response = await fetch(`/api/admin/notices/${editingNotice.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '공지사항 수정에 실패했습니다.')
        }

        const data = await response.json()
        setNotices((prev) =>
          prev.map((notice) =>
            notice.id === editingNotice.id ? data.notice : notice
          )
        )
      } else {
        // 생성
        const response = await fetch('/api/admin/notices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '공지사항 생성에 실패했습니다.')
        }

        const data = await response.json()
        setNotices((prev) => [data.notice, ...prev])
      }

      handleCloseDialog()
    } catch (error: any) {
      console.error('Error saving notice:', error)
      toast.error(error.message || '공지사항 저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const handleDeleteClick = (noticeId: string) => {
    setDeletingNoticeId(noticeId)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingNoticeId) return

    try {
      const response = await fetch(`/api/admin/notices/${deletingNoticeId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '공지사항 삭제에 실패했습니다.')
      }

      setNotices((prev) => prev.filter((notice) => notice.id !== deletingNoticeId))
      setIsDeleteDialogOpen(false)
      setDeletingNoticeId(null)
    } catch (error: any) {
      console.error('Error deleting notice:', error)
      toast.error(error.message || '공지사항 삭제에 실패했습니다.')
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
      const downloadUrl = `/api/admin/notices/download?url=${encodeURIComponent(fileUrl)}&fileName=${encodeURIComponent(fileName)}`
      
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">공지사항 관리</h1>
            <p className="text-muted-foreground mt-2">
              공지사항을 등록, 수정, 삭제할 수 있습니다.
            </p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4" />
            공지사항 추가
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>공지사항 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>작성일</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead className='text-center'>첨부파일</TableHead>
                  <TableHead className='text-center'>조회수</TableHead>
                  <TableHead className='text-center'>중요</TableHead>
                  <TableHead className="text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, index) => (
                  <TableRowSkeleton key={index} columns={7} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">공지사항 관리</h1>
          <p className="text-muted-foreground mt-2">
            공지사항을 등록, 수정, 삭제할 수 있습니다.
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4" />
          공지사항 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>공지사항 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>작성일</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>제목</TableHead>
                <TableHead className='text-center'>첨부파일</TableHead>
                <TableHead className='text-center'>조회수</TableHead>
                <TableHead className='text-center'>중요</TableHead>
                <TableHead className="text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    등록된 공지사항이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                notices.map((notice) => (
                  <TableRow key={notice.id}>
                    <TableCell>{formatDate(notice.createdAt)}</TableCell>
                    <TableCell>{notice.author.name || notice.author.email}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => {
                          setViewingNotice(notice)
                          setIsDetailDialogOpen(true)
                        }}
                        className="font-medium text-left hover:text-primary hover:underline cursor-pointer"
                      >
                        {notice.title}
                      </button>
                    </TableCell>
                    <TableCell className='text-center'>
                      {notice.attachments && notice.attachments.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="relative h-8 w-8"
                            >
                              <Paperclip className="h-4 w-4" />
                              {notice.attachments.length > 1 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                  {notice.attachments.length}
                                </span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-2" 
                            side="bottom" 
                            align="start"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <div className="flex flex-col space-y-1">
                              <div className="text-xs font-medium mb-2 pb-2 border-b px-2">
                                첨부파일 ({notice.attachments.length})
                              </div>
                              {notice.attachments.map((attachment, index) => (
                                <Button
                                  key={index}
                                  variant="ghost"
                                  className="justify-start h-auto px-2 py-1.5 text-sm"
                                  onClick={() => handleFileDownload(
                                    attachment.url,
                                    attachment.name,
                                    `${notice.id}-${index}`
                                  )}
                                  disabled={downloadingFileId === `${notice.id}-${index}`}
                                >
                                  {downloadingFileId === `${notice.id}-${index}` ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      <span className="truncate">다운로드 중...</span>
                                    </>
                                  ) : (
                                    <>
                                      <File className="h-4 w-4 mr-2" />
                                      <span className="truncate">{attachment.name}</span>
                                    </>
                                  )}
                                </Button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className='text-center'>{notice.viewCount}</TableCell>
                    <TableCell className='text-center'>
                      {notice.isImportant && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          중요
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditDialog(notice)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(notice.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNotice ? '공지사항 수정' : '공지사항 추가'}
            </DialogTitle>
            <DialogDescription>
              {editingNotice
                ? '공지사항 정보를 수정합니다.'
                : '새로운 공지사항을 등록합니다.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="공지사항 제목을 입력하세요" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>내용</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="공지사항 내용을 입력하세요"
                        className="min-h-[200px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isImportant"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>중요 공지사항</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* 첨부파일 섹션 */}
              <div className="space-y-2">
                <Label>첨부파일</Label>
                {(uploadedAttachments.length > 0 || selectedFiles.length > 0) ? (
                  <div className="space-y-2">
                    {/* 업로드된 파일 목록 */}
                    {uploadedAttachments.map((attachment, index) => (
                      <div key={`uploaded-${index}`} className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate">{attachment.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index, true)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {/* 선택된 파일 목록 (아직 업로드 안 됨) */}
                    {selectedFiles.map((file, index) => (
                      <div key={`selected-${index}`} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            (저장 시 업로드됨)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFile(index, false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    disabled={uploading || submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    여러 파일을 선택할 수 있습니다. 저장 버튼을 클릭하면 파일이 자동으로 업로드됩니다.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  disabled={submitting}
                >
                  취소
                </Button>
                <Button type="submit" disabled={submitting || uploading}>
                  {submitting || uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {uploading ? '업로드 중...' : '저장 중...'}
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
            {viewingNotice && (
              <Button
                onClick={() => {
                  setIsDetailDialogOpen(false)
                  handleOpenEditDialog(viewingNotice)
                }}
              >
                수정
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

