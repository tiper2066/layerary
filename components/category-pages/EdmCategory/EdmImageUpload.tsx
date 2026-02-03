'use client'

import { useCallback, useState } from 'react'
import { Upload, FileImage } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { validateEdmFileName } from '@/lib/edm-utils'

interface EdmImageUploadProps {
  onImageSelect: (file: File) => void
  disabled?: boolean
}

export function EdmImageUpload({ onImageSelect, disabled }: EdmImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateAndAccept = useCallback(
    (file: File) => {
      setError(null)

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!validTypes.includes(file.type)) {
        setError('JPG, PNG, GIF 파일만 지원합니다.')
        return
      }

      if (!validateEdmFileName(file.name)) {
        setError(
          '파일명은 영문, 숫자, 언더스코어(_), 하이픈(-)만 사용해 주세요. 이미지 링크 경로로 사용됩니다.'
        )
        return
      }

      onImageSelect(file)
    },
    [onImageSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return

      const file = e.dataTransfer.files[0]
      if (file) validateAndAccept(file)
    },
    [disabled, validateAndAccept]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validateAndAccept(file)
      e.target.value = ''
    },
    [validateAndAccept]
  )

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] p-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          w-full max-w-lg border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
        `}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-2">
          이미지를 여기에 드래그하거나 버튼을 클릭하여 업로드하세요.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          업로드할 이미지 파일명은 추후 이미지 링크 경로로 사용되기에 반드시 영문, 숫자, 그리고
          특수기호는 언더바와 밑줄(_, -)만 사용해 주세요.
        </p>

        <input
          type="file"
          id="edm-image-input"
          accept=".jpg,.jpeg,.png,.gif"
          className="hidden"
          onChange={handleFileInput}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="default"
          onClick={() => document.getElementById('edm-image-input')?.click()}
          disabled={disabled}
          className="gap-2"
        >
          <FileImage className="h-4 w-4" />
          이미지 선택
        </Button>

        <p className="text-xs text-muted-foreground mt-4">JPG, PNG, GIF 파일을 지원합니다.</p>

        {error && (
          <p className="text-sm text-destructive mt-4" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
