'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import type { Alignment } from '@/types/edm'
import { EdmPreviewDialog } from './EdmPreviewDialog'

interface EdmCodePanelProps {
  htmlCode: string
  alignment: Alignment
  onAlignmentChange: (alignment: Alignment) => void
  cellImages: Record<string, string>
  cellLinks: Record<string, string>
  /** 저장 후 + 수정 없을 때만 true. false면 Code 복사/미리보기 비활성, 코드 숨김 */
  canGenerateCode: boolean
  /** 저장 후 + 수정 없을 때만 true. false면 미리보기 버튼 비활성 */
  canPreview: boolean
  /** 저장된 eDM이 있으나 미저장 변경이 있을 때 true → "코드가 변경되었으니..." 메시지 */
  hasUnsavedCodeChanges: boolean
  /** Code 복사 클릭 시: 코드 복사 */
  onCodeGenerate?: () => Promise<void>
}

export function EdmCodePanel({
  htmlCode,
  alignment,
  onAlignmentChange,
  cellImages,
  cellLinks,
  canGenerateCode,
  canPreview,
  hasUnsavedCodeChanges,
  onCodeGenerate,
}: EdmCodePanelProps) {
  const { theme, setTheme } = useTheme()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const handleCodeGenerate = async () => {
    if (!onCodeGenerate || !canGenerateCode) return
    try {
      setGenerating(true)
      await onCodeGenerate()
    } finally {
      setGenerating(false)
    }
  }

  const isDark = theme === 'dark'

  return (
    <div className="border-t flex flex-col h-[350px] max-h-[400px]">
      <div className="flex items-center justify-between px-8 py-3 shrink-0">
        <h3 className="font-semibold">자동 생성 HTML 코드</h3>
        <div className="flex items-center gap-2">
          <Select value={alignment} onValueChange={(v) => onAlignmentChange(v as Alignment)}>
            <SelectTrigger className="w-36 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">좌측(기본)</SelectItem>
              <SelectItem value="center">중앙</SelectItem>
              <SelectItem value="right">우측</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="default"
            size="sm"
            onClick={handleCodeGenerate}
            disabled={!canGenerateCode}
            className="gap-2"
          >
            {generating ? '복사 중...' : 'Code 복사'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            disabled={!canPreview}
            className="gap-2"
          >
            미리보기
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 pt-0 pb-4 min-h-[150px]">
        {!canGenerateCode ? (
          <div
            className={`flex items-center justify-center min-h-[120px] rounded-md px-4 py-6 ${
              isDark ? 'bg-amber-950/30 text-amber-200' : 'bg-amber-50 text-amber-900'
            }`}
          >
            <p className="text-sm font-medium text-center">
              {hasUnsavedCodeChanges
                ? '코드가 변경되었으니, 저장 후 Code 복사 및 미리보기 버튼이 활성화됩니다.'
                : '먼저 저장해 주세요. 저장 후 Code 복사 및 미리보기 버튼이 활성화됩니다.'}
            </p>
          </div>
        ) : (
          <pre
            className={`text-xs font-mono overflow-x-auto p-4 rounded-md ${
              isDark ? 'bg-zinc-900 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
            }`}
          >
            <code>{htmlCode || 'Code 복사 버튼을 클릭하여 HTML 코드를 복사하세요.'}</code>
          </pre>
        )}
      </div>

      <EdmPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        htmlCode={htmlCode}
        cellImages={cellImages}
        cellLinks={cellLinks}
      />
    </div>
  )
}
