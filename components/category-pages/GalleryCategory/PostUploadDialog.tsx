'use client'

import { useState } from 'react'
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

interface PostUploadDialogProps {
  open: boolean
  onClose: () => void
  categorySlug: string
  categoryId: string
  onSuccess: () => void
}

export function PostUploadDialog({
  open,
  onClose,
  categorySlug,
  categoryId,
  onSuccess,
}: PostUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files))
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (values: PostFormValues) => {
    if (selectedFiles.length === 0) {
      alert('최소 1개의 이미지를 선택해주세요.')
      return
    }

    try {
      setSubmitting(true)
      setUploading(true)

      // 선택된 파일들을 한 번에 업로드
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

      const uploadedImages = uploadResponseData.images
      setUploading(false)

      // 태그 문자열을 배열로 변환
      const tags = values.tags
        ? values.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : []

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: values.title,
          subtitle: values.subtitle || null,
          categoryId,
          images: uploadedImages,
          concept: values.concept || null,
          tool: values.tool || null,
          tags,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '게시물 생성에 실패했습니다.')
      }

      // 성공 시 폼 초기화
      form.reset()
      setSelectedFiles([])
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating post:', error)
      alert(error.message || '게시물 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedFiles([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>게시물 추가</DialogTitle>
          <DialogDescription>
            새로운 게시물을 등록합니다. 이미지를 업로드하고 정보를 입력해주세요.
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
              <label className="text-sm font-medium">이미지 *</label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading || submitting}
              />

              {/* 선택된 파일 목록 */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
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

