'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { PdfUploadZone } from '@/components/pdf-extractor/PdfUploadZone'
import { Loader2 } from 'lucide-react'

// PdfExtractorPanel을 dynamic import로 로드 (SSR 비활성화)
const PdfExtractorPanel = dynamic(
  () => import('@/components/pdf-extractor/PdfExtractorPanel').then((mod) => ({ default: mod.PdfExtractorPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="w-[410px] h-full bg-background fixed right-0 top-0 bottom-0 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

export default function PdfExtractorPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [numPages, setNumPages] = useState<number>(0)

  const handleFileSelect = (file: File) => {
    setPdfFile(file)
    setNumPages(0) // 새 파일 선택 시 페이지 수 리셋
  }

  const handleFileRemove = () => {
    setPdfFile(null)
    setNumPages(0)
  }

  return (
    <div className="w-full h-full flex absolute inset-0 bg-neutral-50 dark:bg-neutral-900">
      {/* 좌측: 파일 업로드 영역 */}
      <PdfUploadZone
        onFileSelect={handleFileSelect}
        selectedFile={pdfFile}
        onFileRemove={handleFileRemove}
      />

      {/* 우측: 속성 패널 */}
      <PdfExtractorPanel
        pdfFile={pdfFile}
        numPages={numPages}
        setNumPages={setNumPages}
      />
    </div>
  )
}
