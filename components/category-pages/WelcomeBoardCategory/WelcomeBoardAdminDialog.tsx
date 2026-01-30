'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { WelcomeBoardElementEditor } from './WelcomeBoardElementEditor'
import type { WelcomeBoardTemplate, TemplateConfig, TextElement, LogoArea } from '@/lib/welcomeboard-schemas'
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardAdminDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  template?: WelcomeBoardTemplate | null
}

export function WelcomeBoardAdminDialog({
  open,
  onClose,
  onSuccess,
  template,
}: WelcomeBoardAdminDialogProps) {
  const isEditing = !!template

  // 폼 상태
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [width, setWidth] = useState(template?.width || 1920)
  const [height, setHeight] = useState(template?.height || 1080)
  const [backgroundUrl, setBackgroundUrl] = useState(template?.backgroundUrl || '')
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(
    template?.backgroundUrl || null
  )
  // 새로 추가: 업로드 전 파일 객체 저장 (지연 업로드용)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [config, setConfig] = useState<TemplateConfig>(
    (template?.config as TemplateConfig) || DEFAULT_TEMPLATE_CONFIG
  )
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // template prop이 변경될 때 state 동기화 (수정 모드)
  useEffect(() => {
    if (template && open) {
      setName(template.name || '')
      setDescription(template.description || '')
      setWidth(template.width || 1920)
      setHeight(template.height || 1080)
      setBackgroundUrl(template.backgroundUrl || '')
      setBackgroundPreview(template.backgroundUrl || null)
      setBackgroundFile(null) // 수정 모드에서는 기존 URL 사용
      setConfig((template.config as TemplateConfig) || DEFAULT_TEMPLATE_CONFIG)
    }
  }, [template, open])

  // 다이얼로그가 닫힐 때 blob URL 정리
  useEffect(() => {
    if (!open) {
      // blob URL 정리 (생성된 경우에만)
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview)
      }
      // 상태 초기화 (새 템플릿 생성 모드로 돌아갈 때)
      setName('')
      setDescription('')
      setWidth(1920)
      setHeight(1080)
      setBackgroundUrl('')
      setBackgroundPreview(null)
      setBackgroundFile(null)
      setConfig(DEFAULT_TEMPLATE_CONFIG)
    }
  }, [open, backgroundPreview])

  // Backblaze B2 URL인 경우 프록시를 통해 제공
  const getImageSrc = (url: string) => {
    if (!url) return ''
    if (url.startsWith('http') && url.includes('backblazeb2.com')) {
      return `/api/posts/images?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // 배경 이미지 선택 핸들러 (B2 업로드 없이 로컬 프리뷰만)
  const handleBackgroundSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다.')
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('파일 크기는 10MB 이하여야 합니다.')
        return
      }

      // 이전 blob URL 정리
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview)
      }

      // 로컬 미리보기 URL 생성 (B2 업로드 안함)
      const previewUrl = URL.createObjectURL(file)
      setBackgroundPreview(previewUrl)
      setBackgroundFile(file)
      // backgroundUrl은 아직 설정하지 않음 (제출 시 업로드 후 설정)
      setBackgroundUrl('')
    },
    [backgroundPreview]
  )

  // B2에 실제 업로드하는 함수 (제출 시 호출)
  const uploadBackgroundToB2 = useCallback(async (file: File): Promise<string> => {
    const safeFileName = `welcomeboard-bg-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')}`
    
    const presignedResponse = await fetch('/api/posts/upload-presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: [{
          name: safeFileName,
          type: file.type,
          size: file.size,
        }],
        categorySlug: 'welcomeboard',
      }),
    })

    if (!presignedResponse.ok) {
      const errorData = await presignedResponse.json().catch(() => ({}))
      throw new Error(errorData.error || '업로드 URL 생성에 실패했습니다.')
    }

    const { presignedUrls } = await presignedResponse.json()
    const { uploadUrl, authorizationToken, fileName, fileUrl } = presignedUrls[0]

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: file,
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'b2/x-auto',
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'X-Bz-Content-Sha1': 'do_not_verify',
      },
    })

    if (!uploadResponse.ok) {
      throw new Error('파일 업로드에 실패했습니다.')
    }

    return fileUrl
  }, [])

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        handleBackgroundSelect(file)
      }
    },
    [handleBackgroundSelect]
  )

  // 드래그 앤 드롭 핸들러
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const file = event.dataTransfer.files?.[0]
      if (file) {
        handleBackgroundSelect(file)
      }
    },
    [handleBackgroundSelect]
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  // 배경 이미지 제거
  const handleRemoveBackground = useCallback(() => {
    if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
      URL.revokeObjectURL(backgroundPreview)
    }
    setBackgroundPreview(null)
    setBackgroundUrl('')
    setBackgroundFile(null)
  }, [backgroundPreview])

  // config 변경 핸들러
  const handleConfigChange = useCallback((newConfig: TemplateConfig) => {
    setConfig(newConfig)
  }, [])

  // 텍스트 요소 추가
  const handleAddTextElement = useCallback(() => {
    const newElement: TextElement = {
      id: `text-${Date.now()}`,
      label: '새 텍스트',
      defaultValue: '텍스트를 입력하세요',
      x: 50,
      y: 50,
      width: 60,
      fontSize: 24,
      fontWeight: 'normal',
      color: '#333333',
      textAlign: 'center',
      verticalAlign: 'middle',
      editable: true,
    }
    setConfig((prev) => ({
      ...prev,
      textElements: [...prev.textElements, newElement],
    }))
  }, [])

  // 텍스트 요소 삭제
  const handleRemoveTextElement = useCallback((elementId: string) => {
    setConfig((prev) => ({
      ...prev,
      textElements: prev.textElements.filter((el) => el.id !== elementId),
    }))
  }, [])

  // 텍스트 요소 업데이트
  const handleUpdateTextElement = useCallback(
    (elementId: string, updates: Partial<TextElement>) => {
      setConfig((prev) => ({
        ...prev,
        textElements: prev.textElements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el
        ),
      }))
    },
    []
  )

  // 로고 영역 업데이트
  const handleUpdateLogoArea = useCallback((updates: Partial<LogoArea> | null) => {
    if (updates === null) {
      setConfig((prev) => ({
        ...prev,
        logoArea: undefined,
      }))
    } else {
      setConfig((prev) => ({
        ...prev,
        logoArea: prev.logoArea
          ? { ...prev.logoArea, ...updates }
          : {
              x: 50,
              y: 25,
              width: 200,
              height: 80,
              placeholder: '방문사 로고',
              ...updates,
            },
      }))
    }
  }, [])

  // 폼 제출
  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error('템플릿 이름을 입력해주세요.')
      return
    }

    // 새 파일이 선택되지 않았고 기존 URL도 없는 경우
    if (!backgroundFile && !backgroundUrl) {
      toast.error('배경 이미지를 업로드해주세요.')
      return
    }

    setSaving(true)

    try {
      let finalBackgroundUrl = backgroundUrl

      // 새 파일이 선택된 경우 B2에 업로드
      if (backgroundFile) {
        finalBackgroundUrl = await uploadBackgroundToB2(backgroundFile)
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        backgroundUrl: finalBackgroundUrl,
        thumbnailUrl: finalBackgroundUrl, // 배경 이미지를 썸네일로 사용
        width,
        height,
        config,
        status: 'PUBLISHED',
      }

      const url = isEditing
        ? `/api/welcomeboard-templates/${template.id}`
        : '/api/welcomeboard-templates'

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '저장에 실패했습니다.')
      }

      // 성공 시 blob URL 정리
      if (backgroundPreview && backgroundPreview.startsWith('blob:')) {
        URL.revokeObjectURL(backgroundPreview)
      }

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Save template error:', error)
      toast.error(error instanceof Error ? error.message : '템플릿 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [
    name,
    description,
    backgroundUrl,
    backgroundFile,
    backgroundPreview,
    width,
    height,
    config,
    isEditing,
    template,
    onSuccess,
    onClose,
    uploadBackgroundToB2,
  ])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-48px)] w-[calc(100vw-48px)] max-h-[calc(100vh-48px)] h-[calc(100vh-48px)] p-0 gap-0 rounded-lg overflow-hidden">
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* 헤더 */}
          <DialogHeader className="px-6 py-4 border-b flex-shrink-0 w-full">
            <DialogTitle>{isEditing ? '템플릿 수정' : '새 템플릿 만들기'}</DialogTitle>
            <DialogDescription>
              웰컴보드 템플릿의 기본 정보와 요소를 설정하세요.
            </DialogDescription>
          </DialogHeader>

          {/* 콘텐츠 영역 */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col w-full">
            {/* 상단: 기본 정보 영역 */}
            <div className="px-6 py-4 border-b bg-muted/30 flex-shrink-0 w-full overflow-x-auto">
              <div className="flex flex-wrap gap-4 justify-between items-end min-w-0">

                <div className="flex flex-wrap gap-4 items-center min-w-0">

                  {/* 템플릿 이름 */}
                  <div className="space-y-1 flex-shrink-0 w-48">
                    <Label htmlFor="name" className="text-xs">템플릿 이름 *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 기본 환영 템플릿"
                      className="h-9"
                    />
                  </div>

                  {/* 설명 */}
                  <div className="space-y-1 flex-shrink-0 w-56">
                    <Label htmlFor="description" className="text-xs">설명</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="템플릿에 대한 간단한 설명"
                      className="h-9"
                    />
                  </div>

                  {/* 크기 */}
                  <div className="flex gap-2 flex-shrink-0">
                    <div className="space-y-1 w-24">
                      <Label htmlFor="width" className="text-xs">너비 (px)</Label>
                      <Input
                        id="width"
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(Number(e.target.value))}
                        min={800}
                        max={4000}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1 w-24">
                      <Label htmlFor="height" className="text-xs">높이 (px)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(Number(e.target.value))}
                        min={600}
                        max={3000}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* 배경 이미지 업로드 */}
                  <div className="space-y-1">
                    <Label className="text-xs">배경 이미지 *</Label>
                    {backgroundPreview ? (
                      <div className="flex items-center gap-2">
                        <div className="relative h-9 w-16 bg-muted rounded overflow-hidden border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getImageSrc(backgroundPreview)}
                            alt="배경 미리보기"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9"
                          onClick={handleRemoveBackground}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 mr-1" />
                          제거
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="h-9 px-3 border-2 border-dashed rounded-md flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Upload className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="text-sm text-muted-foreground">클릭 또는 드래그</span>
                      </div>
                    )}
                  </div>

                </div>



                {/* 저장 버튼 */}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={onClose} disabled={saving} className="h-9">
                    취소
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving} className="h-9">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : isEditing ? (
                      '수정'
                    ) : (
                      '생성'
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 하단: 요소 편집 영역 (전체 높이 사용) */}
            <div className="flex-1 min-h-0 overflow-hidden w-full">
              <WelcomeBoardElementEditor
                config={config}
                width={width}
                height={height}
                backgroundUrl={backgroundPreview}
                onAddTextElement={handleAddTextElement}
                onRemoveTextElement={handleRemoveTextElement}
                onUpdateTextElement={handleUpdateTextElement}
                onUpdateLogoArea={handleUpdateLogoArea}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
