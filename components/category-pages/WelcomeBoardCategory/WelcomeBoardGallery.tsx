'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Layout, Pencil, Trash2 } from 'lucide-react'
import { WelcomeBoardCanvas } from './WelcomeBoardCanvas'
import type { WelcomeBoardTemplate, UserEditData } from '@/lib/welcomeboard-schemas'

interface WelcomeBoardGalleryProps {
  templates: WelcomeBoardTemplate[]
  loading: boolean
  isAdmin: boolean
  onSelectTemplate: (template: WelcomeBoardTemplate) => void
  onEditTemplate?: (template: WelcomeBoardTemplate) => void
  onDeleteTemplate?: (templateId: string) => void
}

export function WelcomeBoardGallery({
  templates,
  loading,
  isAdmin,
  onSelectTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: WelcomeBoardGalleryProps) {
  // 기본 userEditData (텍스트는 기본값 사용, 로고 없음)
  const defaultUserEditData: UserEditData = useMemo(() => ({
    textValues: {},
    logoUrl: null,
  }), [])

  if (loading) {
    return (
      <div className="flex flex-wrap gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-card border rounded-lg overflow-hidden w-[330px]"
          >
            <Skeleton className="w-full h-[186px]" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Layout className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-lg text-muted-foreground mb-2">
          등록된 웰컴보드 템플릿이 없습니다.
        </p>
        {isAdmin && (
          <p className="text-sm text-muted-foreground">
            상단의 &quot;템플릿 추가&quot; 버튼을 클릭하여 새 템플릿을 만들어보세요.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-6">
      {templates.map((template) => (
        <div
          key={template.id}
          className="group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer w-[330px] flex flex-col"
        >
          {/* 썸네일 - 템플릿 미리보기 (요소 포함) */}
          <div className="relative w-full h-[186px] bg-muted overflow-hidden">
            {template.backgroundUrl ? (
              <div className="pointer-events-none">
                <WelcomeBoardCanvas
                  template={template}
                  userEditData={defaultUserEditData}
                  scale={186 / template.height}
                  showEditHighlight={false}
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Layout className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}

            {/* 오버레이 - 선택 버튼 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 pointer-events-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onSelectTemplate(template)}
              >
                편집하기
              </Button>
            </div>
          </div>

          {/* 템플릿 정보 */}
          <div className="p-3">
            <h3 className="font-semibold truncate text-sm">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">
                {template.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {template.width} x {template.height}px
            </p>
          </div>

          {/* 관리자 액션 버튼 */}
          {isAdmin && (onEditTemplate || onDeleteTemplate) && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
              {onEditTemplate && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditTemplate(template)
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDeleteTemplate && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteTemplate(template.id)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
