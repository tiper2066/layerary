'use client'

import { useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Type, Image as ImageIcon, RotateCcw, Upload, X } from 'lucide-react'
import type { WelcomeBoardTemplate, UserEditData, TemplateConfig } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardControlPanelProps {
  template: WelcomeBoardTemplate
  userEditData: UserEditData
  activeElementId: string | null
  onTextChange: (elementId: string, value: string) => void
  onLogoChange: (logoUrl: string | null) => void
  onElementSelect: (elementId: string | null) => void
  onReset: () => void
}

export function WelcomeBoardControlPanel({
  template,
  userEditData,
  activeElementId,
  onTextChange,
  onLogoChange,
  onElementSelect,
  onReset,
}: WelcomeBoardControlPanelProps) {
  const config = template.config as TemplateConfig
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 업로드 가능합니다.')
          return
        }

        // 파일 크기 검증 (최대 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('파일 크기는 5MB 이하여야 합니다.')
          return
        }

        // URL 생성
        const url = URL.createObjectURL(file)
        onLogoChange(url)
      }
    },
    [onLogoChange]
  )

  // 드래그 앤 드롭 핸들러
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const file = event.dataTransfer.files?.[0]
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 업로드 가능합니다.')
          return
        }

        if (file.size > 5 * 1024 * 1024) {
          alert('파일 크기는 5MB 이하여야 합니다.')
          return
        }

        const url = URL.createObjectURL(file)
        onLogoChange(url)
      }
    },
    [onLogoChange]
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  // 로고 제거 핸들러
  const handleRemoveLogo = useCallback(() => {
    if (userEditData.logoUrl) {
      URL.revokeObjectURL(userEditData.logoUrl)
    }
    onLogoChange(null)
  }, [userEditData.logoUrl, onLogoChange])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">편집 설정</h2>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          초기화
        </Button>
      </div>

      {/* 텍스트 편집 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Type className="h-4 w-4" />
          텍스트 편집
        </div>

        <div className="space-y-3">
          {config.textElements.map((element) => {
            const isEditable = element.editable ?? true
            return (
              <div key={element.id} className="space-y-1.5">
                <Label
                  htmlFor={`text-${element.id}`}
                  className={`text-sm ${
                    activeElementId === element.id
                      ? 'text-penta-blue font-medium'
                      : ''
                  } ${!isEditable ? 'text-muted-foreground' : ''}`}
                >
                  {element.label}
                  {!isEditable && (
                    <span className="ml-2 text-xs text-muted-foreground">(편집 불가)</span>
                  )}
                </Label>
                <Input
                  id={`text-${element.id}`}
                  value={userEditData.textValues[element.id] ?? element.defaultValue}
                  onChange={(e) => onTextChange(element.id, e.target.value)}
                  onFocus={() => onElementSelect(element.id)}
                  placeholder={element.defaultValue}
                  disabled={!isEditable}
                  className={
                    activeElementId === element.id
                      ? 'border-penta-blue ring-1 ring-penta-blue'
                      : ''
                  }
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* 로고 업로드 섹션 */}
      {config.logoArea && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            방문사 로고
          </div>

          {userEditData.logoUrl ? (
            <div className="relative">
              <div className="relative aspect-[2.5/1] bg-muted rounded-lg overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={userEditData.logoUrl}
                  alt="업로드된 로고"
                  className="w-full h-full object-contain p-4"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={handleRemoveLogo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                activeElementId === 'logo'
                  ? 'border-penta-blue bg-penta-blue/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onClick={() => {
                onElementSelect('logo')
                fileInputRef.current?.click()
              }}
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
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                클릭하거나 파일을 드래그하여 업로드
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, SVG (최대 5MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-xs text-muted-foreground">
          미리보기 영역의 텍스트나 로고 영역을 클릭하여 편집할 수 있습니다.
          편집이 완료되면 아래 내보내기 버튼을 사용하여 이미지 또는 PDF로 저장하세요.
        </p>
      </div>
    </div>
  )
}
