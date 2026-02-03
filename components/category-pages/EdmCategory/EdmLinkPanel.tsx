'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CellLinks } from '@/types/edm'

interface EdmLinkPanelProps {
  selectedCellId: string | null
  cellLinks: CellLinks
  onCellLinksChange: (links: CellLinks) => void
}

export function EdmLinkPanel({
  selectedCellId,
  cellLinks,
  onCellLinksChange,
}: EdmLinkPanelProps) {
  const [linkInput, setLinkInput] = useState('')

  // selectedCellId 변경 시에만 입력값 동기화 (cellLinks 포함 시 링크 추가 후 입력 초기화가 덮어써짐)
  useEffect(() => {
    setLinkInput(selectedCellId ? (cellLinks[selectedCellId] || '') : '')
  }, [selectedCellId]) // eslint-disable-line react-hooks/exhaustive-deps -- cellLinks 제외 의도적

  const handleAddLink = () => {
    if (!selectedCellId) return

    const url = linkInput.trim()
    if (!url) {
      toast.error('링크 주소를 입력해 주세요.')
      return
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('http:// 또는 https://로 시작하는 올바른 URL을 입력해 주세요.')
      return
    }

    onCellLinksChange({
      ...cellLinks,
      [selectedCellId]: url,
    })
    setLinkInput('')
  }

  const handleRemoveLink = (cellId: string) => {
    const next = { ...cellLinks }
    delete next[cellId]
    onCellLinksChange(next)
    if (cellId === selectedCellId) {
      setLinkInput('')
    }
  }

  const linkCount = Object.keys(cellLinks).length

  return (
    <div className="w-[350px] border-l flex flex-col bg-background">
      <div className="pl-4 pr-8 py-4 border-b">
        <h3 className="font-semibold mb-3">셀 링크 관리</h3>

        {!selectedCellId ? (
          <p className="text-sm text-muted-foreground">단일 셀을 선택하세요.</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>링크 적용 셀: {selectedCellId}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="링크 주소 (예: https://...)"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                />
                <Button size="sm" onClick={handleAddLink} className="gap-1 shrink-0">
                  {selectedCellId && cellLinks[selectedCellId] ? '링크 수정' : '링크 추가'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto pl-4 pr-8 py-4">
        <h4 className="text-sm font-medium mb-2">설정된 링크 목록 ({linkCount}개)</h4>
        {linkCount === 0 ? (
          <p className="text-sm text-muted-foreground">설정된 링크가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(cellLinks).map(([cellId, url]) => (
              <li
                key={cellId}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm"
              >
                <span className="font-medium shrink-0">셀: {cellId}</span>
                <span className="truncate flex-1" title={url}>
                  {url}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveLink(cellId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
