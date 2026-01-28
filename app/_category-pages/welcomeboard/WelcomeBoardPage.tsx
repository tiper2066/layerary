'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { WelcomeBoardGallery } from '@/components/category-pages/WelcomeBoardCategory/WelcomeBoardGallery'
import { WelcomeBoardEditor } from '@/components/category-pages/WelcomeBoardCategory/WelcomeBoardEditor'
import { WelcomeBoardAdminDialog } from '@/components/category-pages/WelcomeBoardCategory/WelcomeBoardAdminDialog'
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
import type { WelcomeBoardTemplate } from '@/lib/welcomeboard-schemas'
import { presetStorageUtils } from '@/lib/welcomeboard-schemas'

interface Category {
  id: string
  name: string
  slug: string
  type: string
  pageType?: string | null
}

interface WelcomeBoardPageProps {
  category: Category
}

type ViewMode = 'gallery' | 'editor'

export function WelcomeBoardPage({ category }: WelcomeBoardPageProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = session?.user?.role === 'ADMIN'

  // 상태
  const [viewMode, setViewMode] = useState<ViewMode>('gallery')
  const [templates, setTemplates] = useState<WelcomeBoardTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<WelcomeBoardTemplate | null>(null)
  
  // 다이얼로그 상태
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WelcomeBoardTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 템플릿 목록 조회
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/welcomeboard-templates?status=PUBLISHED')
      
      if (!response.ok) {
        throw new Error('템플릿 목록을 불러오는데 실패했습니다.')
      }

      const data = await response.json()
      setTemplates(data.templates)
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // 템플릿 로드 후 자동 정리 (삭제된 템플릿의 프리셋 제거)
  useEffect(() => {
    if (templates.length > 0) {
      const existingTemplateIds = templates.map(t => t.id)
      const removedCount = presetStorageUtils.cleanupOrphanedPresets(existingTemplateIds)
      
      if (removedCount > 0) {
        console.log(`${removedCount}개의 오래된 프리셋이 자동 정리되었습니다.`)
      }
    }
  }, [templates])

  // templateId 파라미터 감지하여 템플릿 자동 선택
  useEffect(() => {
    const templateIdParam = searchParams.get('templateId')
    if (templateIdParam && templates.length > 0) {
      const template = templates.find((t) => t.id === templateIdParam)
      if (template) {
        setSelectedTemplate(template)
        setViewMode('editor')
        // URL에서 templateId 파라미터 제거
        router.replace(`/${category.slug}`, { scroll: false })
      }
    }
  }, [searchParams, templates, category.slug, router])

  // 템플릿 선택 핸들러
  const handleSelectTemplate = useCallback((template: WelcomeBoardTemplate) => {
    setSelectedTemplate(template)
    setViewMode('editor')
  }, [])

  // 갤러리로 돌아가기
  const handleBackToGallery = useCallback(() => {
    setSelectedTemplate(null)
    setViewMode('gallery')
  }, [])

  // 템플릿 편집 다이얼로그 열기
  const handleEditTemplate = useCallback((template: WelcomeBoardTemplate) => {
    setEditingTemplate(template)
    setAdminDialogOpen(true)
  }, [])

  // 템플릿 삭제 확인
  const handleDeleteClick = useCallback((templateId: string) => {
    setDeletingTemplateId(templateId)
    setDeleteDialogOpen(true)
  }, [])

  // 템플릿 삭제 실행
  const handleConfirmDelete = useCallback(async () => {
    if (!deletingTemplateId) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/welcomeboard-templates/${deletingTemplateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('템플릿 삭제에 실패했습니다.')
      }

      // 목록에서 제거
      setTemplates((prev) => prev.filter((t) => t.id !== deletingTemplateId))
      setDeleteDialogOpen(false)
      setDeletingTemplateId(null)
    } catch (error) {
      console.error('Delete error:', error)
      alert('템플릿 삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }, [deletingTemplateId])

  // 다이얼로그 닫기
  const handleCloseAdminDialog = useCallback(() => {
    setAdminDialogOpen(false)
    setEditingTemplate(null)
  }, [])

  // 저장 성공 핸들러
  const handleSaveSuccess = useCallback(() => {
    fetchTemplates()
    handleCloseAdminDialog()
  }, [fetchTemplates, handleCloseAdminDialog])

  // 에디터 모드일 때
  if (viewMode === 'editor' && selectedTemplate) {
    return (
      <WelcomeBoardEditor
        template={selectedTemplate}
        onBack={handleBackToGallery}
      />
    )
  }

  // 갤러리 모드
  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <div className="px-8 pb-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{category.name}</h1>
            <p className="text-muted-foreground mt-2">
              템플릿을 선택하여 웰컴보드를 제작하세요. 텍스트와 로고를 편집하고 이미지 또는 PDF로 내보낼 수 있습니다.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setAdminDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              템플릿 추가
            </Button>
          )}
        </div>

        {/* 템플릿 갤러리 */}
        <WelcomeBoardGallery
          templates={templates}
          loading={loading}
          isAdmin={isAdmin}
          onSelectTemplate={handleSelectTemplate}
          onEditTemplate={isAdmin ? handleEditTemplate : undefined}
          onDeleteTemplate={isAdmin ? handleDeleteClick : undefined}
        />
      </div>

      {/* 관리자 다이얼로그 */}
      {isAdmin && (
        <WelcomeBoardAdminDialog
          open={adminDialogOpen}
          onClose={handleCloseAdminDialog}
          onSuccess={handleSaveSuccess}
          template={editingTemplate}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  삭제 중...
                </>
              ) : (
                '삭제'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
