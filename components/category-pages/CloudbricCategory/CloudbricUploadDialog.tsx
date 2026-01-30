'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
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
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X, File } from 'lucide-react'

const CLOUDBRIC_TYPES = [
  'Cloudbric',
  'WAF+',
  'WMS',
  'Managed Rules',
  'RAS',
  'PAS',
] as const

const CLOUDBRIC_LANGUAGES = ['EN', 'KR', 'JP'] as const

const cloudbricPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  description: z.string().optional().nullable(),
  type: z.enum(CLOUDBRIC_TYPES, {
    required_error: '타입을 선택해주세요.',
  }),
  language: z.enum(CLOUDBRIC_LANGUAGES, {
    required_error: '언어를 선택해주세요.',
  }),
  producedAt: z.string().datetime().optional().nullable(),
  tags: z.string().optional().nullable(),
})

type CloudbricPostFormValues = z.infer<typeof cloudbricPostSchema>

interface PostFile {
  url: string
  name: string
  order: number
}

interface Post {
  id: string
  title: string
  description?: string | null
  concept?: string | null // 타입
  tool?: string | null // 언어
  producedAt?: Date | null
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>
  images?: PostFile[] | null | any
  fileUrl?: string | null
}

interface CloudbricUploadDialogProps {
  open: boolean
  onClose: () => void
  categorySlug: string
  categoryId: string
  onSuccess: () => void
  postId?: string // 수정 모드일 때 게시물 ID
  post?: Post // 수정 모드일 때 게시물 데이터
}

export function CloudbricUploadDialog({
  open,
  onClose,
  categorySlug,
  categoryId,
  onSuccess,
  postId,
  post,
}: CloudbricUploadDialogProps) {
  const isEditMode = !!postId && !!post
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<PostFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false) // 중복 제출 방지

  const form = useForm<CloudbricPostFormValues>({
    resolver: zodResolver(cloudbricPostSchema),
    defaultValues: {
      title: '',
      description: null,
      type: 'Cloudbric',
      language: 'EN',
      producedAt: null,
      tags: null,
    },
  })

  // 다이얼로그가 열릴 때 플래그 리셋
  useEffect(() => {
    if (open) {
      isSubmittingRef.current = false
    }
  }, [open])

  // 수정 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (isEditMode && post) {
      // files 배열 추출
      let files: PostFile[] = []
      if (post.images) {
        if (Array.isArray(post.images)) {
          files = post.images as PostFile[]
        } else if (typeof post.images === 'string') {
          try {
            files = JSON.parse(post.images)
          } catch {
            files = []
          }
        } else {
          files = Array.isArray(post.images) ? post.images : []
        }
      }
      setExistingFiles(files)

      // 태그 추출
      const tagsString = post.tags
        ? post.tags.map((pt) => pt.tag.name).join(', ')
        : ''

      // 기존 Post의 concept 필드에서 타입 추출
      const existingType = post.concept && CLOUDBRIC_TYPES.includes(post.concept as any)
        ? post.concept
        : 'Cloudbric'

      // 기존 Post의 tool 필드에서 언어 추출
      const existingLanguage = post.tool && CLOUDBRIC_LANGUAGES.includes(post.tool as any)
        ? post.tool
        : 'EN'

      form.reset({
        title: post.title || '',
        description: post.description || null,
        type: existingType as typeof CLOUDBRIC_TYPES[number],
        language: existingLanguage as typeof CLOUDBRIC_LANGUAGES[number],
        producedAt: post.producedAt ? new Date(post.producedAt).toISOString() : null,
        tags: tagsString || null,
      })
    } else {
      form.reset({
        title: '',
        description: null,
        type: 'Cloudbric',
        language: 'EN',
        producedAt: null,
        tags: null,
      })
      setExistingFiles([])
      setSelectedFiles([])
    }
  }, [isEditMode, post, form])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      // PDF 파일만 필터링
      const pdfFiles = files.filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf')
      )

      if (pdfFiles.length !== files.length) {
        toast.error('PDF 파일만 업로드할 수 있습니다.')
      }

      setSelectedFiles(pdfFiles)
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingFile = (index: number) => {
    setExistingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: CloudbricPostFormValues) => {
    // 중복 제출 방지
    if (isSubmittingRef.current) {
      console.warn('이미 제출 중입니다.')
      return
    }

    // 수정 모드가 아니고 새 파일이 없으면 에러
    if (!isEditMode && selectedFiles.length === 0) {
      toast.error('PDF 파일을 선택해주세요.')
      return
    }

    // 수정 모드인데 기존 파일도 없고 새 파일도 없으면 에러
    if (isEditMode && existingFiles.length === 0 && selectedFiles.length === 0) {
      toast.error('최소 1개의 PDF 파일이 필요합니다.')
      return
    }

    try {
      isSubmittingRef.current = true
      setSubmitting(true)
      setUploading(true)

      let finalFiles: PostFile[] = []

      // 새 파일이 있으면 Presigned URL 방식으로 업로드
      if (selectedFiles.length > 0) {
        // 1. Presigned URL 요청 (파일 메타데이터만 전송, 작은 데이터)
        const fileMetadata = selectedFiles.map((file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
        }))

        const presignedResponse = await fetch('/api/posts/upload-presigned', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: fileMetadata,
            categorySlug: categorySlug,
          }),
        })

        if (!presignedResponse.ok) {
          const error = await presignedResponse.json()
          throw new Error(error.error || '업로드 URL 생성에 실패했습니다.')
        }

        const { presignedUrls } = await presignedResponse.json()

        // 2. 클라이언트에서 직접 B2로 업로드 (Vercel 서버를 거치지 않음)
        const uploadedFiles: PostFile[] = []

        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const presigned = presignedUrls[i]

          // B2에 직접 업로드
          const uploadResponse = await fetch(presigned.uploadUrl, {
            method: 'POST',
            headers: {
              Authorization: presigned.authorizationToken,
              'X-Bz-File-Name': encodeURIComponent(presigned.fileName),
              'Content-Type': file.type,
              'X-Bz-Content-Sha1': 'do_not_verify', // SHA1 검증 생략
            },
            body: file, // File 객체를 직접 전송
          })

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text()
            let errorMessage = `파일 업로드 실패 (${file.name})`
            try {
              const errorJson = JSON.parse(errorText)
              errorMessage = errorJson.message || errorMessage
            } catch {
              errorMessage = `${errorMessage}: ${errorText}`
            }
            throw new Error(errorMessage)
          }

          // 서버에서 받은 fileUrl 사용
          uploadedFiles.push({
            url: presigned.fileUrl,
            name: presigned.originalName,
            order: i,
          })
        }

        finalFiles = uploadedFiles
      } else if (isEditMode) {
        // 수정 모드이고 새 파일이 없으면 기존 파일 사용
        finalFiles = existingFiles
      }

      setUploading(false)

      // 태그 처리
      const tags = values.tags
        ? values.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : []

      // 제작일 처리
      const producedAtValue = values.producedAt ? new Date(values.producedAt).toISOString() : null

      if (isEditMode) {
        // 수정 모드: PUT 요청
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: values.title,
            description: values.description || null,
            categoryId: categoryId,
            images: finalFiles,
            concept: values.type, // concept 필드에 타입 저장
            tool: values.language, // tool 필드에 언어 저장
            tags,
            producedAt: producedAtValue,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '게시물 수정에 실패했습니다.')
        }

        const { post } = await response.json()
        console.log('Post updated:', post)
      } else {
        // 생성 모드: POST 요청
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: values.title,
            description: values.description || null,
            categoryId: categoryId,
            images: finalFiles,
            concept: values.type, // concept 필드에 타입 저장
            tool: values.language, // tool 필드에 언어 저장
            tags,
            producedAt: producedAtValue,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '게시물 생성에 실패했습니다.')
        }

        const { post } = await response.json()
        console.log('Post created:', post)
      }

      // 성공 후 다이얼로그 닫기 및 목록 새로고침
      onSuccess()
      onClose()
      form.reset()
      setSelectedFiles([])
      setExistingFiles([])
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || '게시물 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      setSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Cloudbric 게시물 수정' : 'Cloudbric 게시물 추가'}
          </DialogTitle>
          <DialogDescription>
            PDF 포맷의 브로셔 파일을 업로드하세요.
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
                    <Input
                      placeholder="제목을 입력하세요"
                      {...field}
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="내용을 입력하세요"
                      {...field}
                      value={field.value || ''}
                      disabled={submitting}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-4 gap-4 items-start">

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>타입</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="타입을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLOUDBRIC_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>언어</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={submitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="언어를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CLOUDBRIC_LANGUAGES.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="producedAt"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>제작일 *</FormLabel>
                    <DatePicker
                      value={field.value ? new Date(field.value) : undefined}
                      onChange={(date) => field.onChange(date ? date.toISOString() : null)}
                      disabled={submitting}
                    />
                    <FormDescription>
                      게시물이 제작된 날짜를 선택하세요.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>태그</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="태그를 쉼표로 구분하여 입력하세요 (예: 디자인, 브랜딩)"
                      value={field.value || ''}
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">PDF 파일</label>
              
              {/* 파일 입력 필드 - 수정 모드에서도 항상 표시 */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple={false}
                  onChange={handleFileSelect}
                  disabled={submitting || uploading}
                  className="hidden"
                  id="pdf-file-input"
                />
                <label
                  htmlFor="pdf-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <File className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    PDF 파일을 선택하세요
                  </span>
                </label>
              </div>

              {/* 기존 파일 목록 (수정 모드) */}
              {isEditMode && existingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">기존 파일:</p>
                  {existingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExistingFile(index)}
                        disabled={submitting || uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    기존 파일을 삭제한 후 새 파일을 선택할 수 있습니다.
                  </p>
                </div>
              )}

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {isEditMode ? '새로 추가할 파일:' : '선택된 파일:'}
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        disabled={submitting || uploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploading && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">
                  파일 업로드 중...
                </span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={submitting || uploading}
              >
                취소
              </Button>
              <Button type="submit" disabled={submitting || uploading}>
                {submitting || uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? '업로드 중...' : '처리 중...'}
                  </>
                ) : (
                  <>{isEditMode ? '수정' : '업로드'}</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
