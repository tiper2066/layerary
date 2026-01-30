'use client'

import { useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Type, Image as ImageIcon, Upload, X, RotateCcw, Save, FolderOpen, Settings2, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { WelcomeBoardTemplate, UserEditData, TemplateConfig, SavedWelcomeBoardPreset } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardControlPanelProps {
  template: WelcomeBoardTemplate
  userEditData: UserEditData
  activeElementId: string | null
  onTextChange: (elementId: string, value: string) => void
  onLogoChange: (logoUrl: string | null) => void
  onElementSelect: (elementId: string | null) => void
  onReset: () => void
  // 프리셋 관련 props
  activePresetName: string | null
  currentTemplatePresets: SavedWelcomeBoardPreset[]
  activePresetId: string | null
  onSavePreset: () => void
  onLoadPreset: (preset: SavedWelcomeBoardPreset) => void
  onDeletePreset: (presetId: string, e: React.MouseEvent) => void
  onManagePresets: () => void
}

export function WelcomeBoardControlPanel({
  template,
  userEditData,
  activeElementId,
  onTextChange,
  onLogoChange,
  onElementSelect,
  onReset,
  activePresetName,
  currentTemplatePresets,
  activePresetId,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onManagePresets,
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
          toast.error('이미지 파일만 업로드 가능합니다.')
          return
        }

        // 파일 크기 검증 (최대 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('파일 크기는 5MB 이하여야 합니다.')
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
          toast.error('이미지 파일만 업로드 가능합니다.')
          return
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error('파일 크기는 5MB 이하여야 합니다.')
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
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-1">
            {/* 현재 활성 프리셋 이름 */}
            {activePresetName && (
              <span className="text-xs text-muted-foreground truncate max-w-[100px] mr-1">
                {activePresetName}
              </span>
            )}

            {/* 초기화 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onReset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>템플릿 기본값으로 초기화</p>
              </TooltipContent>
            </Tooltip>

            {/* 저장 버튼 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={onSavePreset}
                >
                  <Save className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>설정 저장</p>
              </TooltipContent>
            </Tooltip>

            {/* 불러오기 드롭다운 */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>저장된 설정 불러오기</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>저장된 설정</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentTemplatePresets.length === 0 ? (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    저장된 설정이 없습니다.
                  </div>
                ) : (
                  <>
                    {currentTemplatePresets.map((preset) => (
                      <DropdownMenuItem
                        key={preset.id}
                        className={`flex items-center justify-between cursor-pointer ${
                          activePresetId === preset.id ? 'bg-accent' : ''
                        }`}
                        onClick={() => onLoadPreset(preset)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {activePresetId === preset.id ? (
                            <Check className="h-4 w-4 text-primary flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-sm">{preset.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(preset.createdAt).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0"
                          onClick={(e) => onDeletePreset(preset.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="flex items-center gap-2 cursor-pointer text-primary"
                      onClick={onManagePresets}
                    >
                      <Settings2 className="h-4 w-4" />
                      <span>저장된 설정 관리</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
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
