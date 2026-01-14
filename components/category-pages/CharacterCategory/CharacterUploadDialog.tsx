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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X, File } from 'lucide-react'

const CHARACTER_TYPES = [
  '대표이사',
  '보안사업본부',
  '인증보안사업본부',
  '미래보안사업본부',
  '기획실',
  '품질관리실',
  '보안기술연구소',
  '인사부',
  '재경부',
] as const

const characterPostSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  type: z.enum(CHARACTER_TYPES, {
    required_error: '타입을 선택해주세요.',
  }),
})

type CharacterPostFormValues = z.infer<typeof characterPostSchema>

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
  images?: PostImage[] | null | any
  concept?: string | null // 캐릭터 타입
}

interface CharacterUploadDialogProps {
  open: boolean
  onClose: () => void
  categorySlug: string
  categoryId: string
  onSuccess: () => void
  postId?: string // 수정 모드일 때 게시물 ID
  post?: Post // 수정 모드일 때 게시물 데이터
}

export function CharacterUploadDialog({
  open,
  onClose,
  categorySlug,
  categoryId,
  onSuccess,
  postId,
  post,
}: CharacterUploadDialogProps) {
  const isEditMode = !!postId && !!post
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<PostImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isSubmittingRef = useRef(false) // 중복 제출 방지

  const form = useForm<CharacterPostFormValues>({
    resolver: zodResolver(characterPostSchema),
    defaultValues: {
      title: '',
      type: '대표이사',
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

      // 기존 Post의 concept 필드에서 타입 추출
      const existingType = post.concept && CHARACTER_TYPES.includes(post.concept as any)
        ? post.concept 
        : '대표이사' // 기본값
      
      form.reset({
        title: post.title || '',
        type: existingType as typeof CHARACTER_TYPES[number],
      })
    } else {
      form.reset({
        title: '',
        type: '대표이사',
      })
      setExistingImages([])
      setSelectedFiles([])
    }
  }, [isEditMode, post, form])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      // SVG 파일만 필터링
      const svgFiles = files.filter(
        (file) =>
          file.type === 'image/svg+xml' ||
          file.name.toLowerCase().endsWith('.svg')
      )

      if (svgFiles.length !== files.length) {
        alert('SVG 파일만 업로드할 수 있습니다.')
      }

      setSelectedFiles(svgFiles)
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: CharacterPostFormValues) => {
    // 중복 제출 방지
    if (isSubmittingRef.current) {
      console.warn('이미 제출 중입니다.')
      return
    }

    // 수정 모드가 아니고 새 파일이 없으면 에러
    if (!isEditMode && selectedFiles.length === 0) {
      alert('SVG 파일을 선택해주세요.')
      return
    }

    // 수정 모드인데 기존 이미지도 없고 새 파일도 없으면 에러
    if (isEditMode && existingImages.length === 0 && selectedFiles.length === 0) {
      alert('최소 1개의 SVG 파일이 필요합니다.')
      return
    }

    try {
      isSubmittingRef.current = true
      setSubmitting(true)
      setUploading(true)

      let finalImages: PostImage[] = []

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
        const uploadedImages: PostImage[] = []

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
          uploadedImages.push({
            url: presigned.fileUrl,
            name: presigned.originalName,
            order: i,
          })

          // 3. SVG 파일인 경우 썸네일 생성 요청 (서버에서 처리)
          try {
            const thumbnailResponse = await fetch('/api/posts/generate-thumbnail-svg', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                fileUrl: presigned.fileUrl,
                fileName: presigned.fileName,
              }),
            })

            if (thumbnailResponse.ok) {
              const { thumbnailUrl, blurDataURL } = await thumbnailResponse.json()
              uploadedImages[i].thumbnailUrl = thumbnailUrl
              uploadedImages[i].blurDataURL = blurDataURL
            } else {
              console.warn('Thumbnail generation failed for', file.name)
            }
          } catch (thumbnailError) {
            console.error('Thumbnail generation error:', thumbnailError)
            // 썸네일 생성 실패해도 계속 진행
          }
        }

        finalImages = uploadedImages
      } else if (isEditMode) {
        // 수정 모드이고 새 파일이 없으면 기존 이미지 사용
        finalImages = existingImages
      }

      setUploading(false)

      if (isEditMode) {
        // 수정 모드: PUT 요청
        const response = await fetch(`/api/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: values.title,
            categoryId: categoryId,
            images: finalImages,
            concept: values.type, // concept 필드에 타입 저장
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
            categoryId: categoryId,
            images: finalImages,
            concept: values.type, // concept 필드에 타입 저장
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
      setExistingImages([])
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
            {isEditMode ? '캐릭터 게시물 수정' : '캐릭터 게시물 추가'}
          </DialogTitle>
          <DialogDescription>
            SVG 포맷의 캐릭터 이미지를 업로드하세요.
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
                      {CHARACTER_TYPES.map((type) => (
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

            <div className="space-y-2">
              <label className="text-sm font-medium">SVG 파일</label>
              {!isEditMode && (
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    multiple={false}
                    onChange={handleFileSelect}
                    disabled={submitting || uploading}
                    className="hidden"
                    id="svg-file-input"
                  />
                  <label
                    htmlFor="svg-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <File className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      SVG 파일을 선택하세요
                    </span>
                  </label>
                </div>
              )}

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
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

              {/* 기존 이미지 목록 (수정 모드) */}
              {isEditMode && existingImages.length > 0 && (
                <div className="space-y-2">
                  {existingImages.map((image, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm">{image.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExistingImage(index)}
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
