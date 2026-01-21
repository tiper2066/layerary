'use client'

import { useState, useEffect, useCallback } from 'react'
import { PDFDocument } from 'pdf-lib'
import dynamic from 'next/dynamic'
import { Download, Loader2, CheckSquare, Square, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

// PdfPageCounter를 dynamic import로 로드 (SSR 비활성화)
const PdfPageCounter = dynamic(
  () => import('./PdfPageCounter').then((mod) => ({ default: mod.PdfPageCounter })),
  {
    ssr: false,
  }
)

interface PdfExtractorPanelProps {
  pdfFile: File | null
  numPages: number
  setNumPages: (numPages: number) => void
}

export function PdfExtractorPanel({ pdfFile, numPages, setNumPages }: PdfExtractorPanelProps) {
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [startPage, setStartPage] = useState<string>('')
  const [endPage, setEndPage] = useState<string>('')
  const [extracting, setExtracting] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // PDF 파일이 변경될 때 URL 생성
  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile)
      setPdfUrl(url)
      
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPdfUrl(null)
      setSelectedPages(new Set())
      setStartPage('')
      setEndPage('')
      setNumPages(0)
    }
  }, [pdfFile])

  // 범위 입력에서 체크박스 상태 업데이트
  useEffect(() => {
    // 범위 입력이 완전히 채워진 경우에만 체크박스 업데이트
    if (startPage && endPage && numPages > 0) {
      const start = parseInt(startPage)
      const end = parseInt(endPage)
      
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= numPages && start <= end) {
        const pages = new Set<number>()
        for (let i = start; i <= end; i++) {
          pages.add(i)
        }
        // 현재 선택된 페이지와 비교하여 다를 때만 업데이트 (순환 참조 방지)
        const currentPagesStr = Array.from(selectedPages).sort((a, b) => a - b).join(',')
        const newPagesStr = Array.from(pages).sort((a, b) => a - b).join(',')
        if (currentPagesStr !== newPagesStr) {
          setSelectedPages(pages)
        }
      }
    } else if (!startPage && !endPage && selectedPages.size > 0) {
      // 둘 다 비어있고 선택된 페이지가 있으면 선택 해제
      setSelectedPages(new Set())
    }
  }, [startPage, endPage, numPages]) // selectedPages를 의존성에서 제거

  // 체크박스에서 범위 입력 업데이트 (연속된 범위인 경우만)
  useEffect(() => {
    if (selectedPages.size === 0) {
      if (startPage !== '' || endPage !== '') {
        setStartPage('')
        setEndPage('')
      }
      return
    }

    const sortedPages = Array.from(selectedPages).sort((a, b) => a - b)
    
    // 연속된 범위인지 확인
    let isConsecutive = true
    for (let i = 1; i < sortedPages.length; i++) {
      if (sortedPages[i] !== sortedPages[i - 1] + 1) {
        isConsecutive = false
        break
      }
    }

    // 연속된 범위인 경우에만 범위 입력 필드 업데이트
    if (isConsecutive && sortedPages.length > 0) {
      const newStartPage = sortedPages[0].toString()
      const newEndPage = sortedPages[sortedPages.length - 1].toString()
      // 값이 실제로 변경될 때만 업데이트 (순환 참조 방지)
      if (startPage !== newStartPage || endPage !== newEndPage) {
        setStartPage(newStartPage)
        setEndPage(newEndPage)
      }
    }
  }, [selectedPages]) // startPage, endPage를 의존성에서 제거하여 순환 참조 방지

  const handlePageToggle = useCallback((pageNum: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev)
      if (next.has(pageNum)) {
        next.delete(pageNum)
      } else {
        next.add(pageNum)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (numPages > 0) {
      const allPages = new Set<number>()
      for (let i = 1; i <= numPages; i++) {
        allPages.add(i)
      }
      setSelectedPages(allPages)
      setStartPage('1')
      setEndPage(numPages.toString())
    }
  }, [numPages])

  const handleDeselectAll = useCallback(() => {
    setSelectedPages(new Set())
    setStartPage('')
    setEndPage('')
  }, [])

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
  }, [setNumPages])

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('PDF 로드 오류:', error)
    setLoading(false)
    // alert 제거 - 페이지 수 로드 실패는 조용히 처리
  }, [])

  // 미리보기용 PDF 생성
  const handlePreview = useCallback(async () => {
    if (!pdfFile || selectedPages.size === 0) {
      alert('추출할 페이지를 선택해주세요.')
      return
    }

    try {
      setPreviewLoading(true)
      setPreviewOpen(true)

      // PDF 파일 읽기
      const arrayBuffer = await pdfFile.arrayBuffer()
      const sourcePdf = await PDFDocument.load(arrayBuffer)

      // 새 PDF 문서 생성
      const newPdf = await PDFDocument.create()

      // 선택된 페이지들을 새 PDF에 복사
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b)
      const copiedPages = await newPdf.copyPages(sourcePdf, sortedPages.map(p => p - 1))

      // 각 페이지를 새 PDF에 추가
      copiedPages.forEach(page => {
        newPdf.addPage(page)
      })

      // PDF 저장
      const pdfBytes = await newPdf.save()

      // Blob URL 생성
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      setPreviewPdfUrl(url)
    } catch (error) {
      console.error('PDF 미리보기 생성 오류:', error)
      alert('PDF 미리보기를 생성하는데 실패했습니다.')
      setPreviewOpen(false)
    } finally {
      setPreviewLoading(false)
    }
  }, [pdfFile, selectedPages])

  // Dialog 닫을 때 URL 정리
  const handlePreviewClose = useCallback((open: boolean) => {
    setPreviewOpen(open)
    if (!open && previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl)
      setPreviewPdfUrl(null)
    }
  }, [previewPdfUrl])

  // PDF 파일 변경 시 로딩 상태 설정
  useEffect(() => {
    if (pdfFile && pdfUrl) {
      setLoading(true)
    }
  }, [pdfFile, pdfUrl])

  const handleExtract = useCallback(async () => {
    if (!pdfFile || selectedPages.size === 0) {
      alert('추출할 페이지를 선택해주세요.')
      return
    }

    try {
      setExtracting(true)

      // PDF 파일 읽기
      const arrayBuffer = await pdfFile.arrayBuffer()
      const sourcePdf = await PDFDocument.load(arrayBuffer)

      // 새 PDF 문서 생성
      const newPdf = await PDFDocument.create()

      // 선택된 페이지들을 새 PDF에 복사 (1-based index를 0-based로 변환)
      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b)
      const copiedPages = await newPdf.copyPages(sourcePdf, sortedPages.map(p => p - 1))

      // 각 페이지를 새 PDF에 추가
      copiedPages.forEach(page => {
        newPdf.addPage(page)
      })

      // PDF 저장
      const pdfBytes = await newPdf.save()

      // 파일명 생성
      const originalName = pdfFile.name.replace(/\.pdf$/i, '')
      let fileName = originalName

      if (sortedPages.length === 1) {
        fileName = `${originalName}_page_${sortedPages[0]}.pdf`
      } else {
        // 연속된 범위인지 확인
        let isConsecutive = true
        for (let i = 1; i < sortedPages.length; i++) {
          if (sortedPages[i] !== sortedPages[i - 1] + 1) {
            isConsecutive = false
            break
          }
        }

        if (isConsecutive) {
          fileName = `${originalName}_pages_${sortedPages[0]}-${sortedPages[sortedPages.length - 1]}.pdf`
        } else {
          fileName = `${originalName}_pages_${sortedPages.join(',')}.pdf`
        }
      }

      // 다운로드
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF 추출 오류:', error)
      alert('PDF 추출 중 오류가 발생했습니다.')
    } finally {
      setExtracting(false)
    }
  }, [pdfFile, selectedPages])

  if (!pdfFile) {
    return (
      <div className="w-[410px] h-full bg-background fixed right-0 top-0 bottom-0 flex items-center justify-center">
        <p className="text-muted-foreground">PDF 파일을 업로드하세요</p>
      </div>
    )
  }

  const sortedSelectedPages = Array.from(selectedPages).sort((a, b) => a - b)

  return (
    <div className="w-[410px] h-full bg-background fixed right-0 top-0 bottom-0 overflow-y-auto">
      <div className="px-8 pt-14 pb-8 space-y-6">
        {/* PDF 페이지 수 로드 (숨김) */}
        {pdfFile && (
          <div className="hidden">
            <PdfPageCounter
              pdfFile={pdfFile}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
            />
          </div>
        )}

        {/* 페이지 범위 설정 */}
        <div className="space-y-4 pb-6 border-b">
          {/* 파일 이름 표시 */}
          <div>
            <p className="text-xl font-bold">{pdfFile.name.split('.')[0]}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold">페이지 범위 선택</Label>
            <p className="text-xs text-muted-foreground mt-1">
              범위 입력 또는 체크박스로 페이지를 선택하세요
            </p>
          </div>

          {/* 범위 입력 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-page" className="text-xs">시작 페이지</Label>
              <Input
                id="start-page"
                type="number"
                min="1"
                max={numPages || undefined}
                step="1"
                value={startPage}
                onChange={(e) => setStartPage(e.target.value)}
                placeholder="1"
                disabled={numPages === 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-page" className="text-xs">끝 페이지</Label>
              <Input
                id="end-page"
                type="number"
                min="1"
                max={numPages || undefined}
                step="1"
                value={endPage}
                onChange={(e) => setEndPage(e.target.value)}
                placeholder={numPages > 0 ? numPages.toString() : "1"}
                disabled={numPages === 0}
              />
            </div>
          </div>

          {/* 전체 선택/해제 버튼 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex-1"
              disabled={numPages === 0}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              전체 선택
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="flex-1"
              disabled={numPages === 0}
            >
              <Square className="h-4 w-4 mr-2" />
              전체 해제
            </Button>
          </div>

          {/* 선택된 페이지 정보 */}
          {sortedSelectedPages.length > 0 && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">선택된 페이지:</p>
              <p className="text-sm font-medium">
                {sortedSelectedPages.length}개 페이지 ({sortedSelectedPages.join(', ')})
              </p>
            </div>
          )}
        </div>

        {/* 페이지 체크박스 그리드 */}
        {numPages > 0 && (
          <div className="space-y-3 pb-6 border-b">
            <Label className="text-sm font-semibold">페이지 목록</Label>
            <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
                <div key={pageNum} className="flex items-center space-x-2">
                  <Checkbox
                    id={`page-${pageNum}`}
                    checked={selectedPages.has(pageNum)}
                    onCheckedChange={() => handlePageToggle(pageNum)}
                  />
                  <Label
                    htmlFor={`page-${pageNum}`}
                    className="text-xs cursor-pointer flex-1"
                  >
                    {pageNum}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 버튼 영역 */}
        {/* <div className="pt-4 space-y-2"> */}
        <div className="pt-4 flex justify-between items-center gap-2">
          {/* 미리보기 버튼 */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePreview}
            disabled={selectedPages.size === 0 || previewLoading}
          >
            {previewLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                미리보기 생성 중...
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                미리보기
              </>
            )}
          </Button>

          {/* 다운로드 버튼 */}
          <Button
            className="w-full"
            onClick={handleExtract}
            disabled={selectedPages.size === 0 || extracting}
          >
            {extracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                추출 중...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                PDF 추출 및 다운로드
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PDF 미리보기 다이얼로그 */}
      <Dialog open={previewOpen} onOpenChange={handlePreviewClose}>
        <DialogContent className="flex flex-col gap-0 max-w-[95vw] max-h-[95vh] w-full h-full p-0">
          <DialogHeader className="px-6 py-6 flex-none">
            <DialogTitle>PDF 미리보기</DialogTitle>
            <DialogDescription className="sr-only">
              선택한 페이지로 추출된 PDF 파일을 미리보기합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 relative">
            {previewPdfUrl ? (
              <>
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">PDF 로딩 중...</span>
                    </div>
                  </div>
                )}
                <iframe
                  src={`${previewPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full min-h-[600px] border rounded"
                  title="PDF 미리보기"
                  onLoad={() => setPreviewLoading(false)}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                PDF 파일이 없습니다.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
