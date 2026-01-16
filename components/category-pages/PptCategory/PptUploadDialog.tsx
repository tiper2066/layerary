'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { File, X, Loader2, Upload } from 'lucide-react'
import Image from 'next/image'

const PPT_TYPES = ['가로', '세로']
const PPT_LANGUAGES = ['EN', 'KR', 'JP']

const pptPostSchema = z.object({
  title: z.string().min(1, '제목을 입력하세요'),
  description: z.string().optional(),
  type: z.enum(['가로', '세로']),
  language: z.enum(['EN', 'KR', 'JP']),
  producedAt: z.string().min(1, '제작일을 선택하세요'),
})

type PptPostFormValues = z.infer<typeof pptPostSchema>

interface PostFile {
  url: string
  name: string
  order: number
}

interface PptUploadDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  categoryId: string
  categorySlug: string
  postId?: string // 수정 모드일 때 게시물 ID
  initialData?: {
    title: string
    description?: string | null
    concept?: string | null // 타입
    tool?: string | null // 언어
    producedAt?: Date | null
    fileUrl?: string | null
    thumbnailUrl?: string | null
  }
}

export function PptUploadDialog({
  open,
  onClose,
  onSuccess,
  categoryId,
  categorySlug,
  postId,
  initialData,
}: PptUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [existingFile, setExistingFile] = useState<PostFile | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null)
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)

  const isEditMode = !!postId

  const form = useForm<PptPostFormValues>({
    resolver: zodResolver(pptPostSchema),
    defaultValues: {
      title: '',
      description: '',
      type: '가로',
      language: 'KR',
      producedAt: '',
    },
  })

  // 수정 모드일 때 초기 데이터 설정
  useEffect(() => {
    if (isEditMode && initialData) {
      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        type: (initialData.concept as '가로' | '세로') || '가로',
        language: (initialData.tool as 'EN' | 'KR' | 'JP') || 'KR',
        producedAt: initialData.producedAt
          ? new Date(initialData.producedAt).toISOString().split('T')[0]
          : '',
      })

      // 기존 파일 정보 설정
      if (initialData.fileUrl) {
        setExistingFile({
          url: initialData.fileUrl,
          name: initialData.fileUrl.split('/').pop() || 'file.ppt',
          order: 0,
        })
      }

      // 기존 썸네일 설정
      if (initialData.thumbnailUrl) {
        setExistingThumbnailUrl(initialData.thumbnailUrl)
      }
    } else {
      form.reset({
        title: '',
        description: '',
        type: '가로',
        language: 'KR',
        producedAt: '',
      })
      setSelectedFile(null)
      setExistingFile(null)
      setSelectedThumbnail(null)
      setExistingThumbnailUrl(null)
    }
  }, [isEditMode, initialData, form])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // PPT 파일 검증 (.ppt, .pptx)
    const isPptFile =
      file.type === 'application/vnd.ms-powerpoint' ||
      file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      file.name.toLowerCase().endsWith('.ppt') ||
      file.name.toLowerCase().endsWith('.pptx')

    if (!isPptFile) {
      alert('PPT 또는 PPTX 파일만 업로드할 수 있습니다.')
      return
    }

    setSelectedFile(file)
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 이미지 파일 검증 (PNG, JPG)
    const isImageFile =
      file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      file.type === 'image/png'

    if (!isImageFile) {
      alert('PNG 또는 JPG 파일만 업로드할 수 있습니다.')
      return
    }

    // 파일 크기 검증 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('썸네일 이미지 크기는 5MB를 초과할 수 없습니다.')
      return
    }

    setSelectedThumbnail(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
  }

  const handleRemoveExistingFile = () => {
    setExistingFile(null)
  }

  const handleRemoveThumbnail = () => {
    setSelectedThumbnail(null)
  }

  const handleRemoveExistingThumbnail = () => {
    setExistingThumbnailUrl(null)
  }

  const onSubmit = async (values: PptPostFormValues) => {
    // 중복 제출 방지
    if (isSubmittingRef.current) {
      console.warn('이미 제출 중입니다.')
      return
    }

    // 수정 모드가 아니고 새 파일이 없으면 에러
    if (!isEditMode && !selectedFile) {
      alert('PPT 파일을 선택해주세요.')
      return
    }

    // 수정 모드인데 기존 파일도 없고 새 파일도 없으면 에러
    if (isEditMode && !existingFile && !selectedFile) {
      alert('PPT 파일이 필요합니다.')
      return
    }

    try {
      isSubmittingRef.current = true
      setSubmitting(true)
      setUploading(true)

      let finalFile: PostFile | null = null
      let finalThumbnailUrl: string | null = null

      // 새 PPT 파일이 있으면 업로드
      if (selectedFile) {
        // Presigned URL 방식으로 업로드
        const fileMetadata = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
        }

        const presignedResponse = await fetch('/api/posts/upload-presigned', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            files: [fileMetadata],
            categorySlug: categorySlug,
          }),
        })

        if (!presignedResponse.ok) {
          const error = await presignedResponse.json()
          throw new Error(error.error || '업로드 URL 생성에 실패했습니다.')
        }

        const { presignedUrls } = await presignedResponse.json()
        const presigned = presignedUrls[0]

        // B2에 직접 업로드
        const uploadResponse = await fetch(presigned.uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: presigned.authorizationToken,
            'X-Bz-File-Name': encodeURIComponent(presigned.fileName),
            'Content-Type': selectedFile.type,
            'X-Bz-Content-Sha1': 'do_not_verify',
          },
          body: selectedFile,
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          throw new Error(`파일 업로드 실패: ${errorText}`)
        }

        finalFile = {
          url: presigned.fileUrl,
          name: presigned.originalName,
          order: 0,
        }
      } else if (isEditMode) {
        // 수정 모드이고 새 파일이 없으면 기존 파일 사용
        finalFile = existingFile
      }

      setUploading(false)

      // 썸네일 이미지 업로드 (수정 모드에서만 먼저 처리)
      if (selectedThumbnail) {
        // 생성 모드에서는 게시물 생성 후에 썸네일 업로드
        if (isEditMode) {
          const thumbnailFormData = new FormData()
          thumbnailFormData.append('file', selectedThumbnail)
          if (postId) {
            thumbnailFormData.append('postId', postId)
          }

          const thumbnailResponse = await fetch('/api/posts/upload-ppt-thumbnail', {
            method: 'POST',
            body: thumbnailFormData,
          })

          if (!thumbnailResponse.ok) {
            const error = await thumbnailResponse.json()
            throw new Error(error.error || '썸네일 업로드에 실패했습니다.')
          }

          const { thumbnailUrl } = await thumbnailResponse.json()
          finalThumbnailUrl = thumbnailUrl
        }
        // 생성 모드에서는 게시물 생성 후에 처리 (아래 코드에서 처리)
      } else if (isEditMode && existingThumbnailUrl) {
        // 수정 모드이고 새 썸네일이 없으면 기존 썸네일 사용
        finalThumbnailUrl = existingThumbnailUrl
      }

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
            images: finalFile ? [finalFile] : [],
            concept: values.type, // concept 필드에 타입 저장
            tool: values.language, // tool 필드에 언어 저장
            producedAt: producedAtValue,
            thumbnailUrl: finalThumbnailUrl,
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
            images: finalFile ? [finalFile] : [],
            concept: values.type, // concept 필드에 타입 저장
            tool: values.language, // tool 필드에 언어 저장
            producedAt: producedAtValue,
            thumbnailUrl: finalThumbnailUrl,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '게시물 생성에 실패했습니다.')
        }

        const { post } = await response.json()
        console.log('Post created:', post)

        // 생성 후 썸네일 업로드 (postId가 필요한 경우)
        if (selectedThumbnail && post.id) {
          const thumbnailFormData = new FormData()
          thumbnailFormData.append('file', selectedThumbnail)
          thumbnailFormData.append('postId', post.id)

          const thumbnailResponse = await fetch('/api/posts/upload-ppt-thumbnail', {
            method: 'POST',
            body: thumbnailFormData,
          })

          if (!thumbnailResponse.ok) {
            const error = await thumbnailResponse.json()
            console.error('썸네일 업로드 실패:', error)
            // 에러를 throw하지 않고 경고만 표시 (게시물은 이미 생성됨)
            alert(`썸네일 업로드에 실패했습니다: ${error.error || '알 수 없는 오류'}`)
          } else {
            const { thumbnailUrl } = await thumbnailResponse.json()
            // 썸네일 URL 업데이트 (기존 게시물의 title 포함 - 필수 필드)
            const updateResponse = await fetch(`/api/posts/${post.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                title: post.title, // 기존 게시물의 title 포함
                thumbnailUrl,
              }),
            })
            
            if (!updateResponse.ok) {
              const error = await updateResponse.json()
              console.error('썸네일 URL 업데이트 실패:', error)
              // 에러를 throw하지 않고 경고만 표시
              alert(`썸네일 URL 업데이트에 실패했습니다: ${error.error || '알 수 없는 오류'}`)
            }
          }
        }
      }

      // 성공 후 다이얼로그 닫기 및 목록 새로고침
      onSuccess()
      onClose()
      form.reset()
      setSelectedFile(null)
      setExistingFile(null)
      setSelectedThumbnail(null)
      setExistingThumbnailUrl(null)
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(error.message || '게시물 업로드 중 오류가 발생했습니다.')
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
            {isEditMode ? 'PPT 게시물 수정' : 'PPT 게시물 추가'}
          </DialogTitle>
          <DialogDescription>
            PPT 또는 PPTX 포맷의 파일을 업로드하세요.
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
                      {PPT_TYPES.map((type) => (
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
                      {PPT_LANGUAGES.map((lang) => (
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
                <FormItem className="flex flex-col">
                  <FormLabel>제작일 *</FormLabel>
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(date) => field.onChange(date ? date.toISOString().split('T')[0] : null)}
                    disabled={submitting}
                  />
                  <FormDescription>
                    게시물이 제작된 날짜를 선택하세요.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PPT 파일 업로드 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">PPT 파일</label>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <input
                  type="file"
                  accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={handleFileSelect}
                  disabled={submitting || uploading}
                  className="hidden"
                  id="ppt-file-input"
                />
                <label
                  htmlFor="ppt-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <File className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    PPT 또는 PPTX 파일을 선택하세요
                  </span>
                </label>
              </div>

              {/* 기존 파일 (수정 모드) */}
              {isEditMode && existingFile && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">기존 파일:</p>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{existingFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveExistingFile}
                      disabled={submitting || uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* 선택된 파일 */}
              {selectedFile && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {isEditMode ? '새로 추가할 파일:' : '선택된 파일:'}
                  </p>
                  <div className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={submitting || uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 썸네일 이미지 업로드 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">썸네일 이미지 (선택)</label>
              
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleThumbnailSelect}
                  disabled={submitting || uploading}
                  className="hidden"
                  id="thumbnail-file-input"
                />
                <label
                  htmlFor="thumbnail-file-input"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    PNG 또는 JPG 이미지를 선택하세요 (최대 5MB)
                  </span>
                </label>
              </div>

              {/* 기존 썸네일 (수정 모드) */}
              {isEditMode && existingThumbnailUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">기존 썸네일:</p>
                  <div className="relative w-32 h-20 border rounded overflow-hidden">
                    <Image
                      src={existingThumbnailUrl}
                      alt="기존 썸네일"
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={handleRemoveExistingThumbnail}
                      disabled={submitting || uploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* 선택된 썸네일 미리보기 */}
              {selectedThumbnail && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">선택된 썸네일:</p>
                  <div className="relative w-32 h-20 border rounded overflow-hidden">
                    <Image
                      src={URL.createObjectURL(selectedThumbnail)}
                      alt="선택된 썸네일"
                      fill
                      className="object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={handleRemoveThumbnail}
                      disabled={submitting || uploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
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
