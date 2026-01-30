'use client'

import { useState, useEffect } from 'react'
import { Loader2, FileArchive } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSession } from 'next-auth/react'
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider'

interface ZipInfo {
  url: string
  fileName: string
  fileSize: number
}

interface PptZipSectionProps {
  categorySlug: string
}

export function PptZipSection({ categorySlug }: PptZipSectionProps) {
  const { data: session } = useSession()
  const { confirm } = useConfirmDialog()
  const isAdmin = session?.user?.role === 'ADMIN'
  const [zipInfo, setZipInfo] = useState<ZipInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // ZIP 파일 정보 가져오기
  useEffect(() => {
    const fetchZipInfo = async () => {
      try {
        const response = await fetch(`/api/categories/${categorySlug}/zip`)
        if (response.ok) {
          const data = await response.json()
          setZipInfo(data.zipInfo)
        }
      } catch (error) {
        console.error('Failed to fetch ZIP info:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchZipInfo()
  }, [categorySlug])

  // ZIP 파일 업로드
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ZIP 파일 검증
    const isZipFile =
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed' ||
      file.name.toLowerCase().endsWith('.zip')

    if (!isZipFile) {
      toast.error('ZIP 파일만 업로드할 수 있습니다.')
      return
    }

    // 파일 크기 검증 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('파일 크기는 100MB를 초과할 수 없습니다.')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/categories/${categorySlug}/zip`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '업로드에 실패했습니다.')
      }

      const data = await response.json()
      setZipInfo(data.zipInfo)
      toast.success('ZIP 파일이 업로드되었습니다.')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
      // input 초기화
      e.target.value = ''
    }
  }

  // ZIP 파일 삭제
  const handleDelete = async () => {
    if (!(await confirm('ZIP 파일을 삭제하시겠습니까?'))) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/categories/${categorySlug}/zip`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '삭제에 실패했습니다.')
      }

      setZipInfo(null)
      toast.success('ZIP 파일이 삭제되었습니다.')
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  // ZIP 파일 다운로드
  const handleDownload = async () => {
    if (!zipInfo) return

    try {
      setDownloading(true)
      const response = await fetch(`/api/posts/files?url=${encodeURIComponent(zipInfo.url)}`)
      if (!response.ok) {
        throw new Error('다운로드에 실패했습니다.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = zipInfo.fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Download error:', error)
      toast.error('다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg bg-card flex justify-start items-center gap-2">
      <div className="flex items-center gap-2">
        <FileArchive className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Pretendard 폰트 : </h3>
      </div>

      {zipInfo ? (
        <div className="flex flex-1 justify-between items-center gap-2">
          <div className="text-sm flex items-center gap-2">
            <p className="font-medium">{zipInfo.fileName}</p>
            <p className="text-muted-foreground">{formatFileSize(zipInfo.fileSize)}</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  다운로드 중...
                </>
              ) : (
                <>
                  다운로드
                </>
              )}
            </Button>

            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    삭제
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 justify-between items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? 'ZIP 파일이 없습니다. 파일을 업로드해주세요.'
              : 'ZIP 파일이 없습니다.'}
          </p>

          {isAdmin && (
            <div>
              <input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="zip-file-input"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => document.getElementById('zip-file-input')?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    ZIP 파일 업로드
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
