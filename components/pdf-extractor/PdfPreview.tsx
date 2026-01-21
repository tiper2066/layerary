'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface PdfPreviewProps {
  pdfUrl: string
  selectedPages: number[]
  onLoadSuccess: (data: { numPages: number }) => void
  onLoadError: (error: Error) => void
}

export function PdfPreview({ pdfUrl, selectedPages, onLoadSuccess, onLoadError }: PdfPreviewProps) {
  const [Document, setDocument] = useState<any>(null)
  const [Page, setPage] = useState<any>(null)
  const [pdfjs, setPdfjs] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // PDF.js worker 설정 및 react-pdf 로드 (클라이언트 사이드에서만)
  useEffect(() => {
    if (typeof window === 'undefined') return

    let mounted = true

    const loadReactPdf = async () => {
      try {
        // react-pdf를 dynamic import로 로드
        const reactPdf = await import('react-pdf')
        
        if (!mounted) return

        // PDF.js worker 설정
        reactPdf.pdfjs.GlobalWorkerOptions.workerSrc = '/js/pdf.worker.min.mjs'
        
        setDocument(() => reactPdf.Document)
        setPage(() => reactPdf.Page)
        setPdfjs(reactPdf.pdfjs)
        setIsReady(true)
        setError(null)
      } catch (err) {
        console.error('react-pdf 로드 오류:', err)
        if (mounted) {
          const error = err instanceof Error ? err : new Error('react-pdf를 로드할 수 없습니다.')
          setError(error)
          setIsReady(false)
          onLoadError(error)
        }
      }
    }

    loadReactPdf()

    return () => {
      mounted = false
    }
  }, [onLoadError])

  const handleDocumentLoadSuccess = useCallback((data: { numPages: number }) => {
    onLoadSuccess(data)
  }, [onLoadSuccess])

  const handleDocumentLoadError = useCallback((err: Error) => {
    console.error('PDF 문서 로드 오류:', err)
    onLoadError(err)
  }, [onLoadError])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-2">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-sm text-destructive text-center">
          PDF 미리보기를 불러올 수 없습니다.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          PDF 추출 기능은 정상적으로 작동합니다.
        </p>
      </div>
    )
  }

  if (!isReady || !Document || !Page) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Document
      file={pdfUrl}
      onLoadSuccess={handleDocumentLoadSuccess}
      onLoadError={handleDocumentLoadError}
      loading={
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
      error={
        <div className="flex items-center justify-center py-8 text-sm text-destructive">
          PDF 미리보기를 불러올 수 없습니다.
        </div>
      }
    >
      {selectedPages.map((pageNum) => (
        <div key={pageNum} className="space-y-2 p-2 border rounded-md">
          <p className="text-xs text-muted-foreground text-center">
            페이지 {pageNum}
          </p>
          <div className="flex justify-center">
            <Page
              pageNumber={pageNum}
              width={300}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="border rounded"
              loading={
                <div className="flex items-center justify-center py-8 w-[300px]">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              }
            />
          </div>
        </div>
      ))}
    </Document>
  )
}
