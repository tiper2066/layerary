'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X, File } from 'lucide-react'

const postSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  subtitle: z.string().optional(),
  concept: z.string().optional(),
  tool: z.string().optional(),
  tags: z.string().optional(), // 쉼표로 구분된 태그 문자열
})

type PostFormValues = z.infer<typeof postSchema>

interface PostImage {
  url: string
  name: string
  order: number
}

interface Post {
  id: string
  title: string
  subtitle?: string | null
  concept?: string | null
  tool?: string | null
  images?: PostImage[] | null | any
  tags?: Array<{ tag: { id: string; name: string; slug: string } }>
}

interface PostUploadDialogProps {
  open: boolean
  onClose: () => void
  categorySlug: string
  categoryId: string
  onSuccess: () => void
  postId?: string // 수정 모드일 때 게시물 ID
  post?: Post // 수정 모드일 때 게시물 데이터
}

export function PostUploadDialog({
  open,
  onClose,
  categorySlug,
  categoryId,
  onSuccess,
  postId,
  post,
}: PostUploadDialogProps) {
  const isEditMode = !!postId && !!post
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<PostImage[]>([])
  const [originalImages, setOriginalImages] = useState<PostImage[]>([]) // 원본 이미지 보관
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false) // 중복 제출 방지

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      subtitle: '',
      concept: '',
      tool: '',
      tags: '',
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
      // images 배열 추출
      let images: PostImage[] = []
      if (post.images) {
        if (Array.isArray(post.images)) {
          images = post.images as PostImage[]
        } else if (typeof post.images === 'string') {
          try {
            images = JSON.parse(post.images)
          } catch {
            images = []
          }
        } else {
          images = Array.isArray(post.images) ? post.images : []
        }
      }
      setExistingImages(images)
      setOriginalImages(images) // 원본 이미지도 저장

      // 태그를 쉼표로 구분된 문자열로 변환
      const tagsString = post.tags
        ? post.tags.map(({ tag }) => tag.name).join(', ')
        : ''

      form.reset({
        title: post.title || '',
        subtitle: post.subtitle || '',
        concept: post.concept || '',
        tool: post.tool || '',
        tags: tagsString,
      })
    } else {
      form.reset({
        title: '',
        subtitle: '',
        concept: '',
        tool: '',
        tags: '',
      })
      setExistingImages([])
      setSelectedFiles([])
    }
  }, [isEditMode, post, form])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: PostFormValues) => {
    // 중복 제출 방지
    if (isSubmittingRef.current) {
      console.warn('이미 제출 중입니다.')
      return
    }

    // 수정 모드가 아니고 새 파일이 없으면 에러
    if (!isEditMode && selectedFiles.length === 0) {
      alert('최소 1개의 이미지를 선택해주세요.')
      return
    }

    // 수정 모드인데 기존 이미지도 없고 새 파일도 없으면 에러
    if (isEditMode && existingImages.length === 0 && selectedFiles.length === 0) {
      alert('최소 1개의 이미지가 필요합니다.')
      return
    }

    try {
      isSubmittingRef.current = true
      setSubmitting(true)
      setUploading(true)

      let finalImages: PostImage[] = []

      // 새 파일이 있으면 업로드
      if (selectedFiles.length > 0) {
        const formData = new FormData()
        selectedFiles.forEach((file) => {
          formData.append('files', file)
        })
        formData.append('categorySlug', categorySlug)

        const uploadResponse = await fetch('/api/posts/upload', {
          method: 'POST',
          body: formData,
        })

        const uploadResponseData = await uploadResponse.json()

        if (!uploadResponse.ok) {
          throw new Error(uploadResponseData.error || '파일 업로드에 실패했습니다.')
        }

        finalImages = uploadResponseData.images
      } else if (isEditMode) {
        // 수정 모드이고 새 파일이 없으면 기존 이미지 사용
        finalImages = existingImages
      }

      setUploading(false)

      // 태그 문자열을 배열로 변환
      const tags = values.tags
        ? values.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : []

      if (isEditMode) {
        // 수정 모드: PUT 요청
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: values.title,
            subtitle: values.subtitle || null,
            images: finalImages,
            concept: values.concept || null,
            tool: values.tool || null,
            tags,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '게시물 수정에 실패했습니다.')
        }
      } else {
        // 생성 모드: POST 요청
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: values.title,
            subtitle: values.subtitle || null,
            categoryId,
            images: finalImages,
            concept: values.concept || null,
            tool: values.tool || null,
            tags,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '게시물 생성에 실패했습니다.')
        }
      }

      // 성공 시 폼 초기화
      form.reset()
      setSelectedFiles([])
      setExistingImages([])
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} post:`, error)
      alert(error.message || `게시물 ${isEditMode ? '수정' : '생성'}에 실패했습니다.`)
    } finally {
      setSubmitting(false)
      setUploading(false)
      isSubmittingRef.current = false // 제출 완료 후 플래그 리셋
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedFiles([])
    setExistingImages(originalImages) // 원본 이미지로 복원
    isSubmittingRef.current = false // 플래그 리셋
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '게시물 수정' : '게시물 추가'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? '게시물 정보를 수정합니다. 이미지를 변경하거나 정보를 업데이트할 수 있습니다.'
              : '새로운 게시물을 등록합니다. 이미지를 업로드하고 정보를 입력해주세요.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="게시물 제목을 입력하세요" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>부제목</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="부제목을 입력하세요" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CONCEPT</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="CONCEPT를 입력하세요"
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>TOOL</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="TOOL을 입력하세요" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 이미지 업로드 섹션 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                이미지 {!isEditMode && '*'}
              </label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading || submitting}
              />

              {/* 기존 이미지 목록 (수정 모드) */}
              {isEditMode && existingImages.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">기존 이미지:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {existingImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-square border rounded-md overflow-hidden bg-muted group"
                      >
                        <img
                          src={image.url.startsWith('http') && image.url.includes('backblazeb2.com')
                            ? `/api/posts/images?url=${encodeURIComponent(image.url)}`
                            : image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveExistingImage(index)}
                          disabled={uploading || submitting}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    이미지에 마우스를 올리면 삭제 버튼이 표시됩니다. 새 이미지를 선택하면 기존 이미지에 추가됩니다.
                  </p>
                </div>
              )}

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {isEditMode ? '새로 추가할 이미지:' : '선택된 이미지:'}
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                        disabled={uploading || submitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    저장 버튼을 클릭하면 파일이 자동으로 업로드됩니다.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting || uploading}
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
  )
}

