'use client'

import { useEffect } from 'react'
import { PDFDocument } from 'pdf-lib'

interface PdfPageCounterProps {
  pdfFile: File
  onLoadSuccess: (data: { numPages: number }) => void
  onLoadError: (error: Error) => void
}

export function PdfPageCounter({ pdfFile, onLoadSuccess, onLoadError }: PdfPageCounterProps) {
  useEffect(() => {
    const loadPageCount = async () => {
      try {
        const arrayBuffer = await pdfFile.arrayBuffer()
        const pdf = await PDFDocument.load(arrayBuffer)
        onLoadSuccess({ numPages: pdf.getPageCount() })
      } catch (error) {
        console.error('PDF 페이지 수 로드 오류:', error)
        onLoadError(error instanceof Error ? error : new Error('PDF 로드 실패'))
      }
    }

    loadPageCount()
  }, [pdfFile, onLoadSuccess, onLoadError])

  return null // UI 렌더링 없음
}
