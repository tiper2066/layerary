'use client'

import { useCallback, useState } from 'react'
import { File, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface PdfUploadZoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onFileRemove: () => void
}

export function PdfUploadZone({ onFileSelect, selectedFile, onFileRemove }: PdfUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))

    if (pdfFile) {
      onFileSelect(pdfFile)
    } else {
      toast.error('PDF 파일만 업로드할 수 있습니다.')
    }
  }, [onFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileSelect(file)
      } else {
        toast.error('PDF 파일만 업로드할 수 있습니다.')
      }
    }
    // Reset input to allow selecting the same file again
    e.target.value = ''
  }, [onFileSelect])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="flex-1 pr-[410px] overflow-y-auto">
      <div className="px-8 pt-16 pb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">PDF Extractor</h1>
          <p className="text-muted-foreground mt-2">
            PDF 파일을 업로드하고 원하는 페이지 범위를 선택하여 추출하세요.
          </p>
        </div>

        <Card
          className={`
            border-2 border-dashed rounded-lg p-12 transition-colors
            ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            {selectedFile ? (
              <>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg w-full max-w-md">
                  <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onFileRemove}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  우측 패널에서 페이지를 선택하고 추출하세요.
                </p>
              </>
            ) : (
              <>
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium">
                    PDF 파일을 드래그하여 놓거나 클릭하여 선택하세요
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF 파일만 업로드할 수 있습니다
                  </p>
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="pdf-file-input"
                />
                <label htmlFor="pdf-file-input">
                  <Button type="button" variant="outline" asChild className='hover:cursor-pointer'>
                    <span>PDF 파일 선택</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
